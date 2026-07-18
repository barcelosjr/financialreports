<?php
declare(strict_types=1);

namespace App;

/**
 * Autenticacao multi-tenant via header X-API-KEY -- espelha apiKeyAuth.js.
 * As chaves/empresas autorizadas vêm de config.php (CLIENTS) nesta fase; na
 * Fase 2 isso migra para as tabelas usuarios/grupos e vira Bearer JWT.
 */
class ApiKeyAuth
{
    /**
     * Valida o header X-API-KEY. Em caso de falha, já escreve a resposta
     * 401 e devolve null (o chamador deve checar e retornar cedo) -- sem
     * `exit`, pra ficar testável e consistente com Utils::parseEmpresa.
     *
     * @param array<string, array{cliente:string, empresas:array<int,string>}> $clients
     * @return array{cliente:string, empresas:array<int,string>}|null
     */
    public static function require(array $clients): ?array
    {
        $apiKey = Http::header('X-API-KEY');
        if (!$apiKey) {
            Http::sendError(401, 'Header X-API-KEY é obrigatório.');
            return null;
        }

        $cliente = $clients[$apiKey] ?? null;
        if ($cliente === null) {
            Http::sendError(401, 'API key inválida.');
            return null;
        }

        return $cliente;
    }
}
