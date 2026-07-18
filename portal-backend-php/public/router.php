<?php
// Router para o servidor embutido do PHP (php -S), que ao contrario do
// Apache/.htaccess nao faz fallback automatico para index.php. Uso:
//   php -S localhost:8000 -t portal-backend-php/public portal-backend-php/public/router.php
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$file = __DIR__ . $path;

if ($path !== '/' && is_file($file)) {
    return false; // deixa o servidor embutido servir o arquivo estatico
}

require __DIR__ . '/index.php';
