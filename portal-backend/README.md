# portal-backend

Backend Node.js/Express que atua como intermediário entre um modelo semântico do
Power BI (Premium, alimentado por um ERP em SQL Server via *Import* com refresh
agendado) e o frontend do site. O site nunca fala diretamente com o Power BI
ou com o ERP — apenas com esta API, autenticado por API key.

O modelo semântico expõe lançamentos contábeis (tabela `LANCAMENTOS`), e a API
atende **múltiplos clientes/empresas** ao mesmo tempo: cada API key só enxerga
os dados das empresas autorizadas para ela.

```
ERP (SQL Server) → Views → Gateway on-premises → Power BI (Import)
                                                         │
                                                         ▼
                                          portal-backend (este projeto)
                                                         │
                                                         ▼
                                    Frontend do site (por cliente, via API key)
```

## Como funciona

1. **Autenticação com o Power BI** ([src/auth.js](src/auth.js)): obtém um token
   do Azure AD (Entra ID) via *Client Credentials Flow* usando um Service
   Principal, mantido em cache até ~1 minuto antes de expirar.
2. **Autenticação multi-tenant do frontend** ([src/apiKeyAuth.js](src/apiKeyAuth.js),
   [src/clients.js](src/clients.js)): cada requisição precisa do header
   `X-API-KEY`, que é resolvido para um cliente e a lista de `EMPRESA`
   autorizadas para ele — nenhuma rota pode retornar dados de uma empresa fora
   dessa lista.
3. **Consulta ao Power BI** ([src/powerbi.js](src/powerbi.js)): monta queries
   DAX (com medidas definidas inline via `DEFINE MEASURE`, sem precisar alterar
   o modelo publicado) e as envia para o endpoint REST `executeQueries` do
   dataset configurado, convertendo as linhas retornadas (formato
   `Tabela[Coluna]`) para JSON "limpo".
4. **Cache de resultados** ([src/cache.js](src/cache.js)): cada rota mantém
   seu próprio cache com TTL configurável, com chave por empresas + período +
   filtros, evitando bater no Power BI a cada requisição do site e evitando
   vazamento de cache entre clientes diferentes.
5. **Rota REST** ([src/routes/contabil.js](src/routes/contabil.js)): expõe
   `/api/contabil/balancete` e `/api/contabil/balancete/:conta` para o
   frontend consumir.

## Rodando localmente

### Opção 1 — sem credenciais reais (modo mock)

```bash
npm install
cp .env.example .env
cp clients.example.json clients.json
# no .env, defina apenas:
#   MOCK_MODE=true
#   PORT=3000
npm run dev
```

Com `MOCK_MODE=true`, `TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET`, `GROUP_ID` e
`DATASET_ID` deixam de ser obrigatórios — os dados vêm de
[src/mockData.js](src/mockData.js) em vez do Power BI real. `clients.json`
continua sendo necessário (é a lista de API keys/empresas autorizadas).

### Opção 2 — com o Power BI real

```bash
npm install
cp .env.example .env
cp clients.example.json clients.json
# preencha TENANT_ID, CLIENT_ID, CLIENT_SECRET, GROUP_ID, DATASET_ID no .env
# preencha clients.json com as API keys e empresas reais de cada cliente
npm start
```

A aplicação valida as variáveis obrigatórias e o `clients.json` no boot e falha
rápido (com uma mensagem clara) se algo estiver faltando ou malformado.

## Configurando o Service Principal no Azure

1. **App Registration**: no Azure Portal, crie um *App registration* em
   Entra ID. Anote o *Application (client) ID* e o *Directory (tenant) ID* —
   viram `CLIENT_ID` e `TENANT_ID`.
2. **Client secret**: em *Certificates & secrets*, crie um novo *client
   secret* e copie o valor imediatamente (não fica visível depois) — vira
   `CLIENT_SECRET`.
3. **Permissão no tenant do Power BI**: no *Power BI Admin Portal* →
   *Tenant settings* → *Developer settings*, habilite "Allow service
   principals to use Power BI APIs" para o grupo de segurança que contém o
   Service Principal.
4. **Acesso ao workspace**: adicione o Service Principal (pelo nome do App
   Registration) como membro (no mínimo *Viewer*, mas com permissão de
   *Build* sobre o dataset) do workspace Premium que contém o modelo
   semântico.
