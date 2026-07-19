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

        // Redireciona stdout/stderr pra arquivos, não pipes: um pipe que
        // ninguém lê enche o buffer do SO depois de umas dezenas de
        // requests (log de acesso do servidor embutido, error_log(), etc.)
        // -- daí o processo filho trava no write() esperando alguém
        // esvaziar o pipe, e como o servidor é single-threaded, toda
        // requisição seguinte fica pendurada. Arquivo não tem esse limite.
        $logDir = sys_get_temp_dir();
        $stdout = $logDir . DIRECTORY_SEPARATOR . 'portal-backend-php-test-server.out.log';
        $stderr = $logDir . DIRECTORY_SEPARATOR . 'portal-backend-php-test-server.err.log';
        $descriptors = [1 => ['file', $stdout, 'w'], 2 => ['file', $stderr, 'w']];
        // $_SERVER tem entradas não-string (ex: "argv") que o proc_open não
        // aceita como variável de ambiente -- filtra antes de repassar.
        $env = array_filter($_SERVER, static fn ($v) => is_string($v));
        $env['APP_CONFIG_PATH'] = $configPath;

        // Comando em array (não string): no Windows, string faz o proc_open
        // passar por cmd.exe, e terminar esse processo mata só o cmd.exe --
        // o php.exe filho fica órfão, preso na porta 8091, e atrapalha a
        // próxima rodada de testes (health-check bate nele e "funciona",
        // mas é código de uma rodada anterior). Array evita o cmd.exe.
        $cmd = [PHP_BINARY, '-S', '127.0.0.1:8091', '-t', $publicDir, $router];
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
            $status = proc_get_status(self::$process);
            $pid = $status['pid'] ?? null;
            if ($pid !== null && stripos(PHP_OS, 'WIN') === 0) {
                // /T mata a árvore de processos inteira -- defesa extra além
                // do comando em array já evitar o cmd.exe como intermediário.
                exec('taskkill /F /T /PID ' . (int) $pid . ' 2>NUL');
            } else {
                proc_terminate(self::$process);
            }
            proc_close(self::$process);
        }
        self::$process = null;
        self::$started = false;
    }
}
