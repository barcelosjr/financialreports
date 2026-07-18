<?php
declare(strict_types=1);

namespace App;

/**
 * Classificações de conta contábil por empresa -- espelha classificacoes.js
 * do Node. Cada "regra" (tabela `classificacoes`) tem conta + natureza (D/C)
 * opcional + centro de custo opcional, apontando para uma ou mais tags
 * (tabela `classificacao_tags`, linhas da estrutura de DRE/Balanço/Fluxo).
 */
class Classificacoes
{
    public const RELATORIOS = ['dre', 'balanco', 'fluxoCaixa'];

    /** @return array<int, array{id:string,conta:string,natureza:?string,centroCusto:?string,tags:array}> */
    public static function getEmpresa(\PDO $pdo, string $empresa): array
    {
        $stmt = $pdo->prepare('SELECT id, conta, natureza, centro_custo AS centroCusto FROM classificacoes WHERE empresa = ?');
        $stmt->execute([$empresa]);
        $regras = $stmt->fetchAll();

        $tagsStmt = $pdo->prepare(
            'SELECT ct.regra_id AS regraId, ct.relatorio, ct.node_id AS nodeId
             FROM classificacao_tags ct
             INNER JOIN classificacoes c ON c.id = ct.regra_id
             WHERE c.empresa = ?'
        );
        $tagsStmt->execute([$empresa]);

        $tagsPorRegra = [];
        foreach ($tagsStmt->fetchAll() as $tag) {
            $tagsPorRegra[$tag['regraId']][] = ['relatorio' => $tag['relatorio'], 'nodeId' => $tag['nodeId']];
        }

        return array_map(fn (array $r) => [
            'id' => $r['id'],
            'conta' => $r['conta'],
            'natureza' => $r['natureza'],
            'centroCusto' => $r['centroCusto'],
            'tags' => $tagsPorRegra[$r['id']] ?? [],
        ], $regras);
    }

    private static function validarNatureza(mixed $natureza): void
    {
        if ($natureza !== null && $natureza !== 'D' && $natureza !== 'C') {
            throw new \InvalidArgumentException('Campo "natureza" deve ser "D", "C" ou nulo/ausente.');
        }
    }

    private static function validarTags(mixed $tags): void
    {
        if (!is_array($tags)) {
            throw new \InvalidArgumentException('Campo "tags" deve ser uma lista.');
        }
        foreach (array_values($tags) as $i => $tag) {
            if (!is_array($tag)) {
                throw new \InvalidArgumentException("Tag {$i} inválida.");
            }
            if (!in_array($tag['relatorio'] ?? null, self::RELATORIOS, true)) {
                $relatorioInvalido = $tag['relatorio'] ?? '';
                throw new \InvalidArgumentException(
                    "Tag {$i} tem \"relatorio\" inválido: \"{$relatorioInvalido}\". Use um de: " . implode(', ', self::RELATORIOS) . '.'
                );
            }
            if (empty($tag['nodeId']) || !is_string($tag['nodeId'])) {
                throw new \InvalidArgumentException("Tag {$i} está sem \"nodeId\" válido.");
            }
        }
    }

