<?php
declare(strict_types=1);

namespace App;

/**
 * Estrutura hierárquica (grupos/subgrupos) de cada relatório, por empresa --
 * espelha estruturas.js do Node, agora em MySQL em vez de um JSON por
 * empresa. "sinal" indica se a linha soma ("+"), subtrai ("-") ou é um
 * subtotal/resultado ("=") -- usado pelo motor de cálculo do relatório
 * (Fase 3).
 */
class Estruturas
{
    public const RELATORIOS = ['dre', 'balanco', 'fluxoCaixa'];
    public const SINAIS = ['+', '-', '='];
    private const SINAL_PADRAO = '+';

    public static function validarRelatorio(string $relatorio): void
    {
        if (!in_array($relatorio, self::RELATORIOS, true)) {
            throw new \InvalidArgumentException(
                'Relatório inválido: "' . $relatorio . '". Use um de: ' . implode(', ', self::RELATORIOS) . '.'
            );
        }
    }

    private static function validarSinal(mixed $sinal): void
    {
        if (!in_array($sinal, self::SINAIS, true)) {
            throw new \InvalidArgumentException(
                'Campo "sinal" inválido: "' . $sinal . '". Use um de: ' . implode(', ', self::SINAIS) . '.'
            );
        }
    }

    private static function formatarNo(array $row): array
    {
        return [
            'id' => $row['id'],
            'nome' => $row['nome'],
            'parentId' => $row['parentId'],
            'ordem' => (int) $row['ordem'],
            'sinal' => $row['sinal'],
        ];
    }

    /** @return array<int, array{id:string,nome:string,parentId:?string,ordem:int,sinal:string}> */
    public static function getEstrutura(\PDO $pdo, string $empresa, string $relatorio): array
    {
        self::validarRelatorio($relatorio);
        $stmt = $pdo->prepare(
            'SELECT id, nome, parent_id AS parentId, ordem, sinal FROM estruturas
             WHERE empresa = ? AND relatorio = ? ORDER BY ordem'
        );
        $stmt->execute([$empresa, $relatorio]);
        return array_map(self::formatarNo(...), $stmt->fetchAll());
    }

