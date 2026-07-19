<?php
declare(strict_types=1);

namespace Tests\Integration;

use PHPUnit\Framework\TestCase;
use Tests\Support\ApiClient;
use Tests\Support\AuthHelper;
use Tests\Support\DbHelper;
use Tests\Support\TestServer;

final class UsuariosRouteTest extends TestCase
{
    public static function setUpBeforeClass(): void
    {
        TestServer::ensureRunning();
    }

    protected function setUp(): void
    {
        DbHelper::reset();
    }

    private function criarUsuario(string $token, string $grupoId, string $papel, string $email): array
    {
        $criado = ApiClient::post('/usuarios', [
            'apiKey' => null, 'bearer' => $token,
            'body' => [
                'nome' => 'Fulano', 'email' => $email, 'papel' => $papel,
                'grupoId' => $grupoId, 'empresasPermitidas' => 'todas', 'relatoriosPermitidos' => ['dre', 'balanco', 'fluxoCaixa'],
            ],
        ]);
        return array_merge($criado['body'], AuthHelper::login($email, $criado['body']['senhaTemporaria']));
    }

    public function testGetUsuariosSemTokenRetorna401(): void
    {
        $res = ApiClient::get('/usuarios', ['apiKey' => null]);
        $this->assertSame(401, $res['status']);
    }

    public function testUsuarioComumNaoAcessaListaDeUsuarios(): void
    {
        $admin = AuthHelper::bootstrap();
        $grupo = ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo X', 'plano' => 'Essencial']]);
        $usuario = $this->criarUsuario($admin['token'], $grupo['body']['id'], 'usuario', 'usuario@teste.com');

        $res = ApiClient::get('/usuarios', ['apiKey' => null, 'bearer' => $usuario['token']]);
        $this->assertSame(403, $res['status']);
    }

    public function testAdminGrupoSoVeUsuariosDoProprioGrupo(): void
    {
        $admin = AuthHelper::bootstrap();
        $grupoA = ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo A', 'plano' => 'Essencial']]);
        $grupoB = ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo B', 'plano' => 'Essencial']]);

        $adminA = $this->criarUsuario($admin['token'], $grupoA['body']['id'], 'admin_grupo', 'adminA@teste.com');
        $this->criarUsuario($admin['token'], $grupoA['body']['id'], 'usuario', 'user1@teste.com');
        $this->criarUsuario($admin['token'], $grupoB['body']['id'], 'usuario', 'user2@teste.com');

        $res = ApiClient::get('/usuarios', ['apiKey' => null, 'bearer' => $adminA['token']]);
        $this->assertSame(200, $res['status']);
        // 2 usuarios do grupo A: o proprio adminA + user1 (user2 eh do grupo B).
        $this->assertCount(2, $res['body']);
        foreach ($res['body'] as $u) {
            $this->assertSame($grupoA['body']['id'], $u['grupoId']);
        }
    }

    public function testAdminGrupoCriaUsuarioForcaPapelEGrupoProprios(): void
    {
        $admin = AuthHelper::bootstrap();
        $grupoA = ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo A', 'plano' => 'Essencial']]);
        $grupoB = ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo B', 'plano' => 'Essencial']]);
        $adminA = $this->criarUsuario($admin['token'], $grupoA['body']['id'], 'admin_grupo', 'adminA@teste.com');

        // Tenta criar um admin_grupo no grupo B -- deve ser reescrito p/ usuario comum no grupo A.
        $res = ApiClient::post('/usuarios', [
            'apiKey' => null, 'bearer' => $adminA['token'],
            'body' => [
                'nome' => 'Tentativa', 'email' => 'tentativa@teste.com', 'papel' => 'admin_grupo',
                'grupoId' => $grupoB['body']['id'], 'empresasPermitidas' => 'todas', 'relatoriosPermitidos' => ['dre'],
            ],
        ]);
        $this->assertSame(201, $res['status']);
        $this->assertSame('usuario', $res['body']['usuario']['papel']);
        $this->assertSame($grupoA['body']['id'], $res['body']['usuario']['grupoId']);
    }

    public function testAdminGrupoNaoEditaUsuarioDeOutroGrupo(): void
    {
        $admin = AuthHelper::bootstrap();
        $grupoA = ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo A', 'plano' => 'Essencial']]);
        $grupoB = ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo B', 'plano' => 'Essencial']]);
        $adminA = $this->criarUsuario($admin['token'], $grupoA['body']['id'], 'admin_grupo', 'adminA@teste.com');
        $userB = $this->criarUsuario($admin['token'], $grupoB['body']['id'], 'usuario', 'userB@teste.com');

        $res = ApiClient::put('/usuarios/' . $userB['usuario']['id'], [
            'apiKey' => null, 'bearer' => $adminA['token'], 'body' => ['status' => 'inativo'],
        ]);
        $this->assertSame(403, $res['status']);
    }

    public function testSuperAdminFiltraPorGrupoId(): void
    {
        $admin = AuthHelper::bootstrap();
        $grupoA = ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo A', 'plano' => 'Essencial']]);
        $grupoB = ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo B', 'plano' => 'Essencial']]);
        $this->criarUsuario($admin['token'], $grupoA['body']['id'], 'usuario', 'userA@teste.com');
        $this->criarUsuario($admin['token'], $grupoB['body']['id'], 'usuario', 'userB@teste.com');

        $res = ApiClient::get('/usuarios', ['apiKey' => null, 'bearer' => $admin['token'], 'params' => ['grupoId' => $grupoA['body']['id']]]);
        $this->assertCount(1, $res['body']);
        $this->assertSame('userA@teste.com', $res['body'][0]['email']);
    }

    public function testAtualizarUsuarioMudaPermissoes(): void
    {
        $admin = AuthHelper::bootstrap();
        $grupo = ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo X', 'plano' => 'Essencial']]);
        $usuario = $this->criarUsuario($admin['token'], $grupo['body']['id'], 'usuario', 'usuario@teste.com');

        $res = ApiClient::put('/usuarios/' . $usuario['usuario']['id'], [
            'apiKey' => null, 'bearer' => $admin['token'],
            'body' => ['relatoriosPermitidos' => ['dre', 'balanco']],
        ]);
        $this->assertSame(200, $res['status']);
        $this->assertSame(['dre', 'balanco'], $res['body']['relatoriosPermitidos']);
    }
}
