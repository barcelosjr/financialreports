<?php
declare(strict_types=1);

namespace Tests\Support;

use App\Db;

/** Conexão com o banco de teste (portal_financeiro_test) e reset entre testes. */
class DbHelper
{
    public static function pdo(): \PDO
    {
        $config = require __DIR__ . '/../../config.test.php';
        return Db::pdo($config['DB']);
    }

    /** Limpa as tabelas de Fase 1 e Fase 2 -- equivalente a apagar o arquivo JSON temporário do Node entre testes. */
    public static function reset(): void
    {
        $pdo = self::pdo();
        $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
        $pdo->exec('TRUNCATE classificacao_tags');
        $pdo->exec('TRUNCATE classificacoes');
        $pdo->exec('TRUNCATE estruturas');
        $pdo->exec('TRUNCATE cache');
        $pdo->exec('TRUNCATE usuarios');
        $pdo->exec('TRUNCATE empresas');
        $pdo->exec('TRUNCATE grupos');
        $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
    }
}
