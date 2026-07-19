<?php
declare(strict_types=1);

/**
 * Registro de rotas do front controller (public/index.php). Espelha
 * rota a rota o portal-backend Node onde existe equivalente (Fase 0+1);
 * auth/tenancy/usuários (Fase 2) não têm equivalente no Node -- o contrato
 * aqui espelha o shape que o front (mock) já usava.
 *
 * @var App\Router $router
 * @var array $config
 */

use App\Classificacoes;
use App\Db;
use App\Estruturas;
use App\Grupos;
use App\Http;
use App\Jwt;
use App\PowerBI;
use App\PowerBIException;
use App\SessionAuth;
use App\Usuarios;
use App\Utils;

// GET /api/health -- sem auth, igual ao Node (que expõe em /health; aqui
// fica sob /api porque o front controller inteiro mora em public_html/api/).
$router->get('/health', function (): void {
    Http::sendJson(200, ['status' => 'ok']);
});

// relatorio pode vir da query OU do corpo, igual a routes/estrutura.js do Node.
function parseRelatorioRota(): ?string
{
    $relatorio = Http::query('relatorio') ?? (Http::body()['relatorio'] ?? null);
    if (!$relatorio || !in_array($relatorio, Estruturas::RELATORIOS, true)) {
        Http::sendError(400, 'Parâmetro "relatorio" é obrigatório e deve ser um de: ' . implode(', ', Estruturas::RELATORIOS) . '.');
        return null;
    }
    return $relatorio;
}

/** Escreve 403 e devolve false se o papel do usuário não estiver na lista permitida. */
function exigirPapel(array $usuario, array $papeis): bool
{
    if (!in_array($usuario['papel'], $papeis, true)) {
        Http::sendError(403, 'Você não tem permissão para esta ação.');
        return false;
    }
    return true;
}

// ==================== Fase 2: Auth ====================

// POST /api/auth/bootstrap  { nome, email, senha }
// Só funciona uma vez, enquanto a tabela usuarios estiver vazia -- cria o
// primeiro super_admin sem precisar de acesso SSH/CLI ao servidor.
$router->post('/auth/bootstrap', function () use ($config): void {
    $pdo = Db::pdo($config['DB']);
    if (Usuarios::contarTodos($pdo) > 0) {
        Http::sendError(403, 'Já existe usuário cadastrado -- use /auth/login.');
        return;
    }

    $body = Http::body();
    if (empty($body['nome']) || empty($body['email']) || empty($body['senha'])) {
        Http::sendError(400, 'Campos "nome", "email" e "senha" são obrigatórios.');
        return;
    }

    try {
        $resultado = Usuarios::criar($pdo, [
            'nome' => $body['nome'],
            'email' => $body['email'],
            'senha' => $body['senha'],
            'papel' => 'super_admin',
            'grupoId' => null,
            'empresasPermitidas' => 'todas',
            'relatoriosPermitidos' => Usuarios::RELATORIOS,
            'status' => 'ativo',
        ]);
    } catch (\InvalidArgumentException $e) {
        Http::sendError(400, $e->getMessage());
        return;
    }

    $token = Jwt::encode(['sub' => $resultado['usuario']['id']], $config['JWT_SECRET']);
    Http::sendJson(201, ['token' => $token, 'usuario' => $resultado['usuario']]);
});

// POST /api/auth/login  { email, senha }
$router->post('/auth/login', function () use ($config): void {
    $body = Http::body();
    if (empty($body['email']) || empty($body['senha'])) {
        Http::sendError(400, 'Campos "email" e "senha" são obrigatórios.');
        return;
    }

    $pdo = Db::pdo($config['DB']);
    $resultado = Usuarios::autenticar($pdo, $body['email'], $body['senha']);
    if ($resultado === null) {
        Http::sendError(401, 'E-mail ou senha inválidos.');
        return;
    }
    if (!empty($resultado['bloqueado'])) {
        Http::sendError(403, 'Este usuário está inativo. Fale com o administrador do seu grupo.');
        return;
    }

    $token = Jwt::encode(['sub' => $resultado['usuario']['id']], $config['JWT_SECRET']);
    Http::sendJson(200, ['token' => $token, 'usuario' => $resultado['usuario']]);
});

