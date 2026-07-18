<?php
declare(strict_types=1);

require __DIR__ . '/../src/autoload.php';

use App\Http;
use App\Router;

header('Content-Type: application/json; charset=utf-8');

// Em testes de integração, APP_CONFIG_PATH aponta pro config.test.php (banco
// e API key dedicados) sem tocar no config.php de dev.
$configPath = getenv('APP_CONFIG_PATH') ?: __DIR__ . '/../config.php';
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
require __DIR__ . '/../src/routes.php'; // popula $router usando $config

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
