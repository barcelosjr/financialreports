<?php
declare(strict_types=1);

namespace App;

/** Resolve quais códigos de empresa (Estruturas/Classificacoes) um usuário autenticado pode acessar. */
class Tenancy
{
    /** @return array<int,string> */
    public static function codigosAutorizados(\PDO $pdo, array $usuario): array
    {
        if ($usuario['papel'] === 'super_admin') {
            return array_column($pdo->query('SELECT codigo FROM empresas')->fetchAll(), 'codigo');
        }

        if (!$usuario['grupoId']) {
            return [];
        }

        $stmt = $pdo->prepare('SELECT id, codigo FROM empresas WHERE grupo_id = ?');
        $stmt->execute([$usuario['grupoId']]);
        $empresasDoGrupo = $stmt->fetchAll();

        if ($usuario['empresasPermitidas'] === 'todas') {
            return array_column($empresasDoGrupo, 'codigo');
        }

        $idsPermitidos = array_flip($usuario['empresasPermitidas']);
        return array_values(array_map(
            fn (array $e) => $e['codigo'],
            array_filter($empresasDoGrupo, fn (array $e) => isset($idsPermitidos[$e['id']]))
        ));
    }
}
