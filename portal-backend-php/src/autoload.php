<?php
declare(strict_types=1);

// Autoloader manual (PSR-4 simplificado para o namespace App\) -- evita
// depender de `composer install` para rodar localmente. Quando o Composer
// entrar (Fase 2, para firebase/php-jwt), isto pode virar so um require de
// vendor/autoload.php; ate la, mantem o esqueleto rodando com zero deps.
spl_autoload_register(function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $file = __DIR__ . '/' . str_replace('\\', '/', $relative) . '.php';
    if (file_exists($file)) {
        require $file;
    }
});
