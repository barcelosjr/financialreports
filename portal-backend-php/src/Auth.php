<?php
declare(strict_types=1);

namespace App;

/**
 * Token de acesso Azure AD (client credentials) para a API do Power BI,
 * cacheado na tabela `cache` -- não há processo persistente em shared
 * hosting para guardar isso em memória (ver PLANO.md, risco 2). Só é
 * chamado quando MOCK_MODE=false (Fase 3 em diante); em Fase 1 fica
 * inerte.
 */
class Auth
{
    private const TOKEN_KEY = 'aad_access_token';

    /** @param array{tenant_id:string,client_id:string,client_secret:string} $azureConfig */
    public static function getAccessToken(\PDO $pdo, array $azureConfig, bool $forceRefresh = false): string
    {
        if (!$forceRefresh) {
            $cached = Cache::get($pdo, self::TOKEN_KEY);
            if ($cached !== null) {
                return $cached;
            }
        }
        return self::requestNewToken($pdo, $azureConfig);
    }

    private static function requestNewToken(\PDO $pdo, array $azureConfig): string
    {
        $url = 'https://login.microsoftonline.com/' . $azureConfig['tenant_id'] . '/oauth2/v2.0/token';
        $body = http_build_query([
            'grant_type' => 'client_credentials',
            'client_id' => $azureConfig['client_id'],
            'client_secret' => $azureConfig['client_secret'],
            'scope' => 'https://analysis.windows.net/powerbi/api/.default',
        ]);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
        ]);
        $respostaBruta = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $erroCurl = curl_error($ch);
        curl_close($ch);

        // Nunca logar $body (contém o client secret).
        if ($respostaBruta === false || $status >= 400) {
            error_log('Falha ao autenticar no Azure AD: ' . $status . ' ' . $erroCurl);
            throw new PowerBIException('Falha ao autenticar no Azure AD.', 500, 'API_ERROR');
        }

        $dados = json_decode((string) $respostaBruta, true);
        $accessToken = $dados['access_token'] ?? null;
        $expiresIn = (int) ($dados['expires_in'] ?? 3600);
        if (!$accessToken) {
            throw new PowerBIException('Falha ao autenticar no Azure AD.', 500, 'API_ERROR');
        }

        // Reaproveita o token até ~1 minuto antes de expirar.
        $safeTTL = max(60, $expiresIn - 60);
        Cache::set($pdo, self::TOKEN_KEY, $accessToken, $safeTTL);
        return $accessToken;
    }
}