// GET /api/auth/me
$router->get('/auth/me', function () use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $usuario = SessionAuth::require($pdo, $config);
    if ($usuario === null) return;
    Http::sendJson(200, ['usuario' => $usuario]);
});

// ==================== Fase 2: Grupos + Empresas ====================

// GET /api/grupos -- super_admin vê todos; os demais, só o próprio.
$router->get('/grupos', function () use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $usuario = SessionAuth::require($pdo, $config);
    if ($usuario === null) return;

    $somenteGrupoId = $usuario['papel'] === 'super_admin' ? null : $usuario['grupoId'];
    Http::sendJson(200, Grupos::listar($pdo, $somenteGrupoId));
});

// POST /api/grupos  { nome, plano }
$router->post('/grupos', function () use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $usuario = SessionAuth::require($pdo, $config);
    if ($usuario === null) return;
    if (!exigirPapel($usuario, ['super_admin'])) return;

    try {
        Http::sendJson(201, Grupos::criar($pdo, Http::body()));
    } catch (\InvalidArgumentException $e) {
        Http::sendError(400, $e->getMessage());
    }
});

// PUT /api/grupos/:id  { nome?, plano? }
$router->put('/grupos/:id', function (array $params) use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $usuario = SessionAuth::require($pdo, $config);
    if ($usuario === null) return;
    if (!exigirPapel($usuario, ['super_admin'])) return;

    try {
        Http::sendJson(200, Grupos::atualizar($pdo, $params['id'], Http::body()));
    } catch (\InvalidArgumentException $e) {
        Http::sendError(400, $e->getMessage());
    }
});

// DELETE /api/grupos/:id
$router->delete('/grupos/:id', function (array $params) use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $usuario = SessionAuth::require($pdo, $config);
    if ($usuario === null) return;
    if (!exigirPapel($usuario, ['super_admin'])) return;

    if (!Grupos::remover($pdo, $params['id'])) {
        Http::sendError(404, 'Grupo não encontrado.');
        return;
    }
    Http::sendJson(200, ['ok' => true]);
});

// POST /api/grupos/:id/empresas  { codigo, nome, cnpj, conexao }
$router->post('/grupos/:id/empresas', function (array $params) use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $usuario = SessionAuth::require($pdo, $config);
    if ($usuario === null) return;
    if (!exigirPapel($usuario, ['super_admin'])) return;

    try {
        Http::sendJson(201, Grupos::adicionarEmpresa($pdo, $params['id'], Http::body()));
    } catch (\InvalidArgumentException $e) {
        Http::sendError(400, $e->getMessage());
    }
});

// PUT /api/empresas/:id  { codigo?, nome?, cnpj?, conexao? }
$router->put('/empresas/:id', function (array $params) use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $usuario = SessionAuth::require($pdo, $config);
    if ($usuario === null) return;
    if (!exigirPapel($usuario, ['super_admin'])) return;

    try {
        Http::sendJson(200, Grupos::atualizarEmpresa($pdo, $params['id'], Http::body()));
    } catch (\InvalidArgumentException $e) {
        Http::sendError(400, $e->getMessage());
    }
});

// DELETE /api/empresas/:id
$router->delete('/empresas/:id', function (array $params) use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $usuario = SessionAuth::require($pdo, $config);
    if ($usuario === null) return;
    if (!exigirPapel($usuario, ['super_admin'])) return;

    if (!Grupos::removerEmpresa($pdo, $params['id'])) {
        Http::sendError(404, 'Empresa não encontrada.');
        return;
    }
    Http::sendJson(200, ['ok' => true]);
});

// ==================== Fase 2: Usuários ====================

