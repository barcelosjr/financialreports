<?php
declare(strict_types=1);

namespace Tests\Integration;

use PHPUnit\Framework\TestCase;
use Tests\Support\ApiClient;
use Tests\Support\DbHelper;
use Tests\Support\TestServer;

final class EstruturaRouteTest extends TestCase
{
    public static function setUpBeforeClass(): void
    {
        TestServer::ensureRunning();
    }

    protected function setUp(): void
    {
        DbHelper::reset();
    }

    public function testGetSemXApiKeyRetorna401(): void
    {
        $res = ApiClient::get('/contabil/estrutura', ['apiKey' => null, 'params' => ['empresa' => '001', 'relatorio' => 'dre']]);
        $this->assertSame(401, $res['status']);
    }

    public function testGetSemEmpresaRetorna400(): void
    {
        $res = ApiClient::get('/contabil/estrutura', ['params' => ['relatorio' => 'dre']]);
        $this->assertSame(400, $res['status']);
    }

    public function testGetComEmpresaForaDaListaAutorizadaRetorna403(): void
    {
        $res = ApiClient::get('/contabil/estrutura', ['params' => ['empresa' => '999', 'relatorio' => 'dre']]);
        $this->assertSame(403, $res['status']);
    }

    public function testGetComRelatorioInvalidoRetorna400(): void
    {
        $res = ApiClient::get('/contabil/estrutura', ['params' => ['empresa' => '001', 'relatorio' => 'invalido']]);
        $this->assertSame(400, $res['status']);
    }

    public function testGetRetornaListaVaziaQuandoNaoHaNenhumNo(): void
    {
        $res = ApiClient::get('/contabil/estrutura', ['params' => ['empresa' => '001', 'relatorio' => 'dre']]);
        $this->assertSame(200, $res['status']);
        $this->assertSame([], $res['body']);
    }

    public function testPostCriaNoRaizComSinalPadrao(): void
    {
        $res = ApiClient::post('/contabil/estrutura', [
            'params' => ['empresa' => '001'],
            'body' => ['relatorio' => 'dre', 'nome' => 'Receita Operacional'],
        ]);
        $this->assertSame(201, $res['status']);
        $this->assertSame('Receita Operacional', $res['body']['nome']);
        $this->assertNull($res['body']['parentId']);
        $this->assertSame(0, $res['body']['ordem']);
        $this->assertSame('+', $res['body']['sinal']);
    }

    public function testPostCriaNoComSinalExplicito(): void
    {
        $res = ApiClient::post('/contabil/estrutura', [
            'params' => ['empresa' => '001'],
            'body' => ['relatorio' => 'dre', 'nome' => 'Receita Líquida', 'sinal' => '='],
        ]);
        $this->assertSame(201, $res['status']);
        $this->assertSame('=', $res['body']['sinal']);
    }

    public function testPostComSinalInvalidoRetorna400(): void
    {
        $res = ApiClient::post('/contabil/estrutura', [
            'params' => ['empresa' => '001'],
            'body' => ['relatorio' => 'dre', 'nome' => 'X', 'sinal' => '*'],
        ]);
        $this->assertSame(400, $res['status']);
    }

    public function testPostSemNomeRetorna400(): void
    {
        $res = ApiClient::post('/contabil/estrutura', [
            'params' => ['empresa' => '001'],
            'body' => ['relatorio' => 'dre'],
        ]);
        $this->assertSame(400, $res['status']);
    }

    public function testPostCriaSubitemComParentId(): void
    {
        $raiz = ApiClient::post('/contabil/estrutura', [
            'params' => ['empresa' => '001'],
            'body' => ['relatorio' => 'dre', 'nome' => 'Receita Operacional'],
        ]);
        $filho = ApiClient::post('/contabil/estrutura', [
            'params' => ['empresa' => '001'],
            'body' => ['relatorio' => 'dre', 'nome' => 'Receita de Vendas', 'parentId' => $raiz['body']['id']],
        ]);
        $this->assertSame(201, $filho['status']);
        $this->assertSame($raiz['body']['id'], $filho['body']['parentId']);
    }

