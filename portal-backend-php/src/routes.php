<?php
declare(strict_types=1);

/**
 * Registro de rotas do front controller (public/index.php). Espelha
 * rota a rota o portal-backend Node (ver PLANO.md) -- mesmos caminhos,
 * mesmos códigos de status, corpo de erro { "error": "..." }.
 *
 * @var App\Router $router
 * @var array $config
 */

use App\ApiKeyAuth;
use App\Classificacoes;
use App\Db;
use App\Estruturas;
use App\Http;
use App\PowerBI;
use App\PowerBIException;
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

// GET /api/contabil/empresas
$router->get('/contabil/empresas', function () use ($config): void {
    $auth = ApiKeyAuth::require($config['CLIENTS']);
    if ($auth === null) return;
    Http::sendJson(200, ['empresas' => $auth['empresas']]);
});

// GET /api/contabil/estrutura?empresa=&relatorio=
$router->get('/contabil/estrutura', function () use ($config): void {
    $auth = ApiKeyAuth::require($config['CLIENTS']);
    if ($auth === null) return;
    $empresa = Utils::parseEmpresa($auth['empresas']);
    if ($empresa === null) return;
    $relatorio = parseRelatorioRota();
    if ($relatorio === null) return;

    Http::sendJson(200, Estruturas::getEstrutura(Db::pdo($config['DB']), $empresa, $relatorio));
});

// POST /api/contabil/estrutura?empresa=  { relatorio, nome, parentId, sinal }
$router->post('/contabil/estrutura', function () use ($config): void {
    $auth = ApiKeyAuth::require($config['CLIENTS']);
    if ($auth === null) return;
    $empresa = Utils::parseEmpresa($auth['empresas']);
    if ($empresa === null) return;
    $relatorio = parseRelatorioRota();
    if ($relatorio === null) return;

    try {
        $no = Estruturas::addNode(Db::pdo($config['DB']), $empresa, $relatorio, Http::body());
        Http::sendJson(201, $no);
    } catch (\InvalidArgumentException $e) {
        Http::sendError(400, $e->getMessage());
    }
});

// PUT /api/contabil/estrutura/:id?empresa=&relatorio=  { nome?, sinal? }
$router->put('/contabil/estrutura/:id', function (array $params) use ($config): void {
    $auth = ApiKeyAuth::require($config['CLIENTS']);
    if ($auth === null) return;
    $empresa = Utils::parseEmpresa($auth['empresas']);
    if ($empresa === null) return;
    $relatorio = parseRelatorioRota();
    if ($relatorio === null) return;

    try {
        $no = Estruturas::updateNode(Db::pdo($config['DB']), $empresa, $relatorio, $params['id'], Http::body());
        Http::sendJson(200, $no);
    } catch (\InvalidArgumentException $e) {
        Http::sendError(400, $e->getMessage());
    }
});

// POST /api/contabil/estrutura/:id/mover?empresa=&relatorio=  { direcao }
$router->post('/contabil/estrutura/:id/mover', function (array $params) use ($config): void {
    $auth = ApiKeyAuth::require($config['CLIENTS']);
    if ($auth === null) return;
    $empresa = Utils::parseEmpresa($auth['empresas']);
    if ($empresa === null) return;
    $relatorio = parseRelatorioRota();
    if ($relatorio === null) return;

    try {
        $irmaos = Estruturas::moveNode(Db::pdo($config['DB']), $empresa, $relatorio, $params['id'], Http::body()['direcao'] ?? null);
        Http::sendJson(200, $irmaos);
    } catch (\InvalidArgumentException $e) {
        Http::sendError(400, $e->getMessage());
    }
});

// DELETE /api/contabil/estrutura/:id?empresa=&relatorio=
$router->delete('/contabil/estrutura/:id', function (array $params) use ($config): void {
    $auth = ApiKeyAuth::require($config['CLIENTS']);
    if ($auth === null) return;
    $empresa = Utils::parseEmpresa($auth['empresas']);
    if ($empresa === null) return;
    $relatorio = parseRelatorioRota();
    if ($relatorio === null) return;

    try {
        $pdo = Db::pdo($config['DB']);
        $idsRemovidos = Estruturas::deleteNode($pdo, $empresa, $relatorio, $params['id']);
        Classificacoes::removerTagsDeNode($pdo, $empresa, $idsRemovidos);
        Http::sendJson(200, ['idsRemovidos' => $idsRemovidos]);
    } catch (\InvalidArgumentException $e) {
        Http::sendError(400, $e->getMessage());
    }
});

// GET /api/contabil/contas?empresa=
$router->get('/contabil/contas', function () use ($config): void {
    $auth = ApiKeyAuth::require($config['CLIENTS']);
    if ($auth === null) return;
    $empresa = Utils::parseEmpresa($auth['empresas']);
    if ($empresa === null) return;

    $pdo = Db::pdo($config['DB']);
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
    $auth = ApiKeyAuth::require($config['CLIENTS']);
    if ($auth === null) return;
    $empresa = Utils::parseEmpresa($auth['empresas']);
    if ($empresa === null) return;

    $body = Http::body();
    try {
        $salvo = Classificacoes::upsertRegra(Db::pdo($config['DB']), $empresa, [
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
    $auth = ApiKeyAuth::require($config['CLIENTS']);
    if ($auth === null) return;
    $empresa = Utils::parseEmpresa($auth['empresas']);
    if ($empresa === null) return;

    $body = Http::body();
    try {
        $salvo = Classificacoes::upsertRegra(Db::pdo($config['DB']), $empresa, [
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
    $auth = ApiKeyAuth::require($config['CLIENTS']);
    if ($auth === null) return;
    $empresa = Utils::parseEmpresa($auth['empresas']);
    if ($empresa === null) return;

    $existia = Classificacoes::deleteRegra(Db::pdo($config['DB']), $empresa, $params['regraId']);
    if (!$existia) {
        Http::sendError(404, 'Regra não encontrada.');
        return;
    }
    Http::sendJson(200, ['ok' => true]);
});

// POST /api/contabil/contas/copiar  { empresaOrigem, empresaDestino }
$router->post('/contabil/contas/copiar', function () use ($config): void {
    $auth = ApiKeyAuth::require($config['CLIENTS']);
    if ($auth === null) return;
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
    if (!in_array($empresaOrigem, $auth['empresas'], true) || !in_array($empresaDestino, $auth['empresas'], true)) {
        Http::sendError(403, 'Empresa de origem ou destino não está autorizada para esta API key.');
        return;
    }

    $pdo = Db::pdo($config['DB']);
    $mapeamento = Estruturas::copyEmpresaComMapeamento($pdo, $empresaOrigem, $empresaDestino);
    $regras = Classificacoes::copyEmpresa($pdo, $empresaOrigem, $empresaDestino, $mapeamento);
    Http::sendJson(200, ['empresa' => $empresaDestino, 'contasCopiadas' => count($regras)]);
});
