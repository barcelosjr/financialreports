# Plano — Tornar o portal financeiro real, por fases (backend em PHP na Hostinger)

## Context

Hoje o projeto tem duas metades que quase não se conversam:

- **`portal-frontend`** — SPA React 19 (Vite + Tailwind + Recharts) com **todos os
  dados mockados**. Não há uma única chamada `fetch`; a autenticação é falsa
  (`login()` só seta um booleano) e todo o estado (grupos, empresas, usuários,
  plano de contas) vive em `useState` nos contextos — some a cada reload. As
  telas, porém, estão completas e bem organizadas.
- **`portal-backend`** — API **Node/Express** real (proxy do Power BI, CRUD de
  estrutura/classificações/contas, auth por `X-API-KEY`, cache, testes Jest),
  persistindo em arquivos JSON.

**Decisões confirmadas com o usuário que definem este plano:**
1. Hospedagem = **Hostinger Premium Web Hosting** (compartilhada) para o domínio
   **`financialreports.com.br`** — 2 GB RAM, 20 GB disco. É **PHP + MySQL**, com
   LiteSpeed/`.htaccess`; **não roda Node.js** como serviço persistente.
2. Por isso o usuário optou por **reescrever o backend em PHP** (roda nativo no
   Premium, sem host externo, sem custo extra), usando o **MySQL** já incluído no
   plano. **O `portal-backend` Node deixa de ser deployado e passa a ser a
   ESPECIFICAÇÃO executável** de onde portar (rotas, shapes, DAX, validações,
   cache, testes). **Não apagar** o Node até o PHP passar nos mesmos testes.
3. Começar pela fatia de menor risco (**Plano de Contas**); auth v1 = **login +
   usuários criados pelo admin** (sem cadastro público/e-mail agora).
4. **A execução será feita pelo Claude Sonnet 5** → Fases 0–1 abaixo estão em modo
   "receita" (arquivos, shapes, pseudocódigo, _gotchas_).

> **Regra de ouro para o executor:** o front chama a mesma API de sempre; o PHP
> deve **espelhar exatamente o contrato do backend Node** (mesmos caminhos,
> mesmos códigos de status, corpo de erro `{ "error": "..." }`). E **não mudar os
> nomes nem os retornos das funções públicas dos contextos do frontend** — só
> trocar a fonte de dados por trás, atrás de um flag.

O que muda em relação ao Node: a **linguagem/persistência do backend** (PHP+MySQL)
e o **deploy** (tudo na Hostinger, mesma origem). O que **não** muda: a estratégia
por fases, as 4 "costuras" do frontend, e o `api.js`/flags.

---

## Estado atual (pós Fase 0 + 1 — 18/07/2026)

**Fases 0 e 1 concluídas e validadas ponta a ponta** (UI + MySQL real), pelo
Sonnet 5. O backend PHP (`portal-backend-php/`) espelha fielmente o Node; **76
testes PHPUnit verdes** (portados do Jest). Ambiente de dev local documentado em
memória (PHP 8.3 portátil, MySQL 8.4 noinstall, `php -S 127.0.0.1:8000`,
`phpunit.phar` — **sem Composer**).

**O que já existe (muda as próximas fases):**
- Rotas de estrutura/classificações/contas idênticas ao Node (`src/routes.php`),
  com `Estruturas`/`Classificacoes`/`ApiKeyAuth`/`Utils`/`MockData`.
- **Plumbing de Power BI/Azure/cache JÁ PRONTO** (bônus p/ Fase 3):
  `PowerBI::executeDaxQuery` (cURL + retry 401 + 429/timeout), `Auth::getAccessToken`
  (token Azure cacheado), `Cache` (MySQL TTL com `ON DUPLICATE KEY`). Só falta
  `queryBalancete` + motor de cálculo.
- Front: `data/api.js` + `data/flags.js`; `EstruturaContext.jsx` em **modo duplo**
  (flag `VITE_USE_BACKEND_ESTRUTURA`), leituras síncronas preservadas, adaptador
  tag↔regra — **é o template a copiar** para Tenant/Sessão na Fase 2.
- Padrões PHP estabelecidos: front controller (`public/index.php` remove o prefixo
  `/api`), `Router` (casa `:param`), `Http` (query/body/header/sendJson/sendError),
  `Db` (PDO singleton), classes de domínio estáticas, migrations numeradas,
  `config.php` fora do git.

