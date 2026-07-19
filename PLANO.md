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

## Estado atual (pós Fase 0/1/2 — DEPLOYADO — 19/07/2026)

**Fases 0, 1 e 2 concluídas, validadas ponta a ponta E no ar em produção**
(`financialreports.com.br`), pelo Sonnet 5. Backend PHP (`portal-backend-php/`)
espelha o Node; **111 testes PHPUnit verdes**. Dev local em memória (PHP 8.3
portátil, MySQL 8.4 noinstall, `php -S`, `phpunit.phar` — **sem Composer**).

**Costuras ligadas (modo-duplo, atrás de flag):**
- ✅ **Sessão** (`SessaoContext.jsx`) — login JWT real, `/auth/me` na hidratação,
  token em `localStorage` (`usePersistedState`); `api.js` manda `Bearer` após login,
  senão `X-API-KEY`. 1º super_admin via `POST /api/auth/bootstrap`.
- ✅ **Tenant** (`TenantContext.jsx`) — grupos/empresas via API.
- ✅ **Estrutura** (`EstruturaContext.jsx`) — plano de contas (Fase 1).
- ⬜ **Financeiro** (`data/financeiro.js`) — **ainda mock** (Fase 3). Em produção
  `VITE_USE_BACKEND_FINANCEIRO=false`; os outros três `=true`.

**Backend PHP existente:** rotas health/auth (bootstrap/login/me)/grupos/empresas/
usuários/estrutura/contas (`src/routes.php`); RBAC (`SessionAuth`, aceita **Bearer
OU X-API-KEY**); `Grupos`/`Tenancy`/`Usuarios`/`Jwt` (HS256 self-contained, sem
Composer). **Bônus já pronto p/ Fase 3:** `PowerBI::executeDaxQuery` (cURL+retry+
429/timeout), `Auth::getAccessToken` (token Azure cacheado), `Cache` (MySQL TTL).
Falta só `queryBalancete` + motor de cálculo + rotas de relatório.

**Decisão de modelagem da Fase 3 (usuário, 19/07): estrutura LIVRE por empresa —
sem template padrão.** "Cada empresa é uma realidade." O **admin do grupo** monta a
estrutura e **replica para todas as empresas do grupo**; depois pode **alterar uma
empresa específica** sem afetar as outras. *(Já quase todo suportado: a estrutura é
por-empresa e independente; `POST /contabil/contas/copiar` copia estrutura+
classificações de uma empresa p/ outra — "replicar p/ todas" = repetir a cópia para
cada empresa do grupo; falta só a ação de conveniência no front.)* **Consequência
que molda a Fase 3:** os **demonstrativos** saem direto da árvore livre, mas as
**análises** (que leem grandezas semânticas fixas) exigem uma camada de mapeamento
→ ver Fase 3a/3b.

**Loose ends antes/durante a Fase 3:**
- Branch `feature/backend-php-fase-0-1` tem 3 commits **não mergeados na `main` nem
  enviados** (`git push`). Decidir merge/push (e os 2 arquivos novos em `deploy/`
  ainda uncommitted).
- `.env.local` (dev) está com os 4 flags `=false` (dev roda mock puro); para
  desenvolver a Fase 3 vai precisar ligar `SESSAO/TENANT/ESTRUTURA/FINANCEIRO`.
- `.env.production.local` tem `VITE_API_KEY` placeholder — ok enquanto SESSAO=true
  (usa Bearer após login), mas confirmar.
- **Dado real:** o `MockData` só tem 2 contas (empresas `001`/`002`). Para validar
  DRE/Balanço reais, **expandir as fixtures** OU **ligar o Power BI real** (SP
  `portal-site-powerbi`, workspace DIRETORIA, dataset `lancamentos_contabeis` — ver
  memória) preenchendo `config['AZURE']` em produção.

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

### Fase 3 — Relatórios + Análises (a parte pesada). Dividida em 3a e 3b pela decisão "estrutura livre".

Com **estrutura livre por empresa** (sem template canônico), os **demonstrativos**
saem naturalmente da árvore do usuário, mas as **análises** (que leem grandezas
semânticas fixas) precisam de uma camada de mapeamento. Daí duas sub-fases.
**Já pronto (não refazer):** `PowerBI::executeDaxQuery`, `Auth::getAccessToken`, `Cache`.

