# portal-backend

Backend Node.js/Express que atua como intermediário entre um modelo semântico do
Power BI (Premium, alimentado por um ERP em SQL Server via *Import* com refresh
agendado) e o frontend do site. O site nunca fala diretamente com o Power BI
ou com o ERP — apenas com esta API.

```
ERP (SQL Server) → Views → Gateway on-premises → Power BI (Import)
                                                         │
                                                         ▼
                                          portal-backend (este projeto)
                                                         │
                                                         ▼
                                                  Frontend do site
```

## Como funciona

1. **Autenticação** ([src/auth.js](src/auth.js)): obtém um token do Azure AD
   (Entra ID) via *Client Credentials Flow* usando um Service Principal, e
   mantém o token em cache até ~1 minuto antes de expirar.
2. **Consulta ao Power BI** ([src/powerbi.js](src/powerbi.js)): monta queries
   DAX e as envia para o endpoint REST `executeQueries` do dataset
   configurado, convertendo as linhas retornadas (formato `Tabela[Coluna]`)
   para JSON "limpo".
3. **Cache de resultados** ([src/cache.js](src/cache.js)): cada rota mantém
   seu próprio cache com TTL configurável, evitando bater no Power BI a cada
   requisição do site.
4. **Rotas REST** ([src/routes/](src/routes/)): expõem `/api/estoque`,
   `/api/estoque/:produtoId` e `/api/vendas` para o frontend consumir.

## Rodando localmente

### Opção 1 — sem credenciais reais (modo mock)

Como ainda não há um modelo semântico publicado, o backend pode rodar com
dados fictícios (ver seção "Dados de referência" abaixo), sem precisar de um
App Registration no Azure nem de um workspace/dataset reais:

```bash
npm install
cp .env.example .env
# no .env, defina apenas:
#   MOCK_MODE=true
#   PORT=3000
npm run dev
```

Com `MOCK_MODE=true`, `TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET`, `GROUP_ID` e
`DATASET_ID` deixam de ser obrigatórios — nenhuma chamada real ao Azure AD ou
ao Power BI é feita.

### Opção 2 — com o Power BI real

```bash
npm install
cp .env.example .env
# preencha TENANT_ID, CLIENT_ID, CLIENT_SECRET, GROUP_ID, DATASET_ID
npm start
```

A aplicação valida as variáveis obrigatórias no boot e falha rápido (com uma
mensagem clara) se alguma estiver faltando.

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

## Dados de referência (modo mock)

Usados em [src/mockData.js](src/mockData.js) para simular o modelo semântico
enquanto ele não está publicado:

**Produtos** (dimensão): Parafuso M6 (Ferragem), Chapa Aço 2mm (Metalurgia),
Tinta Epóxi 5L (Pintura).

**Estoque** (fato): quantidade disponível por produto/depósito.

**Vendas** (fato): vendas por produto, com quantidade, valor total e data.

Medidas DAX equivalentes no modelo real:

```dax
Estoque Total = SUM(Estoque[QuantidadeDisponivel])
Vendas Total (R$) = SUM(Vendas[ValorTotal])
Vendas Qtd = SUM(Vendas[Quantidade])
```

## Endpoints

### `GET /api/estoque`

Estoque agregado por produto/depósito.

```json
[
  { "produto": "Parafuso M6", "categoria": "Ferragem", "deposito": "CD-SP", "quantidade": 15000 }
]
```

### `GET /api/estoque/:produtoId`

Mesmo formato, filtrado por produto. Retorna `400` se `produtoId` não for um
inteiro.

### `GET /api/vendas?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD`

Vendas agregadas por produto no período. Retorna `400` se as datas estiverem
ausentes, com formato inválido, ou se `dataInicio` for posterior a `dataFim`.

```json
[
  { "produto": "Tinta Epóxi 5L", "categoria": "Pintura", "valorTotal": 420, "quantidade": 2 }
]
```

## Estratégia de cache

Duas camadas, com interfaces independentes:

- **Token Azure AD** ([src/auth.js](src/auth.js)): reaproveitado até
  ~1 minuto antes de expirar (baseado no `expires_in` retornado pelo AD).
- **Resultados das queries DAX** ([src/cache.js](src/cache.js)): TTL
  configurável via `CACHE_TTL_SECONDS`, com chave por endpoint + parâmetros
  (`estoque-geral`, `estoque-3`, `vendas-2026-06-01_2026-06-30`).

TTLs recomendados, de acordo com a frequência de refresh do Power BI:

| Dado | Refresh no Power BI | TTL sugerido | Implementação |
|---|---|---|---|
| Estoque | a cada 1h | 10–15 min | `CACHE_TTL_SECONDS` (padrão 600s = 10 min) |
| Vendas | 2x/dia | 1–2h | `CACHE_TTL_SECONDS × 6` (padrão 3600s = 1h) |

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

- `CLIENT_SECRET` e o token de acesso nunca são logados nem incluídos em
  respostas de erro.
- Erros da API do Power BI são logados no servidor com detalhe; o frontend
  recebe apenas uma mensagem genérica (`{ "error": "..." }"`).
- `429` (throttling) da API do Power BI é tratado com a estratégia
  stale-while-revalidate descrita acima.

## Tratamento de erros

| Situação | Comportamento |
|---|---|
| Token do Azure AD expirado/inválido (401) | Renovado automaticamente, 1 nova tentativa |
| Power BI API fora do ar / timeout | `503` com mensagem amigável |
| Power BI API com throttling (429) | Retorna valor stale do cache se existir; senão `503` |
| Query DAX mal formada / erro inesperado da API | Log completo no servidor, `500` genérico ao cliente |
| Parâmetro inválido do usuário (ex: data malformada) | `400` com mensagem específica |

## Próximos passos (fora do escopo atual)

- Migrar o cache de `node-cache` para Redis, se o backend passar a rodar em
  múltiplas instâncias/containers (a interface em `cache.js` já foi desenhada
  para isso).
- Endpoint de health check (`/health`).
- Testes automatizados (unitários para `auth.js`/`cache.js`, integração para
  as rotas com mock da API do Power BI).
- Documentação OpenAPI/Swagger.
- Alternativa via XMLA Endpoint (Premium) se os volumes ultrapassarem os
  limites do `executeQueries` (~100k linhas / 1GB por chamada).