    public static function addNode(\PDO $pdo, string $empresa, string $relatorio, array $dados): array
    {
        self::validarRelatorio($relatorio);
        $nome = trim((string) ($dados['nome'] ?? ''));
        if ($nome === '') {
            throw new \InvalidArgumentException('Campo "nome" é obrigatório.');
        }
        $parentId = $dados['parentId'] ?? null;
        $sinal = $dados['sinal'] ?? self::SINAL_PADRAO;
        self::validarSinal($sinal);

        if ($parentId !== null) {
            $stmt = $pdo->prepare('SELECT 1 FROM estruturas WHERE id = ? AND empresa = ? AND relatorio = ?');
            $stmt->execute([$parentId, $empresa, $relatorio]);
            if (!$stmt->fetch()) {
                throw new \InvalidArgumentException('Nó pai "' . $parentId . '" não encontrado.');
            }
        }

        $contagem = $pdo->prepare(
            'SELECT COUNT(*) AS n FROM estruturas WHERE empresa = ? AND relatorio = ? AND parent_id <=> ?'
        );
        $contagem->execute([$empresa, $relatorio, $parentId]);
        $ordem = (int) $contagem->fetch()['n'];

        $id = Uuid::v4();
        $insert = $pdo->prepare(
            'INSERT INTO estruturas (id, empresa, relatorio, nome, parent_id, ordem, sinal) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $insert->execute([$id, $empresa, $relatorio, $nome, $parentId, $ordem, $sinal]);

        return ['id' => $id, 'nome' => $nome, 'parentId' => $parentId, 'ordem' => $ordem, 'sinal' => $sinal];
    }

    /**
     * Atualiza nome e/ou sinal de um nó existente (campos ausentes do corpo
     * permanecem inalterados -- por isso `array_key_exists`, não `??`).
     */
    public static function updateNode(\PDO $pdo, string $empresa, string $relatorio, string $id, array $body): array
    {
        self::validarRelatorio($relatorio);
        $temNome = array_key_exists('nome', $body);
        $temSinal = array_key_exists('sinal', $body);

        if ($temNome && (!is_string($body['nome']) || trim($body['nome']) === '')) {
            throw new \InvalidArgumentException('Campo "nome" não pode ser vazio.');
        }
        if ($temSinal) {
            self::validarSinal($body['sinal']);
        }

        $stmt = $pdo->prepare(
            'SELECT id, nome, parent_id AS parentId, ordem, sinal FROM estruturas
             WHERE id = ? AND empresa = ? AND relatorio = ?'
        );
        $stmt->execute([$id, $empresa, $relatorio]);
        $no = $stmt->fetch();
        if (!$no) {
            throw new \InvalidArgumentException('Nó "' . $id . '" não encontrado.');
        }

        $novoNome = $temNome ? trim($body['nome']) : $no['nome'];
        $novoSinal = $temSinal ? $body['sinal'] : $no['sinal'];

        $update = $pdo->prepare('UPDATE estruturas SET nome = ?, sinal = ? WHERE id = ?');
        $update->execute([$novoNome, $novoSinal, $id]);

        return self::formatarNo([
            'id' => $id, 'nome' => $novoNome, 'parentId' => $no['parentId'], 'ordem' => $no['ordem'], 'sinal' => $novoSinal,
        ]);
    }

    /**
     * Troca a "ordem" do nó com a de seu irmão adjacente (mesmo parentId).
     * Não faz nada (retorna o estado atual) se já estiver na ponta da lista.
     */
    public static function moveNode(\PDO $pdo, string $empresa, string $relatorio, string $id, mixed $direcao): array
    {
        self::validarRelatorio($relatorio);
        if ($direcao !== 'up' && $direcao !== 'down') {
            throw new \InvalidArgumentException('Campo "direcao" deve ser "up" ou "down".');
        }

        $stmt = $pdo->prepare('SELECT id, parent_id AS parentId FROM estruturas WHERE id = ? AND empresa = ? AND relatorio = ?');
        $stmt->execute([$id, $empresa, $relatorio]);
        $no = $stmt->fetch();
        if (!$no) {
            throw new \InvalidArgumentException('Nó "' . $id . '" não encontrado.');
        }

        $irmaosStmt = $pdo->prepare(
            'SELECT id, nome, parent_id AS parentId, ordem, sinal FROM estruturas
             WHERE empresa = ? AND relatorio = ? AND parent_id <=> ? ORDER BY ordem'
        );
        $irmaosStmt->execute([$empresa, $relatorio, $no['parentId']]);
        $irmaos = $irmaosStmt->fetchAll();

        $idx = null;
        foreach ($irmaos as $i => $irmao) {
            if ($irmao['id'] === $id) {
                $idx = $i;
                break;
            }
        }
        $alvoIdx = $direcao === 'up' ? $idx - 1 : $idx + 1;

        if ($idx === null || $alvoIdx < 0 || $alvoIdx >= count($irmaos)) {
            return array_map(self::formatarNo(...), $irmaos);
        }

        $atual = $irmaos[$idx];
        $alvo = $irmaos[$alvoIdx];

        $update = $pdo->prepare('UPDATE estruturas SET ordem = ? WHERE id = ?');
        $update->execute([$alvo['ordem'], $atual['id']]);
        $update->execute([$atual['ordem'], $alvo['id']]);

        [$irmaos[$idx]['ordem'], $irmaos[$alvoIdx]['ordem']] = [$alvo['ordem'], $atual['ordem']];
        return array_map(self::formatarNo(...), $irmaos);
    }

    /**
     * Remove um nó e todos os seus descendentes (cascade em memória, igual
     * ao Node). Retorna a lista de ids removidos, usada pela rota para
     * limpar tags órfãs em Classificacoes::removerTagsDeNode.
     *
     * @return array<int,string>
     */
    public static function deleteNode(\PDO $pdo, string $empresa, string $relatorio, string $id): array
    {
        self::validarRelatorio($relatorio);
        $stmt = $pdo->prepare('SELECT id, parent_id AS parentId FROM estruturas WHERE empresa = ? AND relatorio = ?');
        $stmt->execute([$empresa, $relatorio]);
        $nos = $stmt->fetchAll();

        $idsParaRemover = [];
        $coletar = function (string $nodeId) use (&$coletar, &$idsParaRemover, $nos): void {
            $idsParaRemover[$nodeId] = true;
            foreach ($nos as $n) {
                if ($n['parentId'] === $nodeId) {
                    $coletar($n['id']);
                }
            }
        };
        $coletar($id);

        $ids = array_keys($idsParaRemover);
        if ($ids !== []) {
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $del = $pdo->prepare("DELETE FROM estruturas WHERE id IN ($placeholders)");
            $del->execute($ids);
        }
        return $ids;
    }

    /**
     * Sobrescreve a estrutura inteira do destino com uma cópia da origem
     * (ids novos, mesma árvore/nomes/ordem). Retorna o mapeamento
     * oldId->newId por relatório, usado por Classificacoes::copyEmpresa
     * para remapear as tags copiadas junto.
     *
     * @return array<string, array<string,string>>
     */
    public static function copyEmpresaComMapeamento(\PDO $pdo, string $empresaOrigem, string $empresaDestino): array
    {
        $mapeamento = [];
        $pdo->beginTransaction();
        try {
            $del = $pdo->prepare('DELETE FROM estruturas WHERE empresa = ?');
            $del->execute([$empresaDestino]);

            $selecionar = $pdo->prepare(
                'SELECT id, nome, parent_id AS parentId, ordem, sinal FROM estruturas
                 WHERE empresa = ? AND relatorio = ? ORDER BY ordem'
            );
            $insert = $pdo->prepare(
                'INSERT INTO estruturas (id, empresa, relatorio, nome, parent_id, ordem, sinal) VALUES (?, ?, ?, ?, ?, ?, ?)'
            );

            foreach (self::RELATORIOS as $relatorio) {
                $selecionar->execute([$empresaOrigem, $relatorio]);
                $nosOrigem = $selecionar->fetchAll();

                $mapaRelatorio = [];
                foreach ($nosOrigem as $n) {
                    $mapaRelatorio[$n['id']] = Uuid::v4();
                }

                foreach ($nosOrigem as $n) {
                    $novoParent = $n['parentId'] !== null ? ($mapaRelatorio[$n['parentId']] ?? null) : null;
                    $insert->execute([
                        $mapaRelatorio[$n['id']], $empresaDestino, $relatorio, $n['nome'], $novoParent, (int) $n['ordem'], $n['sinal'],
                    ]);
                }
                $mapeamento[$relatorio] = $mapaRelatorio;
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
        return $mapeamento;
    }
}
