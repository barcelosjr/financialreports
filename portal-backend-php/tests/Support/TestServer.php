<?php
declare(strict_types=1);

namespace Tests\Support;

/**
 * Sobe o servidor embutido do PHP (mesmo comando de dev, apontando pro
 * config.test.php) uma única vez pro processo inteiro de testes -- os
 * testes de integração batem nele via HTTP de verdade (ApiClient), igual
 * ao supertest do Node, só que com socket real em vez de in-process.
 */
class TestServer
{
    public const BASE_URL = 'http://127.0.0.1:8091';

    /** @var resource|null */
    private static $process = null;
    private static bool $started = false;

    public static function ensureRunning(): void
    {
        if (self::$started) {
            return;
        }

        $publicDir = realpath(__DIR__ . '/../../public');
        $router = $publicDir . DIRECTORY_SEPARATOR . 'router.php';
        $configPath = realpath(__DIR__ . '/../../config.test.php');

        $descriptors = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
        // $_SERVER tem entradas não-string (ex: "argv") que o proc_open não
        // aceita como variável de ambiente -- filtra antes de repassar.
        $env = array_filter($_SERVER, static fn ($v) => is_string($v));
        $env['APP_CONFIG_PATH'] = $configPath;

        $cmd = escapeshellarg(PHP_BINARY) . ' -S 127.0.0.1:8091 -t ' . escapeshellarg($publicDir) . ' ' . escapeshellarg($router);
        $process = proc_open($cmd, $descriptors, $pipes, null, $env);

        if (!is_resource($process)) {
            throw new \RuntimeException('Não foi possível iniciar o servidor PHP de teste.');
        }
        self::$process = $process;

        $ok = false;
        for ($i = 0; $i < 50; $i++) {
            $ctx = stream_context_create(['http' => ['timeout' => 0.5, 'ignore_errors' => true]]);
            $resp = @file_get_contents(self::BASE_URL . '/api/health', false, $ctx);
            if ($resp !== false) {
                $ok = true;
                break;
            }
            usleep(100000);
        }
        if (!$ok) {
            self::stop();
            throw new \RuntimeException('Servidor PHP de teste não respondeu a tempo em ' . self::BASE_URL . '.');
        }

        self::$started = true;
        register_shutdown_function([self::class, 'stop']);
    }

    public static function stop(): void
    {
        if (self::$process !== null && is_resource(self::$process)) {
            proc_terminate(self::$process);
            proc_close(self::$process);
        }
        self::$process = null;
        self::$started = false;
    }
}
