<?php
declare(strict_types=1);

namespace Tests\Unit;

use App\Estruturas;
use PHPUnit\Framework\TestCase;
use Tests\Support\DbHelper;

final class EstruturasTest extends TestCase
{
    private \PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = DbHelper::pdo();
        DbHelper::reset();
    }

    public function testGetEstruturaRetornaListaVaziaQuandoNaoHaNenhumNo(): void
    {
        $this->assertSame([], Estruturas::getEstrutura($this->pdo, 'KOBE', 'dre'));
    }

    public function testGetEstruturaRejeitaRelatorioInvalido(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Estruturas::getEstrutura($this->pdo, 'KOBE', 'invalido');
    }

    public function testAddNodeCriaNoRaizComOrdemIncrementalESinalPadrao(): void
    {
        $a = Estruturas::addNode($this->pdo, 'KOBE', 'dre', ['nome' => 'Receita']);
        $b = Estruturas::addNode($this->pdo, 'KOBE', 'dre', ['nome' => 'Despesa', 'sinal' => '-']);

        $this->assertNull($a['parentId']);
        $this->assertSame(0, $a['ordem']);
        $this->assertSame('+', $a['sinal']);
        $this->assertSame(1, $b['ordem']);
        $this->assertSame('-', $b['sinal']);
        $this->assertCount(2, Estruturas::getEstrutura($this->pdo, 'KOBE', 'dre'));
    }

    public function testAddNodeRejeitaSinalInvalido(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Estruturas::addNode($this->pdo, 'KOBE', 'dre', ['nome' => 'X', 'sinal' => '*']);
    }

    public function testAddNodeComParentIdInexistenteLancaErro(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Estruturas::addNode($this->pdo, 'KOBE', 'dre', ['nome' => 'X', 'parentId' => 'nao-existe']);
    }

    public function testAddNodeCriaSubitemFilhoDeUmNoExistente(): void
    {
        $pai = Estruturas::addNode($this->pdo, 'KOBE', 'dre', ['nome' => 'Receita']);
        $filho = Estruturas::addNode($this->pdo, 'KOBE', 'dre', ['nome' => 'Vendas', 'parentId' => $pai['id']]);

        $this->assertSame($pai['id'], $filho['parentId']);
        $this->assertSame(0, $filho['ordem']);
    }

    public function testUpdateNodeAtualizaNomeMantendoOResto(): void
    {
        $no = Estruturas::addNode($this->pdo, 'KOBE', 'dre', ['nome' => 'Receita']);
        $renomeado = Estruturas::updateNode($this->pdo, 'KOBE', 'dre', $no['id'], ['nome' => 'Receita Operacional']);

        $this->assertSame([...$no, 'nome' => 'Receita Operacional'], $renomeado);
    }

    public function testUpdateNodeAtualizaSoOSinalQuandoNomeNaoEInformado(): void
    {
        $no = Estruturas::addNode($this->pdo, 'KOBE', 'dre', ['nome' => 'Receita']);
        $atualizado = Estruturas::updateNode($this->pdo, 'KOBE', 'dre', $no['id'], ['sinal' => '=']);

        $this->assertSame([...$no, 'sinal' => '='], $atualizado);
    }

    public function testUpdateNodeRejeitaSinalInvalido(): void
    {
        $no = Estruturas::addNode($this->pdo, 'KOBE', 'dre', ['nome' => 'Receita']);
        $this->expectException(\InvalidArgumentException::class);
        Estruturas::updateNode($this->pdo, 'KOBE', 'dre', $no['id'], ['sinal' => '*']);
    }

    public function testUpdateNodeComIdInexistenteLancaErro(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Estruturas::updateNode($this->pdo, 'KOBE', 'dre', 'nao-existe', ['nome' => 'X']);
    }

    public function testMoveNodeTrocaAOrdemComOIrmaoAdjacente(): void
    {
        $a = Estruturas::addNode($this->pdo, 'KOBE', 'dre', ['nome' => 'A']);
        $b = Estruturas::addNode($this->pdo, 'KOBE', 'dre', ['nome' => 'B']);

        Estruturas::moveNode($this->pdo, 'KOBE', 'dre', $b['id'], 'up');

        $porId = array_column(Estruturas::getEstrutura($this->pdo, 'KOBE', 'dre'), null, 'id');
        $this->assertSame(1, $porId[$a['id']]['ordem']);
        $this->assertSame(0, $porId[$b['id']]['ordem']);
    }

    public function testMoveNodeNaPontaDaListaNaoFazNada(): void
    {
        $a = Estruturas::addNode($this->pdo, 'KOBE', 'dre', ['nome' => 'A']);
        Estruturas::moveNode($this->pdo, 'KOBE', 'dre', $a['id'], 'up');

        $nos = Estruturas::getEstrutura($this->pdo, 'KOBE', 'dre');
        $this->assertSame(0, $nos[0]['ordem']);
    }

    public function testDeleteNodeRemoveONoETodosOsDescendentesCascade(): void
    {
        $pai = Estruturas::addNode($this->pdo, 'KOBE', 'dre', ['nome' => 'Receita']);
        $filho = Estruturas::addNode($this->pdo, 'KOBE', 'dre', ['nome' => 'Vendas', 'parentId' => $pai['id']]);
        $neto = Estruturas::addNode($this->pdo, 'KOBE', 'dre', ['nome' => 'Vendas SP', 'parentId' => $filho['id']]);
        $outro = Estruturas::addNode($this->pdo, 'KOBE', 'dre', ['nome' => 'Despesa']);

        $idsRemovidos = Estruturas::deleteNode($this->pdo, 'KOBE', 'dre', $pai['id']);
        sort($idsRemovidos);
        $esperado = [$pai['id'], $filho['id'], $neto['id']];
        sort($esperado);

        $this->assertSame($esperado, $idsRemovidos);
        $this->assertSame([$outro], Estruturas::getEstrutura($this->pdo, 'KOBE', 'dre'));
    }

    public function testCopyEmpresaComMapeamentoCopiaArvoreComIdsNovosERetornaOMapeamento(): void
    {
        $pai = Estruturas::addNode($this->pdo, 'KOBE', 'dre', ['nome' => 'Receita']);
        $filho = Estruturas::addNode($this->pdo, 'KOBE', 'dre', ['nome' => 'Vendas', 'parentId' => $pai['id']]);
        Estruturas::addNode($this->pdo, 'KOBE', 'balanco', ['nome' => 'Ativo']);

        $mapeamento = Estruturas::copyEmpresaComMapeamento($this->pdo, 'KOBE', 'ROYAL');

        $dreDestino = Estruturas::getEstrutura($this->pdo, 'ROYAL', 'dre');
        $this->assertCount(2, $dreDestino);
        $paiDestino = array_values(array_filter($dreDestino, fn ($n) => $n['parentId'] === null))[0];
        $filhoDestino = array_values(array_filter($dreDestino, fn ($n) => $n['parentId'] !== null))[0];

        $this->assertSame('Receita', $paiDestino['nome']);
        $this->assertSame('Vendas', $filhoDestino['nome']);
        $this->assertSame($paiDestino['id'], $filhoDestino['parentId']);
        $this->assertNotSame($pai['id'], $paiDestino['id']);

        $this->assertSame($paiDestino['id'], $mapeamento['dre'][$pai['id']]);
        $this->assertSame($filhoDestino['id'], $mapeamento['dre'][$filho['id']]);
        $this->assertCount(1, Estruturas::getEstrutura($this->pdo, 'ROYAL', 'balanco'));
        $this->assertSame([], Estruturas::getEstrutura($this->pdo, 'ROYAL', 'fluxoCaixa'));

        // Não afeta a origem.
        $this->assertCount(2, Estruturas::getEstrutura($this->pdo, 'KOBE', 'dre'));
    }
}
