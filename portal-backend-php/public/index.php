<?php
declare(strict_types=1);

// Em dev local, src/ e config.php ficam ao lado de public/ (um nível acima
// deste arquivo). Em produção na Hostinger, o front controller mora em
// public_html/api/ mas src/+config.php ficam FORA do web root (ver
// deploy/GUIA_SMOKE_DEPLOY.md) -- nesse caso, api/.htaccess define
// `SetEnv APP_BASE_PATH /caminho/para/app` e este arquivo usa esse caminho
// em vez do padrão relativo.
$basePath = getenv('APP_BASE_PATH') ?: (__DIR__ . '/..');

require $basePath . '/src/autoload.php';

use App\Http;
use App\Router;

header('Content-Type: application/json; charset=utf-8');

// Em testes de integração, APP_CONFIG_PATH aponta pro config.test.php (banco
// e API key dedicados) sem tocar no config.php de dev.
$configPath = getenv('APP_CONFIG_PATH') ?: ($basePath . '/config.php');
if (!file_exists($configPath)) {
    Http::sendError(500, 'config.php não encontrado. Copie config.php.example para config.php e preencha.');
    exit;
}
/** @var array $config */
$config = require $configPath;

if (!empty($config['CORS_ORIGIN'])) {
    header('Access-Control-Allow-Origin: ' . $config['CORS_ORIGIN']);
    header('Access-Control-Allow-Headers: Content-Type, X-API-KEY');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$router = new Router();
require $basePath . '/src/routes.php'; // popula $router usando $config

// O front controller mora em public_html/api/ em producao (mesma origem);
// o REQUEST_URI chega com o prefixo /api tanto em producao (pasta real)
// quanto em dev (o proxy do Vite encaminha o caminho completo). O router
// interno trabalha sem esse prefixo.
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if (str_starts_with($path, '/api')) {
    $path = substr($path, 4);
}
if ($path === '') {
    $path = '/';
}

try {
    $router->dispatch($_SERVER['REQUEST_METHOD'], $path);
} catch (\Throwable $e) {
    error_log('Erro não tratado: ' . $e);
    Http::sendError(500, 'Erro interno no servidor.');
}