5. **IDs do Power BI**: `GROUP_ID` é o ID do workspace e `DATASET_ID` é o ID
   do dataset — ambos aparecem na URL do Power BI Service ao abrir o
   workspace/dataset (`app.powerbi.com/groups/<GROUP_ID>/datasets/<DATASET_ID>`).

## Modelo semântico (tabela `LANCAMENTOS`)

| Coluna | Uso |
|---|---|
| `CONTA` | código da conta contábil |
| `DESCRICAO_CONTA` | descrição da conta |
| `CENTRO_CUSTO` | código do centro de custo (numérico) |
| `DESCRICAO_CC` | descrição do centro de custo |
| `EMPRESA` | empresa/filial — chave de isolamento multi-tenant |
| `NATUREZA` | `"D"` (débito) ou `"C"` (crédito) |
| `VALOR` | valor do lançamento |
| `PERIODO` | período contábil, formato `"MM/YYYY"` (ex: `"07/2026"`) |

Não é necessário criar medidas no modelo: `powerbi.js` define `Total Debito`,
`Total Credito` e `Saldo` diretamente na query DAX via `DEFINE MEASURE`.

> **Atenção**: `Saldo` é calculado como `Total Debito − Total Credito`
> (convenção contábil padrão). Dependendo de como o plano de contas classifica
> natureza devedora/credora por tipo de conta, o sinal pode precisar ser
> invertido para contas de receita/passivo — valide comparando com um
> relatório real do Power BI antes de usar em produção.

## Multi-tenant (`clients.json`)

Arquivo (não commitado — copie de `clients.example.json`) com a lista de
clientes e suas empresas autorizadas:

```json
[
  { "apiKey": "chave-aleatoria-longa-do-cliente", "cliente": "Grupo Econômico X", "empresas": ["001", "002"] }
]
```

- O frontend de cada cliente deve enviar o header `X-API-KEY` com a chave
  correspondente em toda requisição.
- Sem `?empresa=` na query, a resposta é consolidada para **todas** as
  empresas autorizadas daquela API key (útil para grupos econômicos com mais
  de uma empresa).
- Com `?empresa=X`, a resposta é restrita a essa empresa — mas só se `X`
  estiver na lista autorizada da API key (senão `403`).
- Gere `apiKey` com algo como `openssl rand -hex 32` — nunca reutilize chaves
  entre clientes diferentes.

## Endpoints

### `GET /api/contabil/balancete?periodoInicio=YYYY-MM&periodoFim=YYYY-MM&empresa=&centroCusto=`

Balancete agregado por empresa/conta no período. `periodoInicio`/`periodoFim`
são obrigatórios; `empresa` e `centroCusto` são opcionais.

```json
[
  { "empresa": "001", "conta": "3.1.01.001", "descricaoConta": "Receita de Vendas", "debito": 1250, "credito": 45000, "saldo": -43750 }
]
```

### `GET /api/contabil/balancete/:conta?periodoInicio=&periodoFim=&empresa=&centroCusto=`

Mesmo formato, filtrado por uma conta específica.

### `GET /health`

Health check simples (`{ "status": "ok" }`), sem exigir API key — usado pelo
Nginx/monitoramento.

Erros de validação retornam `400` (período ausente/inválido, `centroCusto` não
numérico) ou `403` (empresa fora da lista autorizada), com mensagem
específica do que está errado.

## Estratégia de cache

Duas camadas, com interfaces independentes:

- **Token Azure AD** ([src/auth.js](src/auth.js)): reaproveitado até
  ~1 minuto antes de expirar (baseado no `expires_in` retornado pelo AD).
- **Resultados das queries DAX** ([src/cache.js](src/cache.js)): TTL
  configurável via `CACHE_TTL_SECONDS`, com chave por empresas autorizadas +
  período + conta/centro de custo (nunca compartilhada entre clientes
  diferentes).

Lançamentos contábeis costumam mudar com bem menos frequência que dados
operacionais — recomendação de `CACHE_TTL_SECONDS` entre `1800` (30 min) e
`3600` (1h) em produção, ajustável conforme a frequência real de refresh do
dataset no Power BI.

