<?php
declare(strict_types=1);

namespace Tests\Integration;

use PHPUnit\Framework\TestCase;
use Tests\Support\ApiClient;
use Tests\Support\AuthHelper;
use Tests\Support\DbHelper;
use Tests\Support\TestServer;

final class GruposRouteTest extends TestCase
{
    public static function setUpBeforeClass(): void
    {
        TestServer::ensureRunning();
    }

    protected function setUp(): void
    {
        DbHelper::reset();
    }

    private function criarUsuarioComum(string $token, string $grupoId, string $email = 'usuario@teste.com'): array
    {
        $criado = ApiClient::post('/usuarios', [
            'apiKey' => null, 'bearer' => $token,
            'body' => [
                'nome' => 'Usuário Comum', 'email' => $email, 'papel' => 'usuario',
                'grupoId' => $grupoId, 'empresasPermitidas' => 'todas', 'relatoriosPermitidos' => ['dre'],
            ],
        ]);
        return AuthHelper::login($email, $criado['body']['senhaTemporaria']);
    }

    public function testGetGruposSemTokenRetorna401(): void
    {
        $res = ApiClient::get('/grupos', ['apiKey' => null]);
        $this->assertSame(401, $res['status']);
    }

    public function testPostGrupoComoUsuarioComumRetorna403(): void
    {
        $admin = AuthHelper::bootstrap();
        $grupo = ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo X', 'plano' => 'Essencial']]);
        $sessaoUsuario = $this->criarUsuarioComum($admin['token'], $grupo['body']['id']);

        $res = ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $sessaoUsuario['token'], 'body' => ['nome' => 'Outro', 'plano' => 'Essencial']]);
        $this->assertSame(403, $res['status']);
    }

    public function testSuperAdminCriaGrupoSemContratoAteAPrimeiraEmpresa(): void
    {
        $admin = AuthHelper::bootstrap();
        $criar = ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo Kobe', 'plano' => 'Essencial']]);
        $this->assertSame(201, $criar['status']);
        $this->assertNull($criar['body']['contrato']);
        $this->assertSame([], $criar['body']['empresas']);

        $empresa = ApiClient::post('/grupos/' . $criar['body']['id'] . '/empresas', [
            'apiKey' => null, 'bearer' => $admin['token'],
            'body' => ['codigo' => '001', 'nome' => 'Kobe Comércio', 'cnpj' => '12.345.678/0001-90'],
        ]);
        $this->assertSame(201, $empresa['status']);
        $this->assertSame('001', $empresa['body']['codigo']);

        $grupoAtualizado = ApiClient::get('/grupos', ['apiKey' => null, 'bearer' => $admin['token']]);
        $grupo = $grupoAtualizado['body'][0];
        $this->assertNotNull($grupo['contrato']);
        $this->assertCount(1, $grupo['empresas']);
    }

    public function testUsuarioComumVeSoOProprioGrupoEmGetGrupos(): void
    {
        $admin = AuthHelper::bootstrap();
        $grupoA = ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo A', 'plano' => 'Essencial']]);
        ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo B', 'plano' => 'Essencial']]);
        $sessaoUsuario = $this->criarUsuarioComum($admin['token'], $grupoA['body']['id']);

        $res = ApiClient::get('/grupos', ['apiKey' => null, 'bearer' => $sessaoUsuario['token']]);
        $this->assertCount(1, $res['body']);
        $this->assertSame($grupoA['body']['id'], $res['body'][0]['id']);
    }

    public function testAtualizarERemoverGrupo(): void
    {
        $admin = AuthHelper::bootstrap();
        $criar = ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo X', 'plano' => 'Essencial']]);

        $atualizar = ApiClient::put('/grupos/' . $criar['body']['id'], ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo Renomeado']]);
        $this->assertSame(200, $atualizar['status']);
        $this->assertSame('Grupo Renomeado', $atualizar['body']['nome']);

        $remover = ApiClient::delete('/grupos/' . $criar['body']['id'], ['apiKey' => null, 'bearer' => $admin['token']]);
        $this->assertSame(200, $remover['status']);

        $removerDeNovo = ApiClient::delete('/grupos/' . $criar['body']['id'], ['apiKey' => null, 'bearer' => $admin['token']]);
        $this->assertSame(404, $removerDeNovo['status']);
    }

    public function testAtualizarERemoverEmpresa(): void
    {
        $admin = AuthHelper::bootstrap();
        $grupo = ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo X', 'plano' => 'Essencial']]);
        $empresa = ApiClient::post('/grupos/' . $grupo['body']['id'] . '/empresas', [
            'apiKey' => null, 'bearer' => $admin['token'], 'body' => ['codigo' => '001', 'nome' => 'Empresa X'],
        ]);

        $atualizar = ApiClient::put('/empresas/' . $empresa['body']['id'], [
            'apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Empresa X Renomeada'],
        ]);
        $this->assertSame(200, $atualizar['status']);
        $this->assertSame('Empresa X Renomeada', $atualizar['body']['nome']);
        $this->assertNull($atualizar['body']['conexao']);

        $remover = ApiClient::delete('/empresas/' . $empresa['body']['id'], ['apiKey' => null, 'bearer' => $admin['token']]);
        $this->assertSame(200, $remover['status']);
    }
}
