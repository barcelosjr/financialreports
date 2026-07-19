# Deploy da Fase 2 na Hostinger (Auth + Usuários + Tenancy)

Pré-requisito: a Fase 0+1 já está no ar (você já fez esse smoke deploy antes).
Isso aqui é só o incremento — os arquivos de `api/` e `app/src/` que já
existem no servidor continuam lá, só estamos adicionando/atualizando alguns.

## 1. Subir os arquivos PHP novos/alterados

Vão pra dentro de `app/src/` (a mesma pasta onde já estão `Estruturas.php`,
`Classificacoes.php` etc. — fora do `public_html/`):

**Novos** (não existiam antes):
- `portal-backend-php/src/Grupos.php`
- `portal-backend-php/src/Jwt.php`
- `portal-backend-php/src/SessionAuth.php`
- `portal-backend-php/src/Tenancy.php`
- `portal-backend-php/src/Usuarios.php`

**Substituir** (já existe no servidor, sobrescreva):
- `portal-backend-php/src/routes.php`

## 2. Rodar a migration 003

**phpMyAdmin** → seu banco → aba **SQL** → cole o conteúdo de
`portal-backend-php/migrations/003_auth.sql` → **Executar**.

Confirme em **Estrutura** que apareceram 3 tabelas novas: `grupos`,
`empresas`, `usuarios`.

## 3. Adicionar o JWT_SECRET no config.php

Edite o `config.php` que já está em `app/` (pelo Gerenciador de Arquivos,
botão Editar) e adicione, dentro do array, ao lado de `CACHE_TTL_SECONDS`:

```php
'JWT_SECRET' => 'GERE-UM-VALOR-ALEATORIO-AQUI',
```

Gere um valor de verdade (não copie um exemplo) — no Windows, PowerShell:

```powershell
-join ((48..57)+(65..90)+(97..122)|Get-Random -Count 48|%{[char]$_})
```

Ou qualquer gerador de senha de 40+ caracteres. Salve o arquivo.

## 4. Rebuild da SPA e subir por cima

No seu computador, dentro de `portal-frontend/`, o `.env.production.local`
precisa ter (eu já deixei assim):

```
VITE_USE_BACKEND_ESTRUTURA=true
VITE_USE_BACKEND_TENANT=true
VITE_USE_BACKEND_SESSAO=true
VITE_USE_BACKEND_FINANCEIRO=false
```

Rode `npm run build` (eu já rodei — `portal-frontend/dist/` está pronto).
No Gerenciador de Arquivos, vá em `public_html/` (a raiz) e substitua:
`index.html`, `favicon.svg` e a pasta `assets/` pelos novos de `dist/`
(mesma mecânica de antes — sobrescrever quando perguntar).

## 5. Subir a página de bootstrap

Suba `deploy/public_html/bootstrap.html` pra raiz de `public_html/` (do
lado do `index.html`).

Abra `https://financialreports.com.br/bootstrap.html`, preencha seu nome,
e-mail e uma senha, clique em **Criar super_admin**. Deve responder
`HTTP 201`.

**Depois de usar, apague o `bootstrap.html` do servidor** (pelo Gerenciador
de Arquivos) — ele só serve uma vez mesmo (o endpoint se bloqueia sozinho
assim que existir um usuário), mas não custa tirar do ar.

## 6. Validar

1. Abra `https://financialreports.com.br/` → deve aparecer a tela de login
   de verdade.
2. Entre com o e-mail/senha que você criou no passo 5.
3. Vá em **Grupos e Empresas** → crie um grupo → crie uma empresa com o
   código que quiser (ex: `001`).
4. Vá em **Plano de Contas**, selecione essa empresa, crie um nó de teste
   em DRE. Se salvar e continuar lá depois de recarregar a página, está
   tudo funcionando: login real, tenancy real, e a Fase 1 (Plano de Contas)
   conversando com a empresa de verdade em vez do código fixo `001`/`002`
   do `MOCK_MODE`.
5. Vá em **Usuários e acessos** → **Novo usuário** → crie um segundo
   usuário. Deve aparecer uma senha temporária uma vez só — anote e teste
   logar com ela em uma aba anônima.

## Gotchas

- **Header `Authorization` não chega ao PHP:** o mesmo problema que já
  existia com `X-API-KEY` (ver `GUIA_SMOKE_DEPLOY.md`) pode acontecer com
  `Authorization: Bearer` em alguns setups Apache/LiteSpeed. Se `/auth/me`
  dá 401 mesmo com o token certo, pode precisar de `CGIPassAuth On` ou uma
  `RewriteRule` no `.htaccess` de `api/` copiando o header.
- **"Já existe usuário cadastrado" no bootstrap:** normal se você já criou
  um antes (ou se sobrou usuário de outro teste) — nesse caso, você já tem
  login, não precisa do bootstrap de novo.
- **`X-API-KEY` antiga:** com a Fase 2 no ar, ela deixa de ser necessária
  pra quem faz login de verdade (o front manda `Authorization: Bearer`
  automaticamente depois do login). Pode deixar `CLIENTS` no `config.php`
  como está, sem efeito prático — ou limpar depois, sem pressa.