O cache é abstraído em [src/cache.js](src/cache.js) por uma factory
(`createCache`) com interface `get` / `set` / `getStale` / `withCache`.
Hoje é implementada com `node-cache` (em memória); para trocar por Redis no
futuro (necessário se o backend passar a rodar em múltiplas instâncias),
basta reimplementar `createCache` com a mesma interface — nenhuma rota
precisa mudar.

### Stale-while-revalidate

Cada cache mantém, além do valor "fresco" (TTL curto), uma cópia de longa
duração do mesmo valor. Se a busca por dados novos falhar (ex: `429` de
throttling do Power BI, ou instabilidade momentânea) e já não houver valor
fresco em cache, a resposta cai para essa cópia "stale" em vez de quebrar —
a resposta HTTP inclui o header `X-Cache-Stale: true` nesse caso.

## Segurança

- `CLIENT_SECRET`, o token de acesso ao Power BI e as `apiKey` dos clientes
  nunca são logados nem incluídos em respostas de erro.
- Erros da API do Power BI são logados no servidor com detalhe; o frontend
  recebe apenas uma mensagem genérica (`{ "error": "..." }`).
- `429` (throttling) da API do Power BI é tratado com a estratégia
  stale-while-revalidate descrita acima.
- Valores de `conta`/`centroCusto` vindos de query params são escapados
  ([src/utils.js](src/utils.js), `escapeDaxString`) antes de entrar na query
  DAX, para evitar DAX injection.
- Toda rota contábil exige `X-API-KEY` válido e nunca retorna dados de uma
  `EMPRESA` fora da lista autorizada para a chave usada.

## Tratamento de erros

| Situação | Comportamento |
|---|---|
| Token do Azure AD expirado/inválido (401) | Renovado automaticamente, 1 nova tentativa |
| Power BI API fora do ar / timeout | `503` com mensagem amigável |
| Power BI API com throttling (429) | Retorna valor stale do cache se existir; senão `503` |
| Query DAX mal formada / erro inesperado da API | Log completo no servidor, `500` genérico ao cliente |
| Parâmetro inválido do usuário (ex: período malformado) | `400` com mensagem específica |
| API key ausente/inválida | `401` |
| Empresa fora da lista autorizada da API key | `403` |

## Deploy no Hostinger (VPS + PM2 + Nginx)

1. **No VPS**, clone o repositório e instale as dependências de produção:

   ```bash
   git clone <url-do-repo>
   cd financialreports/portal-backend
   npm ci --omit=dev
   cp .env.example .env      # preencha com as credenciais reais
   cp clients.example.json clients.json   # preencha com as API keys reais
   ```

2. **PM2** (mantém o processo rodando e reinicia sozinho):

   ```bash
   npm install -g pm2
   pm2 start deploy/ecosystem.config.js
   pm2 save
   pm2 startup      # siga a instrução impressa para o PM2 iniciar no boot do VPS
   ```

3. **Nginx** como reverse proxy do domínio para a porta 3000 (só o Nginx fica
   exposto publicamente): use [deploy/nginx.conf.example](deploy/nginx.conf.example)
   como base, ajuste o domínio e rode `certbot --nginx` para emitir o
   certificado HTTPS via Let's Encrypt.

4. **Firewall**: libere apenas `80`/`443` publicamente (`ufw allow 80,443/tcp`);
   a porta `3000` do Node não precisa (e não deve) ficar acessível de fora do
   próprio servidor.

5. **Atualizações**: `git pull`, `npm ci --omit=dev`, `pm2 reload portal-backend`.

## Próximos passos (fora do escopo atual)

- Migrar o cache de `node-cache` para Redis, se o backend passar a rodar em
  múltiplas instâncias/containers (a interface em `cache.js` já foi desenhada
  para isso).
- Testes automatizados (unitários para `auth.js`/`cache.js`/`apiKeyAuth.js`,
  integração para as rotas com mock da API do Power BI).
- Documentação OpenAPI/Swagger.
- Endpoint de lançamentos detalhados (extrato linha a linha), hoje fora de
  escopo — o modelo já tem `HISTORICO_PADRAO` e `REVENDA` disponíveis para
  isso quando for necessário.
- Alternativa via XMLA Endpoint (Premium) se os volumes ultrapassarem os
  limites do `executeQueries` (~100k linhas / 1GB por chamada).
