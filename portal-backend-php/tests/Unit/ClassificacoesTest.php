<?php
declare(strict_types=1);

namespace Tests\Unit;

use App\Classificacoes;
use PHPUnit\Framework\TestCase;
use Tests\Support\DbHelper;

final class ClassificacoesTest extends TestCase
{
    private \PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = DbHelper::pdo();
        DbHelper::reset();
    }

    public function testGetEmpresaRetornaListaVaziaQuandoNaoHaRegra(): void
    {
        $this->assertSame([], Classificacoes::getEmpresa($this->pdo, 'KOBE'));
    }

    public function testUpsertRegraSemIdCriaNovaRegraComIdGerado(): void
    {
        $salvo = Classificacoes::upsertRegra($this->pdo, 'KOBE', [
            'conta' => '123', 'natureza' => 'D', 'tags' => [['relatorio' => 'dre', 'nodeId' => 'no-1']],
        ]);

        $this->assertIsString($salvo['id']);
        $this->assertSame('123', $salvo['conta']);
        $this->assertSame('D', $salvo['natureza']);
        $this->assertNull($salvo['centroCusto']);
        $this->assertSame([['relatorio' => 'dre', 'nodeId' => 'no-1']], $salvo['tags']);
        $this->assertSame([$salvo], Classificacoes::getEmpresa($this->pdo, 'KOBE'));
    }

    public function testUpsertRegraComIdAtualizaRegraExistente(): void
    {
        $criada = Classificacoes::upsertRegra($this->pdo, 'KOBE', ['conta' => '123', 'tags' => []]);
        $atualizada = Classificacoes::upsertRegra($this->pdo, 'KOBE', [
            'id' => $criada['id'], 'conta' => '123', 'natureza' => 'C', 'centroCusto' => '20',
            'tags' => [['relatorio' => 'balanco', 'nodeId' => 'no-2']],
        ]);

        $this->assertSame($criada['id'], $atualizada['id']);
        $this->assertSame([$atualizada], Classificacoes::getEmpresa($this->pdo, 'KOBE'));
    }

    public function testUpsertRegraComIdInexistenteLancaErro(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Classificacoes::upsertRegra($this->pdo, 'KOBE', ['id' => 'nao-existe', 'conta' => '123', 'tags' => []]);
    }

    public function testUpsertRegraValidaContaObrigatoria(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Classificacoes::upsertRegra($this->pdo, 'KOBE', ['tags' => []]);
    }

    public function testUpsertRegraValidaNatureza(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Classificacoes::upsertRegra($this->pdo, 'KOBE', ['conta' => '123', 'natureza' => 'X', 'tags' => []]);
    }

    public function testUpsertRegraValidaRelatorioDaTag(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Classificacoes::upsertRegra($this->pdo, 'KOBE', [
            'conta' => '123', 'tags' => [['relatorio' => 'invalido', 'nodeId' => 'no-1']],
        ]);
    }

    public function testDeleteRegraRemoveERetornaTrueOuFalseSeJaNaoExistia(): void
    {
        $regra = Classificacoes::upsertRegra($this->pdo, 'KOBE', ['conta' => '123', 'tags' => []]);

        $this->assertTrue(Classificacoes::deleteRegra($this->pdo, 'KOBE', $regra['id']));
        $this->assertSame([], Classificacoes::getEmpresa($this->pdo, 'KOBE'));
        $this->assertFalse(Classificacoes::deleteRegra($this->pdo, 'KOBE', $regra['id']));
    }

    public function testRemoverTagsDeNodeLimpaApenasAsTagsApontandoParaOsNodeIdsRemovidos(): void
    {
        $regra = Classificacoes::upsertRegra($this->pdo, 'KOBE', [
            'conta' => '123',
            'tags' => [
                ['relatorio' => 'dre', 'nodeId' => 'no-apagado'],
                ['relatorio' => 'balanco', 'nodeId' => 'no-mantido'],
            ],
        ]);

        Classificacoes::removerTagsDeNode($this->pdo, 'KOBE', ['no-apagado']);

        $atualizada = Classificacoes::getEmpresa($this->pdo, 'KOBE')[0];
        $this->assertSame($regra['id'], $atualizada['id']);
        $this->assertSame([['relatorio' => 'balanco', 'nodeId' => 'no-mantido']], $atualizada['tags']);
    }

    public function testCopyEmpresaCopiaRegrasRemapeandoOsNodeIdsDasTags(): void
    {
        Classificacoes::upsertRegra($this->pdo, 'KOBE', [
            'conta' => '123', 'natureza' => 'D',
            'tags' => [
                ['relatorio' => 'dre', 'nodeId' => 'old-1'],
                ['relatorio' => 'balanco', 'nodeId' => 'sem-mapeamento'],
            ],
        ]);

        $mapeamento = ['dre' => ['old-1' => 'new-1'], 'balanco' => [], 'fluxoCaixa' => []];
        $destino = Classificacoes::copyEmpresa($this->pdo, 'KOBE', 'ROYAL', $mapeamento);

        $this->assertCount(1, $destino);
        $this->assertSame('123', $destino[0]['conta']);
        $this->assertIsString($destino[0]['id']);
        // Tag sem mapeamento correspondente é descartada (não aponta pra lugar nenhum no destino).
        $this->assertSame([['relatorio' => 'dre', 'nodeId' => 'new-1']], $destino[0]['tags']);
        $this->assertSame($destino, Classificacoes::getEmpresa($this->pdo, 'ROYAL'));

        // Não afeta a origem.
        $this->assertCount(1, Classificacoes::getEmpresa($this->pdo, 'KOBE'));
    }
}
