<?php
declare(strict_types=1);

namespace App;

/**
 * Dados fictícios usados quando MOCK_MODE=true no config.php, espelhando
 * mockData.js do Node -- mesmas empresas/contas, para testar "Importar
 * plano de contas" sem credencial Azure.
 */
class MockData
{
    private const LANCAMENTOS = [
        ['EMPRESA' => '001', 'CONTA' => '3.1.01.001', 'DESCRICAO_CONTA' => 'Receita de Vendas'],
        ['EMPRESA' => '001', 'CONTA' => '4.1.02.010', 'DESCRICAO_CONTA' => 'Despesas Administrativas'],
        ['EMPRESA' => '002', 'CONTA' => '3.1.01.001', 'DESCRICAO_CONTA' => 'Receita de Vendas'],
    ];

    /** @return array<int, array{conta:string, descricaoConta:string}> */
    public static function contasUnicas(string $empresa): array
    {
        $vistos = [];
        foreach (self::LANCAMENTOS as $linha) {
            if ($linha['EMPRESA'] !== $empresa) {
                continue;
            }
            if (!isset($vistos[$linha['CONTA']])) {
                $vistos[$linha['CONTA']] = $linha['DESCRICAO_CONTA'];
            }
        }
        ksort($vistos);

        $out = [];
        foreach ($vistos as $conta => $descricao) {
            $out[] = ['conta' => $conta, 'descricaoConta' => $descricao];
        }
        return $out;
    }
}