**Higiene antes de seguir (recomendado):**
- **Commitar** o trabalho — hoje está tudo *uncommitted* (novo `portal-backend-php/`,
  `PLANO.md`, `api.js`, `flags.js`, `.env.example`; modificados `EstruturaContext.jsx`,
  `vite.config.js`). Fazer numa branch, não direto na `main`.
- **Remover** os arquivos de debug soltos em `portal-backend-php/`: `err.txt`,
  `err2.txt`, `out.txt`, `out2.txt` (e ignorar `*.txt`/`*.tmp` no `.gitignore`).
- Conferir que `.env.local` (tem `VITE_API_KEY`) fica fora do git (`*.local` já
  ignora) e que `.env.example` entra no commit.

**Ainda NÃO validado — o deploy real na Hostinger.** Todo o teste até aqui foi
local. O ambiente Premium (mod_rewrite/`.htaccess`, versão do PHP no hPanel, MySQL
via hPanel, headers `X-API-KEY`/`Authorization` chegando ao PHP, cURL de saída p/
Azure) segue não provado.

**➡️ Próximo passo (decidido pelo usuário): smoke deploy na Hostinger, antes da
Fase 2.** É um passo **colaborativo** — o Sonnet 5 é headless (sem GUI nem acesso
ao hPanel), então ele prepara os artefatos + o guia, e **o usuário** faz as ações
no painel. Antes, a **higiene**: commitar a Fase 0+1 numa branch e remover os
`err/out*.txt`.

1. **Sonnet 5 prepara:** SPA mínima (ou o `npm run build`) que chame `/api/health`
   e mostre o resultado + `.htaccess` de fallback SPA; a pasta `api/` (conteúdo de
   `public/`) + `.htaccess` + `config.php` preenchível; o SQL das migrations
   (`001`+`002`); e um passo a passo do hPanel.
2. **Usuário (hPanel):** criar banco MySQL + usuário (anotar credenciais), rodar as
   migrations no phpMyAdmin, escolher PHP 8.x, subir os arquivos (File Manager/FTP/
   Git) para `public_html/` e `public_html/api/`, pôr o `config.php` **fora** do
   web root, ativar SSL.
3. **Validar:** `https://financialreports.com.br/api/health` → `{"status":"ok"}`;
   depois criar/ler um nó de estrutura pela API e conferir no phpMyAdmin.
4. **Gotchas a confirmar:** `.htaccess`/mod_rewrite ativo, header `X-API-KEY`
   chegando ao PHP, e (só ao testar Power BI, Fase 3) cURL de saída liberado.

---

## Diagnóstico: as 4 "costuras" de integração (frontend)

Trocamos a fonte de dados em **4 pontos** e as páginas nem percebem:

| Costura (arquivo) | O que abastece | Backend PHP a construir |
|---|---|---|
| `src/context/SessaoContext.jsx` | login, usuário logado, tema | auth (JWT) + usuários |
| `src/context/TenantContext.jsx` | grupos econômicos, empresas, escopo | tenancy + CRUD |
| `src/context/EstruturaContext.jsx` | plano de contas: estrutura + tags + importar contas | **primeiro alvo** (portar estrutura/classificações/contas) |
| `src/data/financeiro.js` | DRE, Balanço, Fluxo **e todas as análises** | motor de cálculo (mais pesado) |

Descoberta central: **`indicadores.js`, `risco.js`, `previsao.js` e `orcamento.js`
derivam 100% de `calcularDRE`/`calcularBalanco`/`calcularFluxoCaixa` de
`financeiro.js`.** Quando essas três devolverem dados reais, as 4 telas de Análise
+ o Dashboard ficam reais **sem tocar em nenhum componente**. É a costura mais
valiosa — e a mais difícil (Fase 3).

**Sobre "página por página" (sua pergunta):** concordo com o incremental, mas
**por domínio/costura**, não por página solta — `Dashboard`/`DRE`/`Indicadores`/
`Risco` compartilham a **mesma** fonte (`financeiro.js`); ligar uma de cada vez
seria reescrever a mesma integração N vezes. Cada costura entra atrás de um flag
`VITE_USE_BACKEND_*` para **mock e real coexistirem** — se algo falhar, desliga o
flag e volta ao mock na hora.