// GET /api/usuarios?grupoId= -- admin_grupo é sempre restrito ao próprio grupo.
$router->get('/usuarios', function () use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $usuario = SessionAuth::require($pdo, $config);
    if ($usuario === null) return;
    if (!exigirPapel($usuario, ['super_admin', 'admin_grupo'])) return;

    if ($usuario['papel'] === 'super_admin') {
        $grupoId = Http::query('grupoId');
        Http::sendJson(200, Usuarios::listar($pdo, $grupoId ?: null));
    } else {
        Http::sendJson(200, Usuarios::listar($pdo, $usuario['grupoId']));
    }
});

// POST /api/usuarios  { nome, email, papel, grupoId, empresasPermitidas, relatoriosPermitidos }
// Devolve { usuario, senhaTemporaria } -- sem cadastro público/e-mail ainda
// (Fase 4), a senha é gerada aqui e mostrada uma vez pro admin repassar.
$router->post('/usuarios', function () use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $usuario = SessionAuth::require($pdo, $config);
    if ($usuario === null) return;
    if (!exigirPapel($usuario, ['super_admin', 'admin_grupo'])) return;

    $body = Http::body();
    if ($usuario['papel'] === 'admin_grupo') {
        // admin de grupo só convida usuário comum, dentro do próprio grupo.
        $body['grupoId'] = $usuario['grupoId'];
        $body['papel'] = 'usuario';
    }

    try {
        $resultado = Usuarios::criar($pdo, [
            'nome' => $body['nome'] ?? null,
            'email' => $body['email'] ?? null,
            'papel' => $body['papel'] ?? null,
            'grupoId' => $body['grupoId'] ?? null,
            'empresasPermitidas' => $body['empresasPermitidas'] ?? null,
            'relatoriosPermitidos' => $body['relatoriosPermitidos'] ?? null,
            'status' => 'convidado',
        ]);
        Http::sendJson(201, $resultado);
    } catch (\InvalidArgumentException $e) {
        Http::sendError(400, $e->getMessage());
    }
});

// PUT /api/usuarios/:id  { nome?, papel?, empresasPermitidas?, relatoriosPermitidos?, status? }
$router->put('/usuarios/:id', function (array $params) use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $usuario = SessionAuth::require($pdo, $config);
    if ($usuario === null) return;
    if (!exigirPapel($usuario, ['super_admin', 'admin_grupo'])) return;

    if ($usuario['papel'] === 'admin_grupo') {
        $alvo = Usuarios::buscarPorId($pdo, $params['id']);
        if (!$alvo || $alvo['grupoId'] !== $usuario['grupoId']) {
            Http::sendError(403, 'Você só pode gerenciar usuários do seu próprio grupo.');
            return;
        }
    }

    try {
        Http::sendJson(200, Usuarios::atualizar($pdo, $params['id'], Http::body()));
    } catch (\InvalidArgumentException $e) {
        Http::sendError(400, $e->getMessage());
    }
});

// ==================== Fase 1: Estrutura/Contas ====================
// Aceitam Bearer (Fase 2, se o usuário já logou de verdade) OU X-API-KEY
// (legado) via SessionAuth::requireEmpresasAutorizadas -- as duas costuras
// (VITE_USE_BACKEND_SESSAO e VITE_USE_BACKEND_ESTRUTURA) ligam independente.

// GET /api/contabil/empresas
$router->get('/contabil/empresas', function () use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $empresasAutorizadas = SessionAuth::requireEmpresasAutorizadas($pdo, $config);
    if ($empresasAutorizadas === null) return;
    Http::sendJson(200, ['empresas' => $empresasAutorizadas]);
});

// GET /api/contabil/estrutura?empresa=&relatorio=
$router->get('/contabil/estrutura', function () use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $empresasAutorizadas = SessionAuth::requireEmpresasAutorizadas($pdo, $config);
    if ($empresasAutorizadas === null) return;
    $empresa = Utils::parseEmpresa($empresasAutorizadas);
    if ($empresa === null) return;
    $relatorio = parseRelatorioRota();
    if ($relatorio === null) return;

    Http::sendJson(200, Estruturas::getEstrutura($pdo, $empresa, $relatorio));
});

