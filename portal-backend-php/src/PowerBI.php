<?php
declare(strict_types=1);

namespace App;

/**
 * Consultas DAX ao Power BI. Espelha src/powerbi.js (só queryContasUnicas
 * nesta fase) -- com MOCK_MODE=true (config.php) devolve as fixtures de
 * MockData.php em vez de chamar o Azure AD/Power BI de verdade.
 */
class PowerBI
{
    /** @return array<int, array{conta:string, descricaoConta:string}> */
    public static function queryContasUnicas(\PDO $pdo, array $config, string $empresa): array
    {
        if (!empty($config['MOCK_MODE'])) {
            return MockData::contasUnicas($empresa);
        }

        $dax = 'EVALUATE SUMMARIZECOLUMNS(LANCAMENTOS[CONTA], LANCAMENTOS[DESCRICAO_CONTA], '
            . 'FILTER(LANCAMENTOS, LANCAMENTOS[EMPRESA] = "' . Utils::escapeDaxString($empresa) . '")) '
            . 'ORDER BY LANCAMENTOS[CONTA]';

        $rows = self::executeDaxQuery($pdo, $config, $dax);
        return array_map(fn (array $row) => [
            'conta' => self::coluna($row, 'CONTA'),
            'descricaoConta' => self::coluna($row, 'DESCRICAO_CONTA'),
        ], $rows);
    }

    /**
     * Chama executeQueries da API REST do Power BI. Retenta uma vez com
     * token novo se receber 401 (token expirado/inválido) -- igual ao Node.
     */
    private static function executeDaxQuery(\PDO $pdo, array $config, string $daxQuery, bool $retry = true): array
    {
        $token = Auth::getAccessToken($pdo, $config['AZURE']);
        $url = 'https://api.powerbi.com/v1.0/myorg/groups/' . $config['AZURE']['group_id']
            . '/datasets/' . $config['AZURE']['dataset_id'] . '/executeQueries';

        $payload = json_encode([
            'queries' => [['query' => $daxQuery]],
            'serializerSettings' => ['includeNulls' => true],
        ]);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $token],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
        ]);
        $respostaBruta = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $erroCurl = curl_error($ch);
        curl_close($ch);

        if ($status === 401 && $retry) {
            Auth::getAccessToken($pdo, $config['AZURE'], true);
            return self::executeDaxQuery($pdo, $config, $daxQuery, false);
        }

        if ($status === 429) {
            error_log('Power BI API retornou 429 (throttling).');
            throw new PowerBIException('Power BI API throttling (429)', 503, 'THROTTLED');
        }

        if ($respostaBruta === false || $erroCurl) {
            error_log('Power BI API indisponível ou timeout: ' . $erroCurl);
            throw new PowerBIException('Power BI API indisponível', 503, 'UNAVAILABLE');
        }

        if ($status >= 400) {
            error_log('Erro ao consultar Power BI: ' . $status . ' ' . $respostaBruta);
            throw new PowerBIException('Power BI API error (' . $status . ')', 500, 'API_ERROR');
        }

        $dados = json_decode((string) $respostaBruta, true);
        return $dados['results'][0]['tables'][0]['rows'] ?? [];
    }

    /**
     * O Power BI devolve colunas como "NomeRealDaTabela[Coluna]" -- busca
     * por sufixo "[Coluna]" (case-insensitive), igual ao Node.
     */
    private static function coluna(array $row, string $nomeColuna): mixed
    {
        $sufixo = strtolower('[' . $nomeColuna . ']');
        foreach ($row as $chave => $valor) {
            if (str_ends_with(strtolower((string) $chave), $sufixo)) {
                return $valor;
            }
        }
        return null;
    }
}