---

## Arquitetura alvo

1. **Backend PHP** (`portal-backend-php/`, novo) — PHP 8.x + **PDO/MySQL**, com um
   **front controller** único (`public/index.php`) roteando as rotas; sem
   framework pesado (roteador enxuto próprio, ou Slim vendored). Dependências
   mínimas: `firebase/php-jwt` (Fase 2, vendorada), senha com `password_hash`/
   `password_verify` nativos. **Espelha rota a rota o `portal-backend` Node.**
2. **Mesma origem, sem CORS** — na Hostinger, front e API ficam no **mesmo
   domínio**: SPA em `public_html/` e a API em `public_html/api/` (front controller
   PHP). O front chama `/api/...` relativo → **não há CORS em produção**.
3. **Banco = MySQL** (incluído no Premium; conexão local via PDO, sem "Remote
   MySQL"/whitelist). Substitui os arquivos JSON do Node. *(Resolve a antiga
   dúvida SQLite×MySQL: aqui MySQL é o certo — é o que o plano oferece e fica no
   mesmo host.)*
4. **Sem processo persistente** — em shared hosting cada request PHP é isolado.
   Logo, **token do Azure e cache de DAX precisam ser persistidos** (tabela MySQL
   `cache(chave, valor, expira_em)` ou arquivos), não em memória de processo. Um
   **cron** do hPanel pode aquecer o cache se necessário.
5. **Cliente HTTP no frontend** (`src/data/api.js`) — igual ao que seria com Node:
   base `import.meta.env.VITE_API_URL ?? ''` (vazio = mesma origem `/api`), header
   de auth (`X-API-KEY` na Fase 1 → `Authorization: Bearer <jwt>` na Fase 2),
   corpo de erro lido de `{ error }`.
6. **Segredos** (credenciais Azure, `JWT_SECRET`, credenciais MySQL) num
   `config.php` **fora do web root** (ex.: `~/domains/financialreports.com.br/app/`),
   nunca em `public_html/` nem no git.

---

## Fases

### Fase 0 — Esqueleto PHP + pipeline na Hostinger (prova de canalização)

**Objetivo:** provar, ponta a ponta, PHP+MySQL+deploy na Hostinger e o cliente
HTTP do front — antes de qualquer regra de negócio. Flags do front começam `false`.

1. **Esqueleto** `portal-backend-php/`: front controller `public/index.php` +
   `public/.htaccess` (reescreve tudo para `index.php`), `src/Router.php`,
   `src/Db.php` (PDO singleton), `config.php.example`, `composer.json`. Primeira
   rota: `GET /api/health` → `{ "status": "ok" }` (sem auth, igual ao Node).
2. **MySQL** — criar o banco no hPanel (phpMyAdmin); guardar credenciais no
   `config.php` (fora do web root). `migrations/001_init.sql` cria a tabela
   `cache`. `Db.php` conecta via PDO em `localhost`.
3. **Cliente HTTP no front** — `portal-frontend/src/data/api.js` com
   `apiGet/apiPost/apiPut/apiDelete(path, { params, body })` (monta querystring,
   JSON in/out, no erro lê `{ error }` e lança `Error`). `.env.example` (commit) e
   `.env.local` (ignorado por `*.local`) com `VITE_API_URL=`, `VITE_API_KEY=<dev>`
   e os flags `VITE_USE_BACKEND_ESTRUTURA/_TENANT/_SESSAO/_FINANCEIRO=false`.
4. **Dev local** — rodar o PHP com o servidor embutido:
   `php -S localhost:8000 -t portal-backend-php/public`. Em
   `portal-frontend/vite.config.js` (hoje sem `server`) adicionar
   `server.proxy['/api'] = { target: 'http://localhost:8000', changeOrigin: true }`
   → o front chama `/api/...` e o Vite encaminha ao PHP (sem CORS em dev também).
5. **Deploy inicial na Hostinger** (ver seção Deploy): subir um `index.html`
   mínimo + o `api/` com `/health`, e confirmar `https://financialreports.com.br/api/health`.

### Fase 1 — Plano de Contas (primeira fatia real: portar estrutura/contas p/ PHP + ligar o front)