// POST /api/contabil/estrutura?empresa=  { relatorio, nome, parentId, sinal }
$router->post('/contabil/estrutura', function () use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $empresasAutorizadas = SessionAuth::requireEmpresasAutorizadas($pdo, $config);
    if ($empresasAutorizadas === null) return;
    $empresa = Utils::parseEmpresa($empresasAutorizadas);
    if ($empresa === null) return;
    $relatorio = parseRelatorioRota();
    if ($relatorio === null) return;

    try {
        $no = Estruturas::addNode($pdo, $empresa, $relatorio, Http::body());
        Http::sendJson(201, $no);
    } catch (\InvalidArgumentException $e) {
        Http::sendError(400, $e->getMessage());
    }
});

// PUT /api/contabil/estrutura/:id?empresa=&relatorio=  { nome?, sinal? }
$router->put('/contabil/estrutura/:id', function (array $params) use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $empresasAutorizadas = SessionAuth::requireEmpresasAutorizadas($pdo, $config);
    if ($empresasAutorizadas === null) return;
    $empresa = Utils::parseEmpresa($empresasAutorizadas);
    if ($empresa === null) return;
    $relatorio = parseRelatorioRota();
    if ($relatorio === null) return;

    try {
        $no = Estruturas::updateNode($pdo, $empresa, $relatorio, $params['id'], Http::body());
        Http::sendJson(200, $no);
    } catch (\InvalidArgumentException $e) {
        Http::sendError(400, $e->getMessage());
    }
});

// POST /api/contabil/estrutura/:id/mover?empresa=&relatorio=  { direcao }
$router->post('/contabil/estrutura/:id/mover', function (array $params) use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $empresasAutorizadas = SessionAuth::requireEmpresasAutorizadas($pdo, $config);
    if ($empresasAutorizadas === null) return;
    $empresa = Utils::parseEmpresa($empresasAutorizadas);
    if ($empresa === null) return;
    $relatorio = parseRelatorioRota();
    if ($relatorio === null) return;

    try {
        $irmaos = Estruturas::moveNode($pdo, $empresa, $relatorio, $params['id'], Http::body()['direcao'] ?? null);
        Http::sendJson(200, $irmaos);
    } catch (\InvalidArgumentException $e) {
        Http::sendError(400, $e->getMessage());
    }
});

// DELETE /api/contabil/estrutura/:id?empresa=&relatorio=
$router->delete('/contabil/estrutura/:id', function (array $params) use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $empresasAutorizadas = SessionAuth::requireEmpresasAutorizadas($pdo, $config);
    if ($empresasAutorizadas === null) return;
    $empresa = Utils::parseEmpresa($empresasAutorizadas);
    if ($empresa === null) return;
    $relatorio = parseRelatorioRota();
    if ($relatorio === null) return;

    try {
        $idsRemovidos = Estruturas::deleteNode($pdo, $empresa, $relatorio, $params['id']);
        Classificacoes::removerTagsDeNode($pdo, $empresa, $idsRemovidos);
        Http::sendJson(200, ['idsRemovidos' => $idsRemovidos]);
    } catch (\InvalidArgumentException $e) {
        Http::sendError(400, $e->getMessage());
    }
});

// GET /api/contabil/contas?empresa=
$router->get('/contabil/contas', function () use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $empresasAutorizadas = SessionAuth::requireEmpresasAutorizadas($pdo, $config);
    if ($empresasAutorizadas === null) return;
    $empresa = Utils::parseEmpresa($empresasAutorizadas);
    if ($empresa === null) return;

    try {
        $contasUnicas = PowerBI::queryContasUnicas($pdo, $config, $empresa);
    } catch (PowerBIException $e) {
        Utils::handlePowerBIError($e, 'Falha ao consultar contas.');
        return;
    }

    $regrasPorConta = [];
    foreach (Classificacoes::getEmpresa($pdo, $empresa) as $regra) {
        $regrasPorConta[$regra['conta']][] = $regra;
    }

    $contas = array_map(fn (array $linha) => [
        'conta' => $linha['conta'],
        'descricaoConta' => $linha['descricaoConta'],
        'regras' => $regrasPorConta[$linha['conta']] ?? [],
    ], $contasUnicas);

    Http::sendJson(200, $contas);
});

