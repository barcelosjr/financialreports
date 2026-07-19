<?php
declare(strict_types=1);

namespace Tests\Unit;

use App\Grupos;
use App\Tenancy;
use PHPUnit\Framework\TestCase;
use Tests\Support\DbHelper;

final class TenancyTest extends TestCase
{
    private \PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = DbHelper::pdo();
        DbHelper::reset();
    }

    public function testSuperAdminVeCodigosDeTodasAsEmpresas(): void
    {
        $grupoA = Grupos::criar($this->pdo, ['nome' => 'Grupo A', 'plano' => 'Essencial']);
        $grupoB = Grupos::criar($this->pdo, ['nome' => 'Grupo B', 'plano' => 'Essencial']);
        Grupos::adicionarEmpresa($this->pdo, $grupoA['id'], ['codigo' => '001', 'nome' => 'Empresa A']);
        Grupos::adicionarEmpresa($this->pdo, $grupoB['id'], ['codigo' => '002', 'nome' => 'Empresa B']);

        $codigos = Tenancy::codigosAutorizados($this->pdo, ['papel' => 'super_admin', 'grupoId' => null, 'empresasPermitidas' => 'todas']);
        sort($codigos);

        $this->assertSame(['001', '002'], $codigos);
    }

    public function testAdminGrupoComTodasVeSoAsEmpresasDoProprioGrupo(): void
    {
        $grupoA = Grupos::criar($this->pdo, ['nome' => 'Grupo A', 'plano' => 'Essencial']);
        $grupoB = Grupos::criar($this->pdo, ['nome' => 'Grupo B', 'plano' => 'Essencial']);
        Grupos::adicionarEmpresa($this->pdo, $grupoA['id'], ['codigo' => '001', 'nome' => 'Empresa A1']);
        Grupos::adicionarEmpresa($this->pdo, $grupoA['id'], ['codigo' => '003', 'nome' => 'Empresa A2']);
        Grupos::adicionarEmpresa($this->pdo, $grupoB['id'], ['codigo' => '002', 'nome' => 'Empresa B']);

        $codigos = Tenancy::codigosAutorizados($this->pdo, ['papel' => 'admin_grupo', 'grupoId' => $grupoA['id'], 'empresasPermitidas' => 'todas']);
        sort($codigos);

        $this->assertSame(['001', '003'], $codigos);
    }

    public function testUsuarioComListaEspecificaVeSoAsEmpresasPermitidas(): void
    {
        $grupo = Grupos::criar($this->pdo, ['nome' => 'Grupo A', 'plano' => 'Essencial']);
        $e1 = Grupos::adicionarEmpresa($this->pdo, $grupo['id'], ['codigo' => '001', 'nome' => 'Empresa A1']);
        Grupos::adicionarEmpresa($this->pdo, $grupo['id'], ['codigo' => '003', 'nome' => 'Empresa A2']);

        $codigos = Tenancy::codigosAutorizados($this->pdo, [
            'papel' => 'usuario', 'grupoId' => $grupo['id'], 'empresasPermitidas' => [$e1['id']],
        ]);

        $this->assertSame(['001'], $codigos);
    }

    public function testUsuarioSemGrupoNaoVeNadaEUsuarioComListaVaziaTambemNao(): void
    {
        $this->assertSame([], Tenancy::codigosAutorizados($this->pdo, ['papel' => 'usuario', 'grupoId' => null, 'empresasPermitidas' => 'todas']));

        $grupo = Grupos::criar($this->pdo, ['nome' => 'Grupo A', 'plano' => 'Essencial']);
        Grupos::adicionarEmpresa($this->pdo, $grupo['id'], ['codigo' => '001', 'nome' => 'Empresa A']);
        $codigos = Tenancy::codigosAutorizados($this->pdo, ['papel' => 'usuario', 'grupoId' => $grupo['id'], 'empresasPermitidas' => []]);
        $this->assertSame([], $codigos);
    }
}
