<?php
declare(strict_types=1);

namespace Tests\Unit;

use App\ApiKeyAuth;
use PHPUnit\Framework\TestCase;

final class ApiKeyAuthTest extends TestCase
{
    private array $clients = [
        'test-api-key-empresa-001' => ['cliente' => 'Cliente Teste', 'empresas' => ['001', '002']],
    ];

    protected function tearDown(): void
    {
        unset($_SERVER['HTTP_X_API_KEY']);
    }

    public function testSemHeaderXApiKeyRetornaNullEEscreve401(): void
    {
        unset($_SERVER['HTTP_X_API_KEY']);
        ob_start();
        $resultado = ApiKeyAuth::require($this->clients);
        ob_get_clean();

        $this->assertNull($resultado);
        $this->assertSame(401, http_response_code());
    }

    public function testHeaderInvalidoRetornaNullEEscreve401(): void
    {
        $_SERVER['HTTP_X_API_KEY'] = 'chave-errada';
        ob_start();
        $resultado = ApiKeyAuth::require($this->clients);
        ob_get_clean();

        $this->assertNull($resultado);
        $this->assertSame(401, http_response_code());
    }

    public function testHeaderValidoRetornaClienteEEmpresasAutorizadas(): void
    {
        $_SERVER['HTTP_X_API_KEY'] = 'test-api-key-empresa-001';
        $resultado = ApiKeyAuth::require($this->clients);

        $this->assertSame('Cliente Teste', $resultado['cliente']);
        $this->assertSame(['001', '002'], $resultado['empresas']);
    }
}