**Duas metades:** (A) portar para PHP+MySQL os endpoints que o Node já tem para
estrutura/classificações/contas; (B) ligar `EstruturaContext.jsx` a eles atrás de
`VITE_USE_BACKEND_ESTRUTURA`. Consumidores no front: só `pages/admin/PlanoContas.jsx`
e `pages/admin/AbaContas.jsx` (não devem precisar mudar).

**(A) Backend PHP — portar do Node, mesmo contrato.** Referências a espelhar:
`portal-backend/src/routes/{estrutura,contas}.js`, `src/estruturas.js`,
`src/classificacoes.js`, `src/powerbi.js` (só `queryContasUnicas` nesta fase),
`src/apiKeyAuth.js`, `src/mockData.js`.

- **Auth Fase 1:** middleware `X-API-KEY` → resolve para uma lista de `empresas`
  autorizadas (portar `apiKeyAuth.js`; guardar as chaves numa tabela ou no
  `config.php`). 401 sem chave / inválida; 403 empresa fora da lista.
- **MySQL (migrations):**
  - `estruturas(id CHAR(36) PK, empresa, relatorio, nome, parent_id NULL, ordem INT, sinal CHAR(1))`
  - `classificacoes(id CHAR(36) PK, empresa, conta, natureza CHAR(1) NULL, centro_custo VARCHAR NULL)`
    + `classificacao_tags(regra_id CHAR(36) FK, relatorio, node_id CHAR(36))`
  - Campo a campo, seguir os shapes do Node (`estruturas.js`/`classificacoes.js`).
- **Endpoints (idênticos ao Node):**

| Método | Rota | Corpo/params | Resposta |
|---|---|---|---|
| GET | `/api/contabil/estrutura` | `empresa`,`relatorio` | `[{id,nome,parentId,ordem,sinal}]` |
| POST | `/api/contabil/estrutura` | `empresa`,`relatorio` + `{nome,parentId,sinal}` | nó (201) |
| PUT | `/api/contabil/estrutura/:id` | `empresa`,`relatorio` + `{nome?,sinal?}` | nó |
| POST | `/api/contabil/estrutura/:id/mover` | `empresa`,`relatorio` + `{direcao}` | irmãos |
| DELETE | `/api/contabil/estrutura/:id` | `empresa`,`relatorio` | `{idsRemovidos:[...]}` |
| GET | `/api/contabil/contas` | `empresa` | `[{conta,descricaoConta,regras:[{id,natureza,centroCusto,tags:[{relatorio,nodeId}]}]}]` |
| POST/PUT/DELETE | `/api/contabil/contas/:conta/regras[/:id]` | `empresa` + `{natureza,centroCusto,tags}` | regra / `{ok:true}` |
| POST | `/api/contabil/contas/copiar` | `{empresaOrigem,empresaDestino}` | `{empresa,contasCopiadas}` |

- **`GET /contas` (importar contas)** precisa das contas únicas dos lançamentos.
  Portar `queryContasUnicas` (DAX via cURL ao Power BI) **com um `MOCK_MODE`**
  (flag no `config.php`) que devolve as fixtures de `mockData.js` — assim dá pra
  desenvolver/validar sem credencial Azure. Na Fase 1, MOCK_MODE=on.
- **UUIDs** dos nós/regras: gerar no PHP (ex.: `ramsey/uuid` vendorado, ou um
  helper `random_bytes`→v4). O front trata `id` como opaco.

**(B) Frontend — ligar `EstruturaContext.jsx`, mantendo LEITURAS síncronas.**
As telas leem via `obterNosEstrutura`/`obterTagsConta`/`obterImportacaoContas`,
que retornam valor na hora — **não** transformar em `async`. Em vez disso:
- O contexto mantém seus **caches em `useState`** (`estruturas`, `regrasPorConta`,
  `contasPorEmpresa`); as leituras leem do cache.
- Flag **ligado**: efeito **carrega** do backend sob demanda (ao trocar empresa/
  relatório); cada mutação **chama a API e depois refaz o `GET`** do pedaço
  afetado (refetch = caminho mais simples e sem bug; otimista é melhoria opcional).
- Flag **desligado**: mock atual intacto.

- **`empresaId → codigo`:** o cache é chaveado pelo id sintético (`kobe-comercio`),
  mas a API usa o **código** (`001`). No contexto,
  `import { empresaPorId } from '../data/empresas'` → `empresaPorId(empresaId)?.codigo`.
  *(Gotcha: `EstruturaProvider` fica ACIMA de `TenantProvider` — sem `useTenant()`
  aqui. Ler do dado estático resolve na Fase 1; na Fase 2 troca pela lista de
  grupos viva.)*

