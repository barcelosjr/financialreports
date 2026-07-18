<?php
declare(strict_types=1);

namespace Tests\Integration;

use PHPUnit\Framework\TestCase;
use Tests\Support\ApiClient;
use Tests\Support\DbHelper;
use Tests\Support\TestServer;

final class ContasRouteTest extends TestCase
{
    public static function setUpBeforeClass(): void
    {
        TestServer::ensureRunning();
    }

    protected function setUp(): void
    {
        DbHelper::reset();
    }

    public function testGetEmpresasSemXApiKeyRetorna401(): void
    {
        $res = ApiClient::get('/contabil/empresas', ['apiKey' => null]);
        $this->assertSame(401, $res['status']);
    }

    public function testGetEmpresasRetornaAsAutorizadasParaAApiKey(): void
    {
        $res = ApiClient::get('/contabil/empresas');
        $this->assertSame(200, $res['status']);
        $this->assertSame(['empresas' => ['001', '002']], $res['body']);
    }

    public function testGetContasSemXApiKeyRetorna401(): void
    {
        $res = ApiClient::get('/contabil/contas', ['apiKey' => null, 'params' => ['empresa' => '001']]);
        $this->assertSame(401, $res['status']);
    }

    public function testGetContasSemEmpresaRetorna400(): void
    {
        $res = ApiClient::get('/contabil/contas');
        $this->assertSame(400, $res['status']);
    }

    public function testGetContasComEmpresaForaDaListaRetorna403(): void
    {
        $res = ApiClient::get('/contabil/contas', ['params' => ['empresa' => '999']]);
        $this->assertSame(403, $res['status']);
    }

    public function testGetContasListaAsContasUnicasDaEmpresaAindaSemRegras(): void
    {
        $res = ApiClient::get('/contabil/contas', ['params' => ['empresa' => '001']]);
        $this->assertSame(200, $res['status']);
        $this->assertSame(
            [
                ['conta' => '3.1.01.001', 'descricaoConta' => 'Receita de Vendas', 'regras' => []],
                ['conta' => '4.1.02.010', 'descricaoConta' => 'Despesas Administrativas', 'regras' => []],
            ],
            $res['body']
        );
    }

    public function testPostRegraSemEmpresaRetorna400(): void
    {
        $res = ApiClient::post('/contabil/contas/3.1.01.001/regras', ['body' => ['tags' => []]]);
        $this->assertSame(400, $res['status']);
    }

    public function testPostRegraComEmpresaForaDaListaRetorna403(): void
    {
        $res = ApiClient::post('/contabil/contas/3.1.01.001/regras', ['params' => ['empresa' => '999'], 'body' => ['tags' => []]]);
        $this->assertSame(403, $res['status']);
    }

    public function testPostRegraComNaturezaInvalidaRetorna400(): void
    {
        $res = ApiClient::post('/contabil/contas/3.1.01.001/regras', [
            'params' => ['empresa' => '001'],
            'body' => ['natureza' => 'X', 'tags' => []],
        ]);
        $this->assertSame(400, $res['status']);
    }

    public function testPostRegraCriaERefleteNaProximaListagem(): void
    {
        $criar = ApiClient::post('/contabil/contas/3.1.01.001/regras', [
            'params' => ['empresa' => '001'],
            'body' => ['natureza' => 'D', 'tags' => [['relatorio' => 'dre', 'nodeId' => 'no-1']]],
        ]);
        $this->assertSame(201, $criar['status']);
        $this->assertSame('3.1.01.001', $criar['body']['conta']);
        $this->assertSame('D', $criar['body']['natureza']);
        $this->assertNull($criar['body']['centroCusto']);

        $listar = ApiClient::get('/contabil/contas', ['params' => ['empresa' => '001']]);
        $conta = current(array_filter($listar['body'], fn ($c) => $c['conta'] === '3.1.01.001'));
        $this->assertSame('D', $conta['regras'][0]['natureza']);
    }

