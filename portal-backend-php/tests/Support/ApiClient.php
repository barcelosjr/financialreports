<?php
declare(strict_types=1);

namespace Tests\Support;

/** Cliente HTTP mínimo (cURL) pros testes de integração baterem no TestServer. */
class ApiClient
{
    public const API_KEY_PADRAO = 'test-api-key-empresa-001';

    /** @return array{status:int, body:mixed} */
    public static function request(string $method, string $path, array $opts = []): array
    {
        $url = TestServer::BASE_URL . '/api' . $path;
        if (!empty($opts['params'])) {
            $url .= '?' . http_build_query($opts['params']);
        }

        $headers = [];
        $apiKey = array_key_exists('apiKey', $opts) ? $opts['apiKey'] : self::API_KEY_PADRAO;
        if ($apiKey !== null) {
            $headers[] = 'X-API-KEY: ' . $apiKey;
        }
        if (!empty($opts['bearer'])) {
            $headers[] = 'Authorization: Bearer ' . $opts['bearer'];
        }

        $body = null;
        if (array_key_exists('body', $opts)) {
            $body = json_encode($opts['body']);
            $headers[] = 'Content-Type: application/json';
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
        ]);
        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $erro = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            throw new \RuntimeException('Falha ao chamar ' . $url . ': ' . $erro);
        }

        $decoded = $raw !== '' ? json_decode($raw, true) : null;
        return ['status' => $status, 'body' => $decoded];
    }

    public static function get(string $path, array $opts = []): array
    {
        return self::request('GET', $path, $opts);
    }

    public static function post(string $path, array $opts = []): array
    {
        return self::request('POST', $path, $opts);
    }

    public static function put(string $path, array $opts = []): array
    {
        return self::request('PUT', $path, $opts);
    }

    public static function delete(string $path, array $opts = []): array
    {
        return self::request('DELETE', $path, $opts);
    }
}
