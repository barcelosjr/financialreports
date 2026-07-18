<?php
declare(strict_types=1);

namespace App;

/**
 * Helpers para ler query string, corpo JSON e headers da requisicao atual --
 * equivalente a req.query/req.body/req.get(...) do Express, sem precisar de
 * um objeto Request completo.
 */
class Http
{
    private static ?array $bodyCache = null;

    public static function query(string $key): ?string
    {
        return isset($_GET[$key]) && $_GET[$key] !== '' ? (string) $_GET[$key] : null;
    }

    /** Corpo JSON decodificado (array associativo), cacheado por request. */
    public static function body(): array
    {
        if (self::$bodyCache === null) {
            $raw = file_get_contents('php://input') ?: '';
            $decoded = $raw === '' ? [] : json_decode($raw, true);
            self::$bodyCache = is_array($decoded) ? $decoded : [];
        }
        return self::$bodyCache;
    }

    public static function header(string $name): ?string
    {
        $key = 'HTTP_' . str_replace('-', '_', strtoupper($name));
        return $_SERVER[$key] ?? null;
    }

    public static function sendJson(int $status, mixed $payload): void
    {
        http_response_code($status);
        echo json_encode($payload);
    }

    public static function sendError(int $status, string $message): void
    {
        self::sendJson($status, ['error' => $message]);
    }
}