// POST /api/contabil/contas/:conta/regras?empresa=
$router->post('/contabil/contas/:conta/regras', function (array $params) use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $empresasAutorizadas = SessionAuth::requireEmpresasAutorizadas($pdo, $config);
    if ($empresasAutorizadas === null) return;
    $empresa = Utils::parseEmpresa($empresasAutorizadas);
    if ($empresa === null) return;

    $body = Http::body();
    try {
        $salvo = Classificacoes::upsertRegra($pdo, $empresa, [
            'conta' => $params['conta'],
            'natureza' => $body['natureza'] ?? null,
            'centroCusto' => $body['centroCusto'] ?? null,
            'tags' => $body['tags'] ?? [],
        ]);
        Http::sendJson(201, $salvo);
    } catch (\InvalidArgumentException $e) {
        Http::sendError(400, $e->getMessage());
    }
});

// PUT /api/contabil/contas/:conta/regras/:regraId?empresa=
$router->put('/contabil/contas/:conta/regras/:regraId', function (array $params) use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $empresasAutorizadas = SessionAuth::requireEmpresasAutorizadas($pdo, $config);
    if ($empresasAutorizadas === null) return;
    $empresa = Utils::parseEmpresa($empresasAutorizadas);
    if ($empresa === null) return;

    $body = Http::body();
    try {
        $salvo = Classificacoes::upsertRegra($pdo, $empresa, [
            'id' => $params['regraId'],
            'conta' => $params['conta'],
            'natureza' => $body['natureza'] ?? null,
            'centroCusto' => $body['centroCusto'] ?? null,
            'tags' => $body['tags'] ?? [],
        ]);
        Http::sendJson(200, $salvo);
    } catch (\InvalidArgumentException $e) {
        Http::sendError(400, $e->getMessage());
    }
});

// DELETE /api/contabil/contas/:conta/regras/:regraId?empresa=
$router->delete('/contabil/contas/:conta/regras/:regraId', function (array $params) use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $empresasAutorizadas = SessionAuth::requireEmpresasAutorizadas($pdo, $config);
    if ($empresasAutorizadas === null) return;
    $empresa = Utils::parseEmpresa($empresasAutorizadas);
    if ($empresa === null) return;

    $existia = Classificacoes::deleteRegra($pdo, $empresa, $params['regraId']);
    if (!$existia) {
        Http::sendError(404, 'Regra não encontrada.');
        return;
    }
    Http::sendJson(200, ['ok' => true]);
});

// POST /api/contabil/contas/copiar  { empresaOrigem, empresaDestino }
$router->post('/contabil/contas/copiar', function () use ($config): void {
    $pdo = Db::pdo($config['DB']);
    $empresasAutorizadas = SessionAuth::requireEmpresasAutorizadas($pdo, $config);
    if ($empresasAutorizadas === null) return;

    $body = Http::body();
    $empresaOrigem = $body['empresaOrigem'] ?? null;
    $empresaDestino = $body['empresaDestino'] ?? null;

    if (!$empresaOrigem || !$empresaDestino) {
        Http::sendError(400, 'Parâmetros "empresaOrigem" e "empresaDestino" são obrigatórios.');
        return;
    }
    if ($empresaOrigem === $empresaDestino) {
        Http::sendError(400, 'Empresa de origem e destino devem ser diferentes.');
        return;
    }
    if (!in_array($empresaOrigem, $empresasAutorizadas, true) || !in_array($empresaDestino, $empresasAutorizadas, true)) {
        Http::sendError(403, 'Empresa de origem ou destino não está autorizada para este usuário.');
        return;
    }

    $mapeamento = Estruturas::copyEmpresaComMapeamento($pdo, $empresaOrigem, $empresaDestino);
    $regras = Classificacoes::copyEmpresa($pdo, $empresaOrigem, $empresaDestino, $mapeamento);
    Http::sendJson(200, ['empresa' => $empresaDestino, 'contasCopiadas' => count($regras)]);
});
