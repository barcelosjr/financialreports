# Smoke deploy na Hostinger — passo a passo

Objetivo: provar que o ambiente Premium (PHP, MySQL, `.htaccess`/mod_rewrite,
headers) funciona de verdade, **antes** de investir na Fase 2. Isso aqui não é
o deploy final da SPA — é só a canalização. Leva ~15-20 min.

O Claude Code não tem acesso ao hPanel (é headless); os passos abaixo são pra
você fazer. Peça ajuda a qualquer momento se algo não bater com o que está
descrito (nomes de tela mudam entre versões do hPanel).

## 0. Onde estão os arquivos

- `deploy/public_html/index.html` + `deploy/public_html/.htaccess` → vão pra
  raiz do seu domínio (`public_html/`).
- `portal-backend-php/public/index.php` + `portal-backend-php/public/.htaccess`
  → vão pra `public_html/api/`.
- `portal-backend-php/src/` (todos os `.php`) → vai pra **fora** do web root,
  em `app/src/`.
- `portal-backend-php/config.php.example` → copie pra `config.php`, preencha,
  e suba pra `app/` (ao lado de `src/`) — **nunca** dentro de `public_html/`.
- `deploy/migrations_001_002_combinado.sql` → cola no phpMyAdmin (passo 2).

Resultado esperado no servidor:

```
~/domains/financialreports.com.br/
  app/
    src/            <- copiado de portal-backend-php/src/
    config.php      <- copiado de config.php.example, preenchido
  public_html/
    index.html       <- deploy/public_html/index.html
    .htaccess         <- deploy/public_html/.htaccess
    api/
      index.php       <- portal-backend-php/public/index.php
      .htaccess       <- portal-backend-php/public/.htaccess
```

**Importante:** `public/index.php` acha `src/` e `config.php` via
`APP_BASE_PATH` (variável de ambiente) e só cai no padrão `__DIR__ . '/..'`
(um nível acima de `public/`) se essa variável não estiver definida — é assim
que o dev local (`php -S`) funciona sem configuração nenhuma. Em produção,
como `src/`+`config.php` ficam em `app/` (fora do `public_html/`), você
**precisa** setar essa variável em `public_html/api/.htaccess`: abra o
arquivo que você copiou de `portal-backend-php/public/.htaccess` e
descomente/ajuste a linha:

```apache
SetEnv APP_BASE_PATH /home/SEU_USUARIO/domains/financialreports.com.br/app
```

Troque `SEU_USUARIO` pelo usuário Linux da sua conta Hostinger (aparece no
hPanel, em "Informações da Hospedagem" ou similar; geralmente é algo como
`u123456789`). Sem isso, `index.php` vai procurar `src/`/`config.php` no
lugar errado e devolver 500.

## 1. Criar o banco MySQL

No hPanel: **Bancos de Dados → Bancos de Dados MySQL**.

1. Crie um banco (ex: `u123_portal_financeiro`) e um usuário com senha forte.
2. Associe o usuário ao banco com todas as permissões.
3. **Anote**: nome do banco, usuário, senha, host (normalmente `localhost` na
   Hostinger).

## 2. Rodar as migrations

**Bancos de Dados → phpMyAdmin** → selecione o banco criado → aba **SQL** →
cole o conteúdo de `deploy/migrations_001_002_combinado.sql` → **Executar**.

Confirme em **Estrutura** que apareceram 4 tabelas: `cache`, `estruturas`,
`classificacoes`, `classificacao_tags`.

## 3. Escolher a versão do PHP

**Avançado → Configurar PHP** (ou "Seleção de versão do PHP") → escolha
**PHP 8.1 ou superior** (o projeto foi testado em 8.3) → habilite as
extensões `pdo_mysql`, `curl`, `mbstring` se houver essa tela (geralmente já
vêm ligadas por padrão na Hostinger).

## 4. Preencher o config.php

Copie `portal-backend-php/config.php.example` para `config.php` localmente e
edite:

```php
'DB' => [
    'host' => 'localhost',           // confirmar no hPanel — pode ser um host diferente
    'port' => 3306,
    'dbname' => 'u123_portal_financeiro',
    'user' => 'u123_seu_usuario',
    'pass' => 'a-senha-que-voce-criou',
],
'CLIENTS' => [
    'uma-chave-aleatoria-bem-longa-so-sua' => [
        'cliente' => 'Smoke Test',
        'empresas' => ['001', '002'],
    ],
],
'MOCK_MODE' => true, // continua true — sem credencial Azure ainda
```

