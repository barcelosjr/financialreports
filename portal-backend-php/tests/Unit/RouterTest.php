<?php
declare(strict_types=1);

namespace Tests\Unit;

use App\Router;
use PHPUnit\Framework\TestCase;

final class RouterTest extends TestCase
{
    public function testCasaRotaEstaticaPorMetodo(): void
    {
        $router = new Router();
        $chamado = false;
        $router->get('/health', function () use (&$chamado): void {
            $chamado = true;
        });

        $router->dispatch('GET', '/health');

        $this->assertTrue($chamado);
    }

    public function testNaoCasaMetodoDiferente(): void
    {
        $router = new Router();
        $chamado = false;
        $router->get('/health', function () use (&$chamado): void {
            $chamado = true;
        });

        ob_start();
        $router->dispatch('POST', '/health');
        $saida = ob_get_clean();

        $this->assertFalse($chamado);
        $this->assertSame(['error' => 'Rota não encontrada.'], json_decode($saida, true));
    }

    public function testExtraiParametroDeRota(): void
    {
        $router = new Router();
        $capturado = null;
        $router->put('/contabil/estrutura/:id', function (array $params) use (&$capturado): void {
            $capturado = $params;
        });

        $router->dispatch('PUT', '/contabil/estrutura/abc-123');

        $this->assertSame(['id' => 'abc-123'], $capturado);
    }

    public function testRotaComSegmentoFixoDepoisDoParametro(): void
    {
        $router = new Router();
        $capturado = null;
        $router->post('/contabil/estrutura/:id/mover', function (array $params) use (&$capturado): void {
            $capturado = $params;
        });

        $router->dispatch('POST', '/contabil/estrutura/xyz/mover');
        $this->assertSame(['id' => 'xyz'], $capturado);

        // Contagem de segmentos diferente não deve casar (evita colisão com /contabil/contas/copiar).
        $capturado = null;
        $router->dispatch('POST', '/contabil/estrutura/xyz');
        $this->assertNull($capturado);
    }

    public function testCaminhoDesconhecidoRetorna404ComCorpoDeErroPadrao(): void
    {
        $router = new Router();

        ob_start();
        $router->dispatch('GET', '/nao-existe');
        $saida = ob_get_clean();

        $this->assertSame(404, http_response_code());
        $this->assertSame(['error' => 'Rota não encontrada.'], json_decode($saida, true));
    }
}