- **Adaptador tag ↔ regra (única parte não-óbvia).** O front tem tags planas
  `{relatorio,nodeId,centroCusto,natureza}`; o backend agrupa em regras. Guardar as
  **regras cruas** por conta e derivar as tags planas na leitura:
```
obterTagsConta(conta): regrasPorConta[conta].flatMap((r) =>
   r.tags.map((t) => ({ relatorio:t.relatorio, nodeId:t.nodeId,
                        centroCusto:r.centroCusto, natureza:r.natureza, _regraId:r.id })))

adicionarTagConta(conta, {relatorio,nodeId,centroCusto,natureza}):   // já normalizados no front
   r = regra com mesmo (natureza, centroCusto)
   se r existe:  PUT  /regras/:r.id  body {natureza,centroCusto,tags:[...r.tags,{relatorio,nodeId}]}
   senão:        POST /regras        body {natureza,centroCusto,tags:[{relatorio,nodeId}]}
   → refetch GET /contas?empresa e repopular

removerTagConta(conta, i):   // i = índice na lista PLANA acima
   alvo = flatten()[i]; r = regra alvo._regraId
   se r.tags.length === 1: DELETE /regras/:r.id
   senão:                  PUT /regras/:r.id  body {..r, tags: r.tags sem (relatorio,nodeId)}
   → refetch e repopular
```

- **Mantido no cliente nesta fase** (sem endpoint novo): **contas manuais**
  (`adicionarContaManual`/`removerContaManual`) persistidas com
  `usePersistedState('fr-contas-manuais-<empresaId>', [])` e mescladas com as
  importadas em `obterImportacaoContas`; **`importadoEm`** setado no cliente
  quando o `GET /contas` der certo; **estrutura-padrão** (`estruturaPadrao.js`)
  **não** semeada no cliente com o flag ligado (o backend é a fonte e começa
  vazio — a UI já trata "Nenhum grupo criado ainda").

**Resultado:** Plano de Contas 100% real e persistente (PHP+MySQL na Hostinger),
com toda a canalização validada — o trilho para as próximas fases.

### Fase 2 — Auth + Usuários + Tenancy (a fundação, em PHP)

Seguir os **padrões já estabelecidos** na Fase 1 (migrations numeradas, classes de
domínio estáticas, middleware no estilo `ApiKeyAuth::require` que devolve `null` +
escreve o erro, rotas em `src/routes.php`).

- **Backend PHP** (`portal-backend-php/`):
  - Migration `003_auth.sql`: `grupos`, `empresas`, `usuarios`, `permissoes`
    (empresa/relatório por usuário), `pbi_credenciais` (credencial Power BI por
    grupo — hoje global em `config['AZURE']`). Migrar `config['CLIENTS']` (API key
    → empresas) para `grupos`/`empresas`.
  - Senha: `password_hash`/`password_verify` **nativos** (sem dependência).
  - JWT: **`src/Jwt.php` self-contained (HS256 via `hash_hmac`)**, no mesmo
    espírito de `Uuid.php` — mantém o projeto **sem Composer**, como está hoje
    (evitar `firebase/php-jwt`, que puxaria Composer/vendor só pra isso). Segredo
    em `config['JWT_SECRET']`.
  - Middleware `requireAuth()` (espelha `ApiKeyAuth::require`: valida
    `Authorization: Bearer`, devolve usuário+permissões ou escreve 401 e retorna
    `null`) + checagem de papel (`super_admin`/`admin_grupo`/`usuario`).
  - Rotas: `POST /api/auth/login`, `GET /api/auth/me`; CRUD `/api/grupos`,
    `/api/usuarios`. **v1: login + usuários criados pelo admin** (sem cadastro
    público/e-mail — Fase 4).
