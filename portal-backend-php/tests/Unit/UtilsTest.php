<?php
declare(strict_types=1);

namespace Tests\Unit;

use App\PowerBIException;
use App\Utils;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class UtilsTest extends TestCase
{
    protected function tearDown(): void
    {
        unset($_GET['empresa']);
    }

    public function testEscapeDaxStringDobraAspasDuplas(): void
    {
        $this->assertSame('a""b', Utils::escapeDaxString('a"b'));
    }

    public static function caracteresDeControleProvider(): array
    {
        return [["a\rb"], ["a\nb"], ["a\tb"]];
    }

    #[DataProvider('caracteresDeControleProvider')]
    public function testEscapeDaxStringRejeitaCaracteresDeControle(string $valor): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Utils::escapeDaxString($valor);
    }

    public function testParseEmpresaSemQueryRetornaNullEEscreve400(): void
    {
        unset($_GET['empresa']);
        ob_start();
        $resultado = Utils::parseEmpresa(['001', '002']);
        $saida = ob_get_clean();

        $this->assertNull($resultado);
        $this->assertSame(400, http_response_code());
        $this->assertSame(['error' => 'Parâmetro "empresa" é obrigatório.'], json_decode($saida, true));
    }

    public function testParseEmpresaForaDaListaAutorizadaRetornaNullEEscreve403(): void
    {
        $_GET['empresa'] = '999';
        ob_start();
        $resultado = Utils::parseEmpresa(['001', '002']);
        ob_get_clean();

        $this->assertNull($resultado);
        $this->assertSame(403, http_response_code());
    }

    public function testParseEmpresaValidaRetornaAEmpresa(): void
    {
        $_GET['empresa'] = '001';
        ob_start();
        $resultado = Utils::parseEmpresa(['001', '002']);
        ob_get_clean();

        $this->assertSame('001', $resultado);
    }

    public function testHandlePowerBIErrorUnavailableRetorna503(): void
    {
        ob_start();
        Utils::handlePowerBIError(new PowerBIException('x', 503, 'UNAVAILABLE'), 'fallback');
        ob_get_clean();

        $this->assertSame(503, http_response_code());
    }

    public function testHandlePowerBIErrorThrottledRetorna503(): void
    {
        ob_start();
        Utils::handlePowerBIError(new PowerBIException('x', 503, 'THROTTLED'), 'fallback');
        ob_get_clean();

        $this->assertSame(503, http_response_code());
    }

    public function testHandlePowerBIErrorOutroCodigoRetorna500ComFallbackMessage(): void
    {
        ob_start();
        Utils::handlePowerBIError(new PowerBIException('x', 500, 'API_ERROR'), 'Falha ao consultar.');
        $saida = ob_get_clean();

        $this->assertSame(500, http_response_code());
        $this->assertSame(['error' => 'Falha ao consultar.'], json_decode($saida, true));
    }
}