    public function testPutRenomeiaONo(): void
    {
        $criado = ApiClient::post('/contabil/estrutura', [
            'params' => ['empresa' => '001'],
            'body' => ['relatorio' => 'dre', 'nome' => 'Receita'],
        ]);
        $renomeado = ApiClient::put('/contabil/estrutura/' . $criado['body']['id'], [
            'params' => ['empresa' => '001', 'relatorio' => 'dre'],
            'body' => ['nome' => 'Receita Operacional'],
        ]);
        $this->assertSame(200, $renomeado['status']);
        $this->assertSame('Receita Operacional', $renomeado['body']['nome']);
        $this->assertSame('+', $renomeado['body']['sinal']);
    }

    public function testPutAtualizaSoOSinalMantendoONome(): void
    {
        $criado = ApiClient::post('/contabil/estrutura', [
            'params' => ['empresa' => '001'],
            'body' => ['relatorio' => 'dre', 'nome' => 'Receita Líquida'],
        ]);
        $atualizado = ApiClient::put('/contabil/estrutura/' . $criado['body']['id'], [
            'params' => ['empresa' => '001', 'relatorio' => 'dre'],
            'body' => ['sinal' => '='],
        ]);
        $this->assertSame(200, $atualizado['status']);
        $this->assertSame('Receita Líquida', $atualizado['body']['nome']);
        $this->assertSame('=', $atualizado['body']['sinal']);
    }

    public function testMoverTrocaAOrdemComOIrmaoAdjacente(): void
    {
        $a = ApiClient::post('/contabil/estrutura', ['params' => ['empresa' => '001'], 'body' => ['relatorio' => 'dre', 'nome' => 'A']]);
        $b = ApiClient::post('/contabil/estrutura', ['params' => ['empresa' => '001'], 'body' => ['relatorio' => 'dre', 'nome' => 'B']]);

        $mover = ApiClient::post('/contabil/estrutura/' . $b['body']['id'] . '/mover', [
            'params' => ['empresa' => '001', 'relatorio' => 'dre'],
            'body' => ['direcao' => 'up'],
        ]);
        $this->assertSame(200, $mover['status']);

        $lista = ApiClient::get('/contabil/estrutura', ['params' => ['empresa' => '001', 'relatorio' => 'dre']]);
        $porId = array_column($lista['body'], null, 'id');
        $this->assertSame(1, $porId[$a['body']['id']]['ordem']);
        $this->assertSame(0, $porId[$b['body']['id']]['ordem']);
    }

    public function testDeleteApagaONoSeusDescendentesELimpaTagsOrfas(): void
    {
        $pai = ApiClient::post('/contabil/estrutura', ['params' => ['empresa' => '001'], 'body' => ['relatorio' => 'dre', 'nome' => 'Receita']]);
        $filho = ApiClient::post('/contabil/estrutura', [
            'params' => ['empresa' => '001'],
            'body' => ['relatorio' => 'dre', 'nome' => 'Vendas', 'parentId' => $pai['body']['id']],
        ]);

        ApiClient::post('/contabil/contas/3.1.01.001/regras', [
            'params' => ['empresa' => '001'],
            'body' => ['tags' => [['relatorio' => 'dre', 'nodeId' => $filho['body']['id']]]],
        ]);

        $apagar = ApiClient::delete('/contabil/estrutura/' . $pai['body']['id'], ['params' => ['empresa' => '001', 'relatorio' => 'dre']]);
        $this->assertSame(200, $apagar['status']);
        $idsRemovidos = $apagar['body']['idsRemovidos'];
        sort($idsRemovidos);
        $esperado = [$pai['body']['id'], $filho['body']['id']];
        sort($esperado);
        $this->assertSame($esperado, $idsRemovidos);

        $listaEstrutura = ApiClient::get('/contabil/estrutura', ['params' => ['empresa' => '001', 'relatorio' => 'dre']]);
        $this->assertSame([], $listaEstrutura['body']);

        $contas = ApiClient::get('/contabil/contas', ['params' => ['empresa' => '001']]);
        $conta = current(array_filter($contas['body'], fn ($c) => $c['conta'] === '3.1.01.001'));
        $this->assertSame([], $conta['regras'][0]['tags']);
    }
}
