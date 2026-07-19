<?php
declare(strict_types=1);

namespace App;

/**
 * Usuários/auth -- espelha o shape de data/usuarios.js do front. Substitui
 * o login fake (SessaoContext.jsx) por senha de verdade (password_hash) e
 * o CRUD mock de Usuarios.jsx por linhas em MySQL.
 */
class Usuarios
{
    public const PAPEIS = ['super_admin', 'admin_grupo', 'usuario'];
    public const RELATORIOS = ['dre', 'balanco', 'fluxoCaixa'];
    private const ALFABETO_SENHA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

    public static function contarTodos(\PDO $pdo): int
    {
        return (int) $pdo->query('SELECT COUNT(*) AS n FROM usuarios')->fetch()['n'];
    }

    public static function buscarPorId(\PDO $pdo, string $id): ?array
    {
        $stmt = $pdo->prepare('SELECT * FROM usuarios WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ? self::formatar($row) : null;
    }

    /** Uso interno (login) -- inclui senha_hash, ao contrário de buscarPorId/listar. */
    private static function buscarLinhaPorEmail(\PDO $pdo, string $email): ?array
    {
        $stmt = $pdo->prepare('SELECT * FROM usuarios WHERE email = ?');
        $stmt->execute([$email]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /** @return array<int, array> */
    public static function listar(\PDO $pdo, ?string $grupoId = null): array
    {
        if ($grupoId !== null) {
            $stmt = $pdo->prepare('SELECT * FROM usuarios WHERE grupo_id = ? ORDER BY nome');
            $stmt->execute([$grupoId]);
        } else {
            $stmt = $pdo->query('SELECT * FROM usuarios ORDER BY nome');
        }
        return array_map(self::formatar(...), $stmt->fetchAll());
    }

    private static function validarDados(array $dados, bool $exigirGrupo): void
    {
        if (empty($dados['nome']) || !is_string($dados['nome'])) {
            throw new \InvalidArgumentException('Campo "nome" é obrigatório.');
        }
        if (empty($dados['email']) || !is_string($dados['email']) || !str_contains($dados['email'], '@')) {
            throw new \InvalidArgumentException('Campo "email" é obrigatório e deve ser um e-mail válido.');
        }
        if (!in_array($dados['papel'] ?? null, self::PAPEIS, true)) {
            throw new \InvalidArgumentException('Campo "papel" inválido. Use um de: ' . implode(', ', self::PAPEIS) . '.');
        }
        if ($exigirGrupo && $dados['papel'] !== 'super_admin' && empty($dados['grupoId'])) {
            throw new \InvalidArgumentException('Campo "grupoId" é obrigatório para este papel.');
        }
        $empresas = $dados['empresasPermitidas'] ?? null;
        if ($empresas !== 'todas' && !is_array($empresas)) {
            throw new \InvalidArgumentException('Campo "empresasPermitidas" deve ser "todas" ou uma lista de ids.');
        }
        $relatorios = $dados['relatoriosPermitidos'] ?? null;
        if (!is_array($relatorios) || array_diff($relatorios, self::RELATORIOS) !== []) {
            throw new \InvalidArgumentException('Campo "relatoriosPermitidos" deve ser uma lista com valores de: ' . implode(', ', self::RELATORIOS) . '.');
        }
    }

    /**
     * Cria um usuário. Se `senha` vier em $dados, usa ela (fluxo de
     * bootstrap, onde a pessoa escolhe a própria senha); senão gera uma
     * temporária aleatória e devolve em texto puro (só nesta resposta --
     * não é salva em lugar nenhum além do hash).
     *
     * @return array{usuario: array, senhaTemporaria: ?string}
     */
    public static function criar(\PDO $pdo, array $dados): array
    {
        self::validarDados($dados, exigirGrupo: true);

        if (self::buscarLinhaPorEmail($pdo, $dados['email'])) {
            throw new \InvalidArgumentException('Já existe um usuário com este e-mail.');
        }

        $senhaTemporaria = null;
        $senha = $dados['senha'] ?? null;
        if (!$senha) {
            $senhaTemporaria = self::gerarSenhaTemporaria();
            $senha = $senhaTemporaria;
        } elseif (strlen($senha) < 6) {
            throw new \InvalidArgumentException('Campo "senha" deve ter pelo menos 6 caracteres.');
        }

        $id = Uuid::v4();
        $stmt = $pdo->prepare(
            'INSERT INTO usuarios (id, grupo_id, nome, email, senha_hash, papel, empresas_permitidas, relatorios_permitidos, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $id,
            $dados['papel'] === 'super_admin' ? null : $dados['grupoId'],
            $dados['nome'],
            $dados['email'],
            password_hash($senha, PASSWORD_DEFAULT),
            $dados['papel'],
            json_encode($dados['empresasPermitidas']),
            json_encode($dados['relatoriosPermitidos']),
            $dados['status'] ?? 'convidado',
        ]);

        return ['usuario' => self::buscarPorId($pdo, $id), 'senhaTemporaria' => $senhaTemporaria];
    }

    public static function atualizar(\PDO $pdo, string $id, array $dados): array
    {
        $atual = $pdo->prepare('SELECT * FROM usuarios WHERE id = ?');
        $atual->execute([$id]);
        $row = $atual->fetch();
        if (!$row) {
            throw new \InvalidArgumentException('Usuário "' . $id . '" não encontrado.');
        }

        $nome = $dados['nome'] ?? $row['nome'];
        $papel = $dados['papel'] ?? $row['papel'];
        if (!in_array($papel, self::PAPEIS, true)) {
            throw new \InvalidArgumentException('Campo "papel" inválido. Use um de: ' . implode(', ', self::PAPEIS) . '.');
        }
        $empresasPermitidas = array_key_exists('empresasPermitidas', $dados) ? $dados['empresasPermitidas'] : json_decode($row['empresas_permitidas'], true);
        if ($empresasPermitidas !== 'todas' && !is_array($empresasPermitidas)) {
            throw new \InvalidArgumentException('Campo "empresasPermitidas" deve ser "todas" ou uma lista de ids.');
        }
        $relatoriosPermitidos = array_key_exists('relatoriosPermitidos', $dados) ? $dados['relatoriosPermitidos'] : json_decode($row['relatorios_permitidos'], true);
        if (!is_array($relatoriosPermitidos) || array_diff($relatoriosPermitidos, self::RELATORIOS) !== []) {
            throw new \InvalidArgumentException('Campo "relatoriosPermitidos" deve ser uma lista com valores de: ' . implode(', ', self::RELATORIOS) . '.');
        }
        $status = $dados['status'] ?? $row['status'];
        if (!in_array($status, ['ativo', 'convidado', 'inativo'], true)) {
            throw new \InvalidArgumentException('Campo "status" inválido.');
        }

        $update = $pdo->prepare(
            'UPDATE usuarios SET nome = ?, papel = ?, empresas_permitidas = ?, relatorios_permitidos = ?, status = ? WHERE id = ?'
        );
        $update->execute([$nome, $papel, json_encode($empresasPermitidas), json_encode($relatoriosPermitidos), $status, $id]);

        return self::buscarPorId($pdo, $id);
    }

    /** @return array{usuario: array}|null Null se credenciais inválidas. */
    public static function autenticar(\PDO $pdo, string $email, string $senha): ?array
    {
        $row = self::buscarLinhaPorEmail($pdo, $email);
        if (!$row || !password_verify($senha, $row['senha_hash'])) {
            return null;
        }
        // "inativo" = desativado pelo admin, bloqueia login. "convidado" pode
        // logar normalmente (não há fluxo de convite por e-mail ainda -- a
        // senha temporária mostrada na criação já é a forma de entrar) e essa
        // primeira entrada bem-sucedida já promove o status pra "ativo".
        if ($row['status'] === 'inativo') {
            return ['bloqueado' => true, 'usuario' => self::formatar($row)];
        }

        $novoStatus = $row['status'] === 'convidado' ? 'ativo' : $row['status'];
        $pdo->prepare('UPDATE usuarios SET status = ?, ultimo_acesso = NOW(), acessos_mes = acessos_mes + 1 WHERE id = ?')
            ->execute([$novoStatus, $row['id']]);

        return ['usuario' => self::buscarPorId($pdo, $row['id'])];
    }

    private static function gerarSenhaTemporaria(): string
    {
        $senha = '';
        for ($i = 0; $i < 10; $i++) {
            $senha .= self::ALFABETO_SENHA[random_int(0, strlen(self::ALFABETO_SENHA) - 1)];
        }
        return $senha;
    }

    private static function formatar(array $row): array
    {
        return [
            'id' => $row['id'],
            'nome' => $row['nome'],
            'email' => $row['email'],
            'papel' => $row['papel'],
            'grupoId' => $row['grupo_id'],
            'empresasPermitidas' => json_decode($row['empresas_permitidas'], true),
            'relatoriosPermitidos' => json_decode($row['relatorios_permitidos'], true),
            'status' => $row['status'],
            'ultimoAcesso' => $row['ultimo_acesso'] !== null ? str_replace(' ', 'T', (string) $row['ultimo_acesso']) : null,
            'acessosMes' => (int) $row['acessos_mes'],
            'relatoriosVisualizadosMes' => (int) $row['relatorios_visualizados_mes'],
        ];
    }
}