    /** Cria (sem "id") ou atualiza (com "id") uma regra de classificação. Retorna a regra salva. */
    public static function upsertRegra(\PDO $pdo, string $empresa, array $dados): array
    {
        $id = $dados['id'] ?? null;
        $conta = $dados['conta'] ?? null;
        $natureza = $dados['natureza'] ?? null;
        $centroCusto = $dados['centroCusto'] ?? null;
        $tags = $dados['tags'] ?? [];

        if (!$conta || !is_string($conta)) {
            throw new \InvalidArgumentException('Campo "conta" é obrigatório.');
        }
        self::validarNatureza($natureza);
        if ($centroCusto !== null && !is_string($centroCusto)) {
            throw new \InvalidArgumentException('Campo "centroCusto" deve ser texto ou nulo/ausente.');
        }
        self::validarTags($tags);

        $natureza = $natureza ?: null;
        $centroCusto = $centroCusto ?: null;
        $tagsSalvas = [];

        $pdo->beginTransaction();
        try {
            if ($id) {
                $stmt = $pdo->prepare('SELECT id FROM classificacoes WHERE id = ? AND empresa = ?');
                $stmt->execute([$id, $empresa]);
                if (!$stmt->fetch()) {
                    throw new \InvalidArgumentException('Regra "' . $id . '" não encontrada.');
                }
                $upd = $pdo->prepare('UPDATE classificacoes SET conta = ?, natureza = ?, centro_custo = ? WHERE id = ?');
                $upd->execute([$conta, $natureza, $centroCusto, $id]);
                $del = $pdo->prepare('DELETE FROM classificacao_tags WHERE regra_id = ?');
                $del->execute([$id]);
            } else {
                $id = Uuid::v4();
                $ins = $pdo->prepare('INSERT INTO classificacoes (id, empresa, conta, natureza, centro_custo) VALUES (?, ?, ?, ?, ?)');
                $ins->execute([$id, $empresa, $conta, $natureza, $centroCusto]);
            }

            $tagIns = $pdo->prepare('INSERT INTO classificacao_tags (regra_id, relatorio, node_id) VALUES (?, ?, ?)');
            foreach ($tags as $t) {
                $tagIns->execute([$id, $t['relatorio'], $t['nodeId']]);
                $tagsSalvas[] = ['relatorio' => $t['relatorio'], 'nodeId' => $t['nodeId']];
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        return ['id' => $id, 'conta' => $conta, 'natureza' => $natureza, 'centroCusto' => $centroCusto, 'tags' => $tagsSalvas];
    }

    public static function deleteRegra(\PDO $pdo, string $empresa, string $id): bool
    {
        $stmt = $pdo->prepare('SELECT id FROM classificacoes WHERE id = ? AND empresa = ?');
        $stmt->execute([$id, $empresa]);
        if (!$stmt->fetch()) {
            return false;
        }
        $del = $pdo->prepare('DELETE FROM classificacoes WHERE id = ?'); // classificacao_tags via FK ON DELETE CASCADE
        $del->execute([$id]);
        return true;
    }

    /**
     * Remove, de todas as regras de uma empresa, qualquer tag que aponte
     * para um dos nodeIds informados (chamado quando um nó da estrutura é
     * apagado, para não deixar tags órfãs). Regras que ficarem sem nenhuma
     * tag são mantidas.
     *
     * @param array<int,string> $nodeIds
     */
    public static function removerTagsDeNode(\PDO $pdo, string $empresa, array $nodeIds): void
    {
        if ($nodeIds === []) {
            return;
        }
        $placeholders = implode(',', array_fill(0, count($nodeIds), '?'));
        $stmt = $pdo->prepare(
            "DELETE ct FROM classificacao_tags ct
             INNER JOIN classificacoes c ON c.id = ct.regra_id
             WHERE c.empresa = ? AND ct.node_id IN ($placeholders)"
        );
        $stmt->execute([$empresa, ...$nodeIds]);
    }

    /**
     * Copia todas as regras de uma empresa para outra, sobrescrevendo as já
     * existentes no destino. As tags são remapeadas via mapeamentoNodeIds
     * (vindo de Estruturas::copyEmpresaComMapeamento) -- tags cujo nó de
     * origem não exista no mapeamento são descartadas.
     *
     * @param array<string, array<string,string>> $mapeamentoNodeIds
     */
    public static function copyEmpresa(\PDO $pdo, string $empresaOrigem, string $empresaDestino, array $mapeamentoNodeIds): array
    {
        $pdo->beginTransaction();
        try {
            $del = $pdo->prepare('DELETE FROM classificacoes WHERE empresa = ?');
            $del->execute([$empresaDestino]);

            $regras = self::getEmpresa($pdo, $empresaOrigem);
            $insRegra = $pdo->prepare('INSERT INTO classificacoes (id, empresa, conta, natureza, centro_custo) VALUES (?, ?, ?, ?, ?)');
            $insTag = $pdo->prepare('INSERT INTO classificacao_tags (regra_id, relatorio, node_id) VALUES (?, ?, ?)');

            $destino = [];
            foreach ($regras as $r) {
                $novoId = Uuid::v4();
                $insRegra->execute([$novoId, $empresaDestino, $r['conta'], $r['natureza'], $r['centroCusto']]);

                $novasTags = [];
                foreach ($r['tags'] as $t) {
                    $novoNodeId = $mapeamentoNodeIds[$t['relatorio']][$t['nodeId']] ?? null;
                    if ($novoNodeId === null) {
                        continue;
                    }
                    $insTag->execute([$novoId, $t['relatorio'], $novoNodeId]);
                    $novasTags[] = ['relatorio' => $t['relatorio'], 'nodeId' => $novoNodeId];
                }
                $destino[] = ['id' => $novoId, 'conta' => $r['conta'], 'natureza' => $r['natureza'], 'centroCusto' => $r['centroCusto'], 'tags' => $novasTags];
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
        return $destino;
    }
}
