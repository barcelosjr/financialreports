<?php
declare(strict_types=1);

namespace App;

/**
 * Grupos econômicos + empresas -- espelha o shape de data/empresas.js e a
 * lógica de lib/tenant.js (chave de contrato gerada automaticamente na
 * primeira empresa cadastrada).
 */
class Grupos
{
    private const PALAVRAS_IGNORADAS = ['de', 'da', 'do', 'e'];

    /** @return array<int,array> Um grupo (buscarPorId) ou todos (listar), sempre com "empresas" aninhado. */
    public static function listar(\PDO $pdo, ?string $somenteGrupoId = null): array
    {
        if ($somenteGrupoId !== null) {
            $stmt = $pdo->prepare('SELECT * FROM grupos WHERE id = ?');
            $stmt->execute([$somenteGrupoId]);
        } else {
            $stmt = $pdo->query('SELECT * FROM grupos ORDER BY nome');
        }
        $grupos = $stmt->fetchAll();
        if ($grupos === []) {
            return [];
        }

        $ids = array_column($grupos, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $empresasStmt = $pdo->prepare("SELECT * FROM empresas WHERE grupo_id IN ($placeholders) ORDER BY codigo");
        $empresasStmt->execute($ids);

        $empresasPorGrupo = [];
        foreach ($empresasStmt->fetchAll() as $e) {
            $empresasPorGrupo[$e['grupo_id']][] = self::formatarEmpresa($e);
        }

        return array_map(fn (array $g) => self::formatarGrupo($g, $empresasPorGrupo[$g['id']] ?? []), $grupos);
    }

    public static function buscarPorId(\PDO $pdo, string $id): ?array
    {
        return self::listar($pdo, $id)[0] ?? null;
    }

    public static function criar(\PDO $pdo, array $dados): array
    {
        if (empty($dados['nome']) || !is_string($dados['nome'])) {
            throw new \InvalidArgumentException('Campo "nome" é obrigatório.');
        }
        if (empty($dados['plano']) || !is_string($dados['plano'])) {
            throw new \InvalidArgumentException('Campo "plano" é obrigatório.');
        }
        $id = Uuid::v4();
        $stmt = $pdo->prepare('INSERT INTO grupos (id, nome, contrato, plano) VALUES (?, ?, NULL, ?)');
        $stmt->execute([$id, $dados['nome'], $dados['plano']]);
        return self::buscarPorId($pdo, $id);
    }

    public static function atualizar(\PDO $pdo, string $id, array $dados): array
    {
        $atual = self::buscarPorId($pdo, $id);
        if (!$atual) {
            throw new \InvalidArgumentException('Grupo "' . $id . '" não encontrado.');
        }
        $nome = $dados['nome'] ?? $atual['nome'];
        $plano = $dados['plano'] ?? $atual['plano'];
        $pdo->prepare('UPDATE grupos SET nome = ?, plano = ? WHERE id = ?')->execute([$nome, $plano, $id]);
        return self::buscarPorId($pdo, $id);
    }

    /** Remove o grupo -- empresas e usuários vinculados vão junto (FK ON DELETE CASCADE), como já avisa a UI. */
    public static function remover(\PDO $pdo, string $id): bool
    {
        $stmt = $pdo->prepare('SELECT id FROM grupos WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            return false;
        }
        $pdo->prepare('DELETE FROM grupos WHERE id = ?')->execute([$id]);
        return true;
    }

    public static function buscarEmpresaPorId(\PDO $pdo, string $id): ?array
    {
        $stmt = $pdo->prepare('SELECT * FROM empresas WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ? self::formatarEmpresa($row) : null;
    }

    public static function adicionarEmpresa(\PDO $pdo, string $grupoId, array $dados): array
    {
        if (empty($dados['codigo']) || !is_string($dados['codigo'])) {
            throw new \InvalidArgumentException('Campo "codigo" é obrigatório.');
        }
        if (empty($dados['nome']) || !is_string($dados['nome'])) {
            throw new \InvalidArgumentException('Campo "nome" é obrigatório.');
        }
        $grupoStmt = $pdo->prepare('SELECT id, contrato, nome FROM grupos WHERE id = ?');
        $grupoStmt->execute([$grupoId]);
        $grupo = $grupoStmt->fetch();
        if (!$grupo) {
            throw new \InvalidArgumentException('Grupo "' . $grupoId . '" não encontrado.');
        }

        // A chave de contrato é gerada sozinha assim que a primeira empresa é cadastrada.
        if ($grupo['contrato'] === null) {
            $existentes = array_column($pdo->query('SELECT contrato FROM grupos WHERE contrato IS NOT NULL')->fetchAll(), 'contrato');
            $contrato = self::gerarChaveContrato($grupo['nome'], $existentes);
            $pdo->prepare('UPDATE grupos SET contrato = ? WHERE id = ?')->execute([$contrato, $grupoId]);
        }

        $c = $dados['conexao'] ?? null;
        $id = Uuid::v4();
        $stmt = $pdo->prepare(
            'INSERT INTO empresas (id, grupo_id, codigo, nome, cnpj, conexao_tipo, conexao_status, conexao_tenant_id, conexao_client_id, conexao_client_secret, conexao_group_id, conexao_dataset_id, conexao_testado_em)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $id, $grupoId, $dados['codigo'], $dados['nome'], $dados['cnpj'] ?? null,
            $c['tipo'] ?? null, $c['status'] ?? null, $c['tenantId'] ?? null, $c['clientId'] ?? null,
            $c['clientSecret'] ?? null, $c['groupId'] ?? null, $c['datasetId'] ?? null, $c['testadoEm'] ?? null,
        ]);

        return self::buscarEmpresaPorId($pdo, $id);
    }

    public static function atualizarEmpresa(\PDO $pdo, string $id, array $dados): array
    {
        $stmt = $pdo->prepare('SELECT * FROM empresas WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            throw new \InvalidArgumentException('Empresa "' . $id . '" não encontrada.');
        }

        $codigo = $dados['codigo'] ?? $row['codigo'];
        $nome = $dados['nome'] ?? $row['nome'];
        $cnpj = array_key_exists('cnpj', $dados) ? $dados['cnpj'] : $row['cnpj'];

        if (array_key_exists('conexao', $dados)) {
            $c = $dados['conexao'];
            $update = $pdo->prepare(
                'UPDATE empresas SET codigo=?, nome=?, cnpj=?, conexao_tipo=?, conexao_status=?, conexao_tenant_id=?, conexao_client_id=?, conexao_client_secret=?, conexao_group_id=?, conexao_dataset_id=?, conexao_testado_em=? WHERE id=?'
            );
            $update->execute([
                $codigo, $nome, $cnpj,
                $c['tipo'] ?? null, $c['status'] ?? null, $c['tenantId'] ?? null, $c['clientId'] ?? null,
                $c['clientSecret'] ?? null, $c['groupId'] ?? null, $c['datasetId'] ?? null, $c['testadoEm'] ?? null,
                $id,
            ]);
        } else {
            $update = $pdo->prepare('UPDATE empresas SET codigo=?, nome=?, cnpj=? WHERE id=?');
            $update->execute([$codigo, $nome, $cnpj, $id]);
        }

        return self::buscarEmpresaPorId($pdo, $id);
    }

    public static function removerEmpresa(\PDO $pdo, string $id): bool
    {
        $stmt = $pdo->prepare('SELECT id FROM empresas WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            return false;
        }
        $pdo->prepare('DELETE FROM empresas WHERE id = ?')->execute([$id]);
        return true;
    }

    /** Espelha lib/tenant.js:gerarChaveContrato -- PREFIXO-ANO-SEQUENCIAL, sem repetir. */
    private static function gerarChaveContrato(string $nomeGrupo, array $chavesExistentes): string
    {
        $palavras = array_values(array_filter(
            preg_split('/\s+/', self::removerAcentos($nomeGrupo)),
            fn (string $p) => $p !== '' && !in_array(strtolower($p), self::PALAVRAS_IGNORADAS, true)
        ));

        $primeira = $palavras[0] ?? 'G';
        $segunda = $palavras[1] ?? ($primeira[1] ?? 'X');
        $prefixo = strtoupper(($primeira[0] ?? 'G') . ($segunda[0] ?? 'X'));
        $ano = (int) date('Y');

        $existentes = array_flip($chavesExistentes);
        do {
            $sequencial = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
            $chave = "{$prefixo}-{$ano}-{$sequencial}";
        } while (isset($existentes[$chave]));

        return $chave;
    }

    private static function removerAcentos(string $texto): string
    {
        static $mapa = null;
        if ($mapa === null) {
            $de = ['á', 'à', 'â', 'ã', 'ä', 'é', 'è', 'ê', 'ë', 'í', 'ì', 'î', 'ï', 'ó', 'ò', 'ô', 'õ', 'ö', 'ú', 'ù', 'û', 'ü', 'ç',
                   'Á', 'À', 'Â', 'Ã', 'Ä', 'É', 'È', 'Ê', 'Ë', 'Í', 'Ì', 'Î', 'Ï', 'Ó', 'Ò', 'Ô', 'Õ', 'Ö', 'Ú', 'Ù', 'Û', 'Ü', 'Ç'];
            $para = ['a', 'a', 'a', 'a', 'a', 'e', 'e', 'e', 'e', 'i', 'i', 'i', 'i', 'o', 'o', 'o', 'o', 'o', 'u', 'u', 'u', 'u', 'c',
                   'A', 'A', 'A', 'A', 'A', 'E', 'E', 'E', 'E', 'I', 'I', 'I', 'I', 'O', 'O', 'O', 'O', 'O', 'U', 'U', 'U', 'U', 'C'];
            $mapa = array_combine($de, $para);
        }
        return strtr($texto, $mapa);
    }

    private static function formatarEmpresa(array $row): array
    {
        $conexao = null;
        if ($row['conexao_tipo'] !== null) {
            $conexao = [
                'tipo' => $row['conexao_tipo'],
                'status' => $row['conexao_status'],
                'tenantId' => $row['conexao_tenant_id'],
                'clientId' => $row['conexao_client_id'],
                'clientSecret' => $row['conexao_client_secret'],
                'groupId' => $row['conexao_group_id'],
                'datasetId' => $row['conexao_dataset_id'],
                'testadoEm' => $row['conexao_testado_em'] !== null ? str_replace(' ', 'T', (string) $row['conexao_testado_em']) : null,
            ];
        }
        return [
            'id' => $row['id'],
            'codigo' => $row['codigo'],
            'nome' => $row['nome'],
            'cnpj' => $row['cnpj'],
            'conexao' => $conexao,
        ];
    }

    private static function formatarGrupo(array $row, array $empresas): array
    {
        return [
            'id' => $row['id'],
            'nome' => $row['nome'],
            'contrato' => $row['contrato'],
            'plano' => $row['plano'],
            'empresas' => $empresas,
        ];
    }
}
