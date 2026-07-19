<?php
declare(strict_types=1);

namespace App;

/**
 * Autenticação por sessão real (JWT), Fase 2 -- espelha o padrão de
 * ApiKeyAuth::require: em caso de falha, já escreve a resposta e devolve
 * null (chamador retorna cedo).
 */
class SessionAuth
{
    public static function require(\PDO $pdo, array $config): ?array
    {
        $authHeader = Http::header('Authorization');
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            Http::sendError(401, 'Header Authorization: Bearer é obrigatório.');
            return null;
        }
        $token = substr($authHeader, 7);

        try {
            $payload = Jwt::decode($token, $config['JWT_SECRET']);
        } catch (\InvalidArgumentException) {
            Http::sendError(401, 'Token inválido ou expirado.');
            return null;
        }

        $usuario = Usuarios::buscarPorId($pdo, (string) ($payload['sub'] ?? ''));
        if (!$usuario || $usuario['status'] !== 'ativo') {
            Http::sendError(401, 'Usuário não encontrado ou inativo.');
            return null;
        }

        return $usuario;
    }

    /**
     * Auth "flexível" das rotas de estrutura/contas (Fase 1): aceita Bearer
     * (Fase 2, se o header vier) OU X-API-KEY (legado) -- as duas costuras
     * (VITE_USE_BACKEND_SESSAO e VITE_USE_BACKEND_ESTRUTURA) continuam
     * ligáveis de forma independente, sem uma quebrar a outra.
     *
     * @return array<int,string>|null Códigos de empresa autorizados.
     */
    public static function requireEmpresasAutorizadas(\PDO $pdo, array $config): ?array
    {
        if (Http::header('Authorization')) {
            $usuario = self::require($pdo, $config);
            if ($usuario === null) {
                return null;
            }
            return Tenancy::codigosAutorizados($pdo, $usuario);
        }

        $auth = ApiKeyAuth::require($config['CLIENTS']);
        if ($auth === null) {
            return null;
        }
        return $auth['empresas'];
    }
}