- **Frontend** — replicar o modo-duplo do `EstruturaContext` nas outras duas
  costuras, atrás de `VITE_USE_BACKEND_SESSAO`/`_TENANT`:
  - `SessaoContext` (login/me reais, token no `localStorage` via
    `usePersistedState`); `TenantContext` (grupos/empresas via API).
  - `api.js`: com token presente, mandar `Authorization: Bearer <jwt>` em vez de
    `X-API-KEY` (hoje o header é fixo em `api.js:23`).
  - `EstruturaContext.codigoDaEmpresa` (`EstruturaContext.jsx:65`) hoje resolve o
    código pela lista **estática** `empresaPorId`; com o Tenant real, trocar pela
    lista viva de grupos.
  - `RequireAcesso`/`Sidebar` passam a usar as permissões do servidor.
- **Gotcha de deploy:** em Apache/LiteSpeed o header `Authorization` às vezes não
  chega ao PHP — pode exigir `.htaccess` (`CGIPassAuth On` ou um `RewriteRule` que
  copie para `HTTP_AUTHORIZATION`). Validar no smoke deploy.
- **Real:** Login, Grupos e Empresas, Usuários e acessos.

### Fase 3 — Relatórios + Análises (a parte pesada, em PHP)

**Já pronto na Fase 1** (não precisa refazer): `PowerBI::executeDaxQuery` (cURL +
retry 401 + 429/timeout), `Auth::getAccessToken` (token Azure cacheado em MySQL),
`Cache` (TTL). Então falta:
- `PowerBI::queryBalancete` — portar a query DAX de balancete de `powerbi.js`, com
  o mesmo `MOCK_MODE` já usado em `queryContasUnicas`.
- **Motor de cálculo** (`src/ReportEngine.php`): aplica estrutura + classificações
  ao balancete e produz as linhas de DRE/Balanço/Fluxo. Rotas
  `GET /api/reports/{dre,balanco,fluxoCaixa}?empresa=&periodoInicio=&periodoFim=`.
- **Ponto crítico de modelagem (o maior trabalho restante):** as análises leem IDs
  de linha semânticos fixos (`subtotal-receita-liquida`, `caixa-equivalentes`,
  `emprestimos-cp`…). Reproduzi-los exige um **template de relatório canônico**
  (com esses códigos) como estrutura padrão + cada conta classificada para uma
  dessas linhas.
- **Frontend:** `financeiro.js` vira cliente `fetch` devolvendo **o mesmo shape** de
  hoje (atrás de `VITE_USE_BACKEND_FINANCEIRO`); `indicadores/risco/previsao/
  orcamento` **não mudam**. Sub-faseável: DRE → Balanço → Fluxo.
- **Testes:** fixtures de balancete no `MockData` + casos do motor de cálculo
  (comparar as linhas com um relatório real).

### Fase 4 — Telemetria, config e "próximos passos"
- Uso por usuário (log de acesso em MySQL), Configurações persistidas, cadastro
  público + verificação de e-mail + recuperar senha (SMTP da Hostinger), contrato
  em PDF + envio por e-mail, teste real de conexão Power BI por empresa.

---

## Deploy na Hostinger Premium (`financialreports.com.br`)

Estrutura de pastas (shared hosting; colocar código sensível **acima** de `public_html`):
```
~/domains/financialreports.com.br/
  app/                      # FORA do web root (não acessível pela web)
    src/  vendor/  config.php   # lógica PHP + libs + segredos
  public_html/              # web root
    index.html  assets/     # build do Vite (SPA)
    .htaccess               # fallback SPA + libera /api
    api/
      index.php  .htaccess  # front controller (requer ../../app/src)
```
- **Frontend:** `cd portal-frontend && npm run build` → subir `dist/` para
  `public_html/`. `.htaccess` com fallback SPA (todas as rotas não-`/api` e
  não-arquivo → `index.html`) para o React Router funcionar em URLs profundas.
- **Backend PHP:** subir `public/` para `public_html/api/` e `src/`+`vendor/`+
  `config.php` para `app/`. Selecionar **PHP 8.x** no hPanel. **MySQL** criado no
  hPanel; rodar as `migrations/*.sql` pelo phpMyAdmin.
- **Composer:** o Premium inclui **acesso SSH e Git** — dá pra rodar `composer
  install` via SSH; se preferir, rode local e suba a pasta `vendor/` por FTP/File
  Manager. (Hostinger também tem deploy via Git no hPanel.)