    public function testPutAtualizaUmaRegraExistente(): void
    {
        $criar = ApiClient::post('/contabil/contas/3.1.01.001/regras', ['params' => ['empresa' => '001'], 'body' => ['tags' => []]]);
        $regraId = $criar['body']['id'];

        $atualizar = ApiClient::put('/contabil/contas/3.1.01.001/regras/' . $regraId, [
            'params' => ['empresa' => '001'],
            'body' => ['centroCusto' => '20', 'tags' => [['relatorio' => 'balanco', 'nodeId' => 'no-2']]],
        ]);
        $this->assertSame(200, $atualizar['status']);
        $this->assertSame($regraId, $atualizar['body']['id']);
        $this->assertSame('20', $atualizar['body']['centroCusto']);
    }

    public function testDeleteRegraRemoveE404SeJaNaoExistir(): void
    {
        $criar = ApiClient::post('/contabil/contas/3.1.01.001/regras', ['params' => ['empresa' => '001'], 'body' => ['tags' => []]]);
        $regraId = $criar['body']['id'];

        $apagar = ApiClient::delete('/contabil/contas/3.1.01.001/regras/' . $regraId, ['params' => ['empresa' => '001']]);
        $this->assertSame(200, $apagar['status']);

        $apagarDeNovo = ApiClient::delete('/contabil/contas/3.1.01.001/regras/' . $regraId, ['params' => ['empresa' => '001']]);
        $this->assertSame(404, $apagarDeNovo['status']);
    }

    public function testCopiarSemEmpresaOrigemDestinoRetorna400(): void
    {
        $res = ApiClient::post('/contabil/contas/copiar', ['body' => (object) []]);
        $this->assertSame(400, $res['status']);
    }

    public function testCopiarOrigemIgualDestinoRetorna400(): void
    {
        $res = ApiClient::post('/contabil/contas/copiar', ['body' => ['empresaOrigem' => '001', 'empresaDestino' => '001']]);
        $this->assertSame(400, $res['status']);
    }

    public function testCopiarEmpresaNaoAutorizadaRetorna403(): void
    {
        $res = ApiClient::post('/contabil/contas/copiar', ['body' => ['empresaOrigem' => '001', 'empresaDestino' => '999']]);
        $this->assertSame(403, $res['status']);
    }

    public function testCopiarCopiaEstruturaERegrasDaOrigemParaODestinoRemapeandoAsTags(): void
    {
        $criarNo = ApiClient::post('/contabil/estrutura', [
            'params' => ['empresa' => '001'],
            'body' => ['relatorio' => 'dre', 'nome' => 'Receita Operacional'],
        ]);
        $nodeId = $criarNo['body']['id'];

        ApiClient::post('/contabil/contas/3.1.01.001/regras', [
            'params' => ['empresa' => '001'],
            'body' => ['tags' => [['relatorio' => 'dre', 'nodeId' => $nodeId]]],
        ]);

        $copiar = ApiClient::post('/contabil/contas/copiar', ['body' => ['empresaOrigem' => '001', 'empresaDestino' => '002']]);
        $this->assertSame(200, $copiar['status']);
        $this->assertSame(['empresa' => '002', 'contasCopiadas' => 1], $copiar['body']);

        $estruturaDestino = ApiClient::get('/contabil/estrutura', ['params' => ['empresa' => '002', 'relatorio' => 'dre']]);
        $this->assertCount(1, $estruturaDestino['body']);
        $novoNodeId = $estruturaDestino['body'][0]['id'];
        $this->assertNotSame($nodeId, $novoNodeId);

        $listar = ApiClient::get('/contabil/contas', ['params' => ['empresa' => '002']]);
        $conta = current(array_filter($listar['body'], fn ($c) => $c['conta'] === '3.1.01.001'));
        $this->assertSame([['relatorio' => 'dre', 'nodeId' => $novoNodeId]], $conta['regras'][0]['tags']);
    }
}