#### Fase 3a — Demonstrativos (DRE/Balanço/Fluxo) da árvore livre — alinhado à decisão, fazer primeiro
- **Backend:** `PowerBI::queryBalancete` (portar a DAX de `powerbi.js`, com o mesmo
  `MOCK_MODE`) + **`src/ReportEngine.php`** que percorre a **estrutura da empresa**
  (nós + `sinal` +/-/=), soma o saldo das contas **classificadas** em cada nó (via
  `classificacoes`/`classificacao_tags`, respeitando natureza/centro de custo da
  regra) e faz a cascata de subtotais/totais — mesma lógica de
  `financeiro.js#computeLinhas`, mas sobre a árvore real, não sobre blocos fixos.
- Rotas `GET /api/reports/{dre,balanco,fluxoCaixa}?empresa=&periodoInicio=&periodoFim=`
  devolvendo **uma coluna por período** (a faixa inteira numa chamada — as telas e
  as análises precisam da série, não de um mês só).
- **Frontend:** as 3 telas de relatório passam a renderizar as **linhas vindas do
  backend** (a árvore do usuário), atrás de `VITE_USE_BACKEND_FINANCEIRO`. Os
  ajudantes genéricos que já existem (`construirTabelaPeriodos`, AH/AV/média) operam
  sobre "linhas" genéricas → continuam servindo; só a **base da Análise Vertical**
  (hoje `subtotal-receita-liquida`) precisa ser escolhida (nó marcado, ou 1ª linha
  de receita).
- **Carga assíncrona (principal esforço de front):** `financeiro.js` é **síncrono**
  e lido em muitas telas; com backend vira async. Criar um **loader/cache**
  (ex.: `FinanceiroContext`, no espírito do modo-duplo do `EstruturaContext`) que
  **pré-carrega** a série do escopo (empresas do escopo × faixa de períodos) e serve
  síncrono às telas — incluindo os 12 meses que previsão/volatilidade/sparklines usam.

#### Fase 3b — Análises (indicadores/risco/previsão/orçado) — o custo da estrutura livre
As análises precisam de ~30 grandezas nomeadas (Receita Líquida, EBITDA, Caixa,
Contas a Receber, Empréstimos CP/LP, PL…). Com árvore livre, o backend não sabe qual
nó é "Caixa". Solução: **papel analítico opcional por nó** —
- No Plano de Contas, o admin marca (dropdown, vocabulário fixo) quais linhas são
  Receita Líquida, EBITDA, Caixa, etc. — só as que quiser; o que faltar → indicador
  "n/d" (as análises já tratam `null`/`NaN` sem quebrar).
- **Backend:** coluna `papel` em `estruturas` (ou tabela `papeis_no`); o
  `ReportEngine` expõe "valor por papel".
- **Frontend:** os lookups centralizados em `indicadores.js`/`risco.js`/`orcamento.js`
  (`porId(...)`, `contaDe(...)`) passam a resolver **por papel** em vez de ID fixo —
  refatoração contida (concentrada em poucos helpers, ex.: `coletarDados`).
- **Degradação graciosa:** mapeamento parcial já dá análises parciais; completa com o
  tempo, sem bloquear a 3a.

**Sequência recomendada:** 3a primeiro (entrega os 3 demonstrativos reais + Dashboard
de resultado); 3b em seguida (liga as 4 telas de análise). 3a pode subir sozinho com
as telas de análise ainda em mock.

- **Dado p/ testar:** expandir as fixtures do `MockData` para um plano de contas
  plausível (várias contas por empresa/período) **ou** ligar o Power BI real
  (`config['AZURE']`), já que hoje só há 2 contas.

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
- **Fase 3a:** montar uma estrutura numa empresa, classificar contas, e conferir que
  a DRE/Balanço/Fluxo do backend batem com um relatório real (Power BI/planilha) e
  com a soma dos saldos por nó; reload persiste; a série de períodos vem numa chamada.
- **Fase 3b:** marcar os papéis analíticos das linhas e conferir que Indicadores/
  Risco/Previsão/Orçado passam de "n/d" para valores coerentes com a DRE exibida;
  linhas sem papel ficam "n/d" sem quebrar a tela.
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
