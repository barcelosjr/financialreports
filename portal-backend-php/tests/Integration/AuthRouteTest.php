<?php
declare(strict_types=1);

namespace Tests\Integration;

use PHPUnit\Framework\TestCase;
use Tests\Support\ApiClient;
use Tests\Support\AuthHelper;
use Tests\Support\DbHelper;
use Tests\Support\TestServer;

final class AuthRouteTest extends TestCase
{
    public static function setUpBeforeClass(): void
    {
        TestServer::ensureRunning();
    }

    protected function setUp(): void
    {
        DbHelper::reset();
    }

    public function testBootstrapCriaOPrimeiroSuperAdmin(): void
    {
        $res = ApiClient::post('/auth/bootstrap', ['apiKey' => null, 'body' => ['nome' => 'Julio', 'email' => 'julio@teste.com', 'senha' => 'senha123']]);

        $this->assertSame(201, $res['status']);
        $this->assertNotEmpty($res['body']['token']);
        $this->assertSame('super_admin', $res['body']['usuario']['papel']);
        $this->assertSame('todas', $res['body']['usuario']['empresasPermitidas']);
        $this->assertSame('ativo', $res['body']['usuario']['status']);
    }

    public function testBootstrapSoFuncionaUmaVez(): void
    {
        AuthHelper::bootstrap();
        $segunda = ApiClient::post('/auth/bootstrap', ['apiKey' => null, 'body' => ['nome' => 'Outro', 'email' => 'outro@teste.com', 'senha' => 'senha123']]);
        $this->assertSame(403, $segunda['status']);
    }

    public function testBootstrapValidaCamposObrigatorios(): void
    {
        $res = ApiClient::post('/auth/bootstrap', ['apiKey' => null, 'body' => ['nome' => 'Julio']]);
        $this->assertSame(400, $res['status']);
    }

    public function testLoginComCredenciaisInvalidasRetorna401(): void
    {
        AuthHelper::bootstrap('julio@teste.com', 'senha123');
        $res = ApiClient::post('/auth/login', ['apiKey' => null, 'body' => ['email' => 'julio@teste.com', 'senha' => 'errada']]);
        $this->assertSame(401, $res['status']);
    }

    public function testLoginComSucessoRetornaTokenEUsuario(): void
    {
        AuthHelper::bootstrap('julio@teste.com', 'senha123');
        $res = ApiClient::post('/auth/login', ['apiKey' => null, 'body' => ['email' => 'julio@teste.com', 'senha' => 'senha123']]);
        $this->assertSame(200, $res['status']);
        $this->assertNotEmpty($res['body']['token']);
        $this->assertSame('julio@teste.com', $res['body']['usuario']['email']);
    }

    public function testMeSemTokenRetorna401(): void
    {
        $res = ApiClient::get('/auth/me', ['apiKey' => null]);
        $this->assertSame(401, $res['status']);
    }

    public function testMeComTokenInvalidoRetorna401(): void
    {
        $res = ApiClient::get('/auth/me', ['apiKey' => null, 'bearer' => 'token-invalido']);
        $this->assertSame(401, $res['status']);
    }

    public function testMeComTokenValidoRetornaOUsuario(): void
    {
        $sessao = AuthHelper::bootstrap('julio@teste.com', 'senha123');
        $res = ApiClient::get('/auth/me', ['apiKey' => null, 'bearer' => $sessao['token']]);
        $this->assertSame(200, $res['status']);
        $this->assertSame('julio@teste.com', $res['body']['usuario']['email']);
    }

    public function testUsuarioConvidadoConsegueLogarNaPrimeiraVezEViraAtivo(): void
    {
        $admin = AuthHelper::bootstrap();
        $grupo = ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo X', 'plano' => 'Essencial']]);
        $criado = ApiClient::post('/usuarios', [
            'apiKey' => null, 'bearer' => $admin['token'],
            'body' => [
                'nome' => 'Fulano', 'email' => 'fulano@teste.com', 'papel' => 'usuario',
                'grupoId' => $grupo['body']['id'], 'empresasPermitidas' => 'todas', 'relatoriosPermitidos' => ['dre'],
            ],
        ]);
        $this->assertSame('convidado', $criado['body']['usuario']['status']);
        $senha = $criado['body']['senhaTemporaria'];
        $this->assertNotEmpty($senha);

        $login = ApiClient::post('/auth/login', ['apiKey' => null, 'body' => ['email' => 'fulano@teste.com', 'senha' => $senha]]);
        $this->assertSame(200, $login['status']);
        $this->assertSame('ativo', $login['body']['usuario']['status']);
    }

    public function testUsuarioInativoNaoConsegueLogar(): void
    {
        $admin = AuthHelper::bootstrap();
        $grupo = ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo X', 'plano' => 'Essencial']]);
        $criado = ApiClient::post('/usuarios', [
            'apiKey' => null, 'bearer' => $admin['token'],
            'body' => [
                'nome' => 'Fulano', 'email' => 'fulano@teste.com', 'papel' => 'usuario',
                'grupoId' => $grupo['body']['id'], 'empresasPermitidas' => 'todas', 'relatoriosPermitidos' => ['dre'],
            ],
        ]);
        ApiClient::put('/usuarios/' . $criado['body']['usuario']['id'], [
            'apiKey' => null, 'bearer' => $admin['token'], 'body' => ['status' => 'inativo'],
        ]);

        $login = ApiClient::post('/auth/login', ['apiKey' => null, 'body' => ['email' => 'fulano@teste.com', 'senha' => $criado['body']['senhaTemporaria']]]);
        $this->assertSame(403, $login['status']);
    }
}