- **HTTPS:** SSL grátis (Let's Encrypt) pelo hPanel para `financialreports.com.br`.
- **Sem CORS** (mesma origem). **Cron** (hPanel) opcional para aquecer cache/refresh.
- **Fazer um smoke deploy primeiro** (antes da Fase 2): SPA mínima + `/api/health`
  + 1 rota de estrutura contra um MySQL do hPanel, para provar o ambiente Premium
  (`.htaccess`/mod_rewrite, PHP do hPanel, MySQL, cURL de saída) enquanto ainda é
  barato ajustar.
- **Header de auth:** garantir que `X-API-KEY` (Fase 1) e depois `Authorization`
  (Fase 2) cheguem ao PHP — em alguns setups Apache/LiteSpeed o `Authorization` é
  filtrado; pode precisar de `CGIPassAuth On` ou `RewriteRule` no `.htaccess`.
- **MCP Hostinger:** não é necessário — não há Node/VPS a gerenciar aqui, e o
  registro de conectores do Claude não tem conector Hostinger. Nada a habilitar.

---

## Verificação (prova a cada fase)

- **Fase 0:** `php -S localhost:8000 -t portal-backend-php/public` + front com
  proxy → `/api/health` responde `{status:"ok"}` no navegador (preview). Após o
  deploy, `https://financialreports.com.br/api/health` idem.
- **Fase 1:** com `VITE_USE_BACKEND_ESTRUTURA=true` e o PHP em `MOCK_MODE`, abrir
  Plano de Contas na empresa **KOBE Comércio (código `001`)** — o mock só tem
  lançamentos para **`001`/`002`**, então "Importar" só traz contas nessas duas.
  Criar/editar/mover/remover um nó e adicionar/remover tag (com e sem
  `centroCusto`/`natureza`), dar **reload** e confirmar que **persiste no MySQL**
  (conferir no phpMyAdmin as linhas em `estruturas`/`classificacoes`). No Network,
  as chamadas a `/api/contabil/estrutura` e `/api/contabil/contas`.
  - **Gotcha "Importar":** `AbaContas.jsx` (`BlocoImportar`) só habilita quando
    `empresa.conexao?.status === 'conectado'`. Empresas mock não têm `conexao` —
    configure/teste uma conexão (mock) em "Grupos e Empresas", ou relaxe o gate
    para testar.
- **Fase 2:** login com usuário provisionado; como `usuario` comum, rota admin
  bloqueada (`RequireAcesso` + RBAC do servidor); `GET /api/auth/me` reflete
  permissões.
- **Fase 3:** comparar uma DRE do backend com a do Power BI/planilha real;
  Indicadores/Risco/Previsão batem com a DRE exibida.
- **Testes automatizados:** portar os casos de `portal-backend/tests/**` (Jest)
  para **PHPUnit** em `portal-backend-php/tests/**` (mesmos cenários: 400/401/403,
  contrato das rotas). Manter os Vitest do front (`portal-frontend/src/**/__tests__`).

---

## Riscos e decisões em aberto

1. **~~Reescrita PHP joga fora código Node testado~~ (retirado)** — o port foi
   feito rota a rota e os testes viraram **76 PHPUnit verdes**; o `portal-backend`
   Node fica como especificação.
2. **~~Sem processo persistente~~ (resolvido)** — `Cache`/`Auth` já persistem o
   token Azure (e, na Fase 3, o DAX) em MySQL. Falta só **validar cURL de saída**
   p/ `login.microsoftonline.com`/`api.powerbi.com` no ambiente Hostinger.
3. **~~Composer em shared~~ (resolvido por decisão)** — o projeto ficou **sem
   Composer** (nativo + `phpunit.phar`). Manter assim: o JWT da Fase 2 = `Jwt.php`
   próprio, não `firebase/php-jwt`.
4. **Deploy real na Hostinger ainda não validado** — tudo testado localmente.
   Fazer um **smoke deploy** cedo (`.htaccess`/mod_rewrite, PHP do hPanel, MySQL,
   headers `X-API-KEY`/`Authorization`, cURL de saída) para não descobrir no fim.
5. **Template canônico de relatório (Fase 3)** — o maior esforço restante; casar
   os IDs de linha que as análises esperam com uma estrutura contábil real (o
   plumbing de Power BI/cache já está pronto).
6. **Segurança** — `config.php` (segredos) fora do `public_html`; `password_hash`;
   expiração de JWT; nunca commitar segredos; `.htaccess` negando acesso a
   arquivos sensíveis.
