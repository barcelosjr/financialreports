<?php
declare(strict_types=1);

namespace Tests\Integration;

use PHPUnit\Framework\TestCase;
use Tests\Support\ApiClient;
use Tests\Support\AuthHelper;
use Tests\Support\DbHelper;
use Tests\Support\TestServer;

/**
 * Confirma que /api/contabil/estrutura e /contas aceitam Bearer (Fase 2),
 * não só X-API-KEY (Fase 1) -- ver SessionAuth::requireEmpresasAutorizadas.
 */
final class EstruturaBearerAuthTest extends TestCase
{
    public static function setUpBeforeClass(): void
    {
        TestServer::ensureRunning();
    }

    protected function setUp(): void
    {
        DbHelper::reset();
    }

    public function testGetEstruturaComBearerDeSuperAdminFunciona(): void
    {
        $admin = AuthHelper::bootstrap();
        $grupo = ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo X', 'plano' => 'Essencial']]);
        ApiClient::post('/grupos/' . $grupo['body']['id'] . '/empresas', [
            'apiKey' => null, 'bearer' => $admin['token'], 'body' => ['codigo' => '001', 'nome' => 'Empresa X'],
        ]);

        $res = ApiClient::get('/contabil/estrutura', [
            'apiKey' => null, 'bearer' => $admin['token'], 'params' => ['empresa' => '001', 'relatorio' => 'dre'],
        ]);
        $this->assertSame(200, $res['status']);
        $this->assertSame([], $res['body']);
    }

    public function testGetEstruturaComBearerDeEmpresaForaDoEscopoRetorna403(): void
    {
        $admin = AuthHelper::bootstrap();
        $grupoA = ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo A', 'plano' => 'Essencial']]);
        $grupoB = ApiClient::post('/grupos', ['apiKey' => null, 'bearer' => $admin['token'], 'body' => ['nome' => 'Grupo B', 'plano' => 'Essencial']]);
        ApiClient::post('/grupos/' . $grupoA['body']['id'] . '/empresas', [
            'apiKey' => null, 'bearer' => $admin['token'], 'body' => ['codigo' => '001', 'nome' => 'Empresa A'],
        ]);
        ApiClient::post('/grupos/' . $grupoB['body']['id'] . '/empresas', [
            'apiKey' => null, 'bearer' => $admin['token'], 'body' => ['codigo' => '002', 'nome' => 'Empresa B'],
        ]);

        $criarUsuarioA = ApiClient::post('/usuarios', [
            'apiKey' => null, 'bearer' => $admin['token'],
            'body' => [
                'nome' => 'Usuário A', 'email' => 'usuarioA@teste.com', 'papel' => 'usuario',
                'grupoId' => $grupoA['body']['id'], 'empresasPermitidas' => 'todas', 'relatoriosPermitidos' => ['dre'],
            ],
        ]);
        $sessaoA = AuthHelper::login('usuarioA@teste.com', $criarUsuarioA['body']['senhaTemporaria']);

        // usuário do grupo A tentando ler a empresa 002 (do grupo B) -- fora do escopo dele.
        $res = ApiClient::get('/contabil/estrutura', [
            'apiKey' => null, 'bearer' => $sessaoA['token'], 'params' => ['empresa' => '002', 'relatorio' => 'dre'],
        ]);
        $this->assertSame(403, $res['status']);
    }

    public function testGetEstruturaSemAuthAlgumaRetorna401(): void
    {
        $res = ApiClient::get('/contabil/estrutura', ['apiKey' => null, 'params' => ['empresa' => '001', 'relatorio' => 'dre']]);
        $this->assertSame(401, $res['status']);
    }
}
