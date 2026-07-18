<?php
declare(strict_types=1);

namespace App;

/**
 * Cache persistido em MySQL (tabela `cache`) -- substitui o node-cache em
 * memória do Node, que não sobrevive entre requests em shared hosting (cada
 * request PHP é um processo isolado). Usado hoje pelo token do Azure AD
 * (Auth.php); queries DAX ganham cache aqui também quando MOCK_MODE virar
 * false de verdade (Fase 3).
 */
class Cache
{
    public static function get(\PDO $pdo, string $chave): ?string
    {
        $stmt = $pdo->prepare('SELECT valor FROM cache WHERE chave = ? AND expira_em > NOW()');
        $stmt->execute([$chave]);
        $row = $stmt->fetch();
        return $row ? $row['valor'] : null;
    }

    public static function set(\PDO $pdo, string $chave, string $valor, int $ttlSeconds): void
    {
        $stmt = $pdo->prepare(
            'INSERT INTO cache (chave, valor, expira_em) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))
             ON DUPLICATE KEY UPDATE valor = VALUES(valor), expira_em = VALUES(expira_em)'
        );
        $stmt->execute([$chave, $valor, $ttlSeconds]);
    }
}