Gere a API key com algo como `openssl rand -hex 32` (ou qualquer string longa
aleatória) — é o valor que você vai colar no campo "X-API-KEY" da página de
smoke test.

## 5. Subir os arquivos

Duas opções, use a que preferir:

- **File Manager** (hPanel → Arquivos → Gerenciador de Arquivos): navegue até
  `public_html/`, faça upload de `index.html`, `.htaccess`, e da pasta `api/`
  (com `index.php` + `.htaccess` de dentro de `portal-backend-php/public/`).
  Depois suba `src/` e o `config.php` preenchido conforme a seção "0" acima.
- **FTP/SFTP** (hPanel → Arquivos → Contas FTP): mesma estrutura, via
  FileZilla ou similar.

## 6. Ativar SSL

**Segurança → SSL** → ativar Let's Encrypt para `financialreports.com.br`
(costuma ser automático/gratuito na Hostinger, pode levar alguns minutos pra
propagar).

## 7. Validar

Abra `https://financialreports.com.br/` no navegador — deve aparecer a
página de smoke test (não a SPA de verdade ainda, só a página estática).

1. **Botão "Testar" (`/api/health`)** → deve responder `HTTP 200` com
   `{"status":"ok"}`. Se der 404/500, o problema é `.htaccess`/mod_rewrite ou
   caminho de arquivo — revise a seção "0".
2. Cole a API key que você configurou no campo X-API-KEY.
3. **Botão "Criar nó de teste"** → deve responder `HTTP 201` com um JSON
   `{"id":"...", "nome":"Smoke Test", ...}`. Se der 401, a API key não bate
   com o `config.php`; se der 500, provavelmente é a conexão MySQL (confira
   host/usuário/senha/nome do banco).
4. **Botão "Ler estrutura"** → deve devolver uma lista com o nó que você
   acabou de criar.
5. Confirme também **direto no phpMyAdmin**: tabela `estruturas` deve ter uma
   linha nova com `nome = 'Smoke Test'`.

Se os 4 passos acima funcionarem, o ambiente está provado: PHP rodando,
`.htaccess` reescrevendo direito, MySQL acessível, e a Fase 1 já é real em
produção (mesmo que ainda com a página estática, não a SPA). Aí sim faz
sentido:

- Fazer o deploy da SPA de verdade (`npm run build` do `portal-frontend`) por
  cima da página de smoke test.
- Seguir pra Fase 2.

## Gotchas conhecidos (se algo não funcionar)

- **`.htaccess` sem efeito / 404 em tudo:** confirme que `AllowOverride All`
  está habilitado pro seu domínio (normalmente já vem assim na Hostinger,
  mas em alguns planos precisa pedir pro suporte ou ajustar em "Avançado").
- **Header `X-API-KEY` não chega ao PHP:** raro em LiteSpeed, mas se
  `Http::header('X-API-KEY')` vier sempre `null` mesmo mandando o header,
  teste também `HTTP_X_API_KEY` vs. variações de case — o código já normaliza
  isso, então se falhar é mais provável ser o servidor filtrando o header
  antes de chegar ao PHP (nesse caso, precisaria de uma regra tipo
  `RewriteRule .* - [E=HTTP_X_API_KEY:%{HTTP:X-API-KEY}]` no `.htaccess`).
- **500 sem detalhe:** olhe o log de erros do PHP no hPanel (Avançado → Log de
  Erros do PHP) — `index.php` já captura exceptions e devolve
  `{"error":"Erro interno no servidor."}` sem vazar detalhe pro cliente, mas
  loga o erro real via `error_log()`.
- **Conexão MySQL recusada:** confirme que não precisa de "Remote MySQL" (na
  Hostinger, PHP e MySQL rodam no mesmo host, `localhost` deve bastar — se
  não bastar, o hPanel mostra o host correto na tela do banco).
- **`SetEnv APP_BASE_PATH` não parece funcionar** (500 mesmo com o `.htaccess`
  certo): alguns hosts restringem `SetEnv`. Teste alternativo: em
  `public_html/api/index.php`, troque temporariamente a linha
  `$basePath = getenv('APP_BASE_PATH') ?: (__DIR__ . '/..');` por
  `$basePath = '/home/SEU_USUARIO/domains/financialreports.com.br/app';`
  (caminho fixo) só nesse arquivo do servidor — não precisa mexer no repo
  local.
