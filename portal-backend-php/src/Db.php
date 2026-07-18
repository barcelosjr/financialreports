<?php
declare(strict_types=1);

namespace App;

/**
 * Conexao PDO/MySQL singleton por request (cada request PHP em shared
 * hosting e um processo isolado -- nao ha pool entre requests; o singleton
 * so evita abrir a conexao duas vezes dentro do mesmo request).
 */
class Db
{
    private static ?\PDO $pdo = null;

    /** @param array{host:string,port?:int,dbname:string,user:string,pass:string} $dbConfig */
    public static function pdo(array $dbConfig): \PDO
    {
        if (self::$pdo === null) {
            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
                $dbConfig['host'],
                $dbConfig['port'] ?? 3306,
                $dbConfig['dbname']
            );
            self::$pdo = new \PDO($dsn, $dbConfig['user'], $dbConfig['pass'], [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                \PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        }
        return self::$pdo;
    }
}
