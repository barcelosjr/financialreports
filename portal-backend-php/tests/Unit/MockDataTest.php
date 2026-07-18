<?php
declare(strict_types=1);

namespace Tests\Unit;

use App\MockData;
use PHPUnit\Framework\TestCase;

final class MockDataTest extends TestCase
{
    public function testContasUnicasFiltraDeduplicaEOrdenaPorEmpresa(): void
    {
        $contas = MockData::contasUnicas('001');

        $this->assertSame(
            [
                ['conta' => '3.1.01.001', 'descricaoConta' => 'Receita de Vendas'],
                ['conta' => '4.1.02.010', 'descricaoConta' => 'Despesas Administrativas'],
            ],
            $contas
        );
    }

    public function testEmpresaSemLancamentosRetornaListaVazia(): void
    {
        $this->assertSame([], MockData::contasUnicas('999'));
    }
}
