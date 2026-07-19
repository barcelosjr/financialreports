<?php
declare(strict_types=1);

namespace Tests\Support;

/** Atalhos de bootstrap/login pros testes de integração da Fase 2. */
class AuthHelper
{
    /** @return array{token:string, usuario:array} */
    public static function bootstrap(string $email = 'admin@teste.com', string $senha = 'senha123', string $nome = 'Admin Teste'): array
    {
        $res = ApiClient::post('/auth/bootstrap', ['apiKey' => null, 'body' => ['nome' => $nome, 'email' => $email, 'senha' => $senha]]);
        return $res['body'];
    }

    /** @return array{token:string, usuario:array} */
    public static function login(string $email, string $senha): array
    {
        $res = ApiClient::post('/auth/login', ['apiKey' => null, 'body' => ['email' => $email, 'senha' => $senha]]);
        return $res['body'];
    }
}
