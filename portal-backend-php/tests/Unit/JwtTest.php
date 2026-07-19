<?php
declare(strict_types=1);

namespace Tests\Unit;

use App\Jwt;
use PHPUnit\Framework\TestCase;

final class JwtTest extends TestCase
{
    public function testEncodeDecodeRoundTripPreservaOPayload(): void
    {
        $token = Jwt::encode(['sub' => 'user-123'], 'segredo');
        $payload = Jwt::decode($token, 'segredo');

        $this->assertSame('user-123', $payload['sub']);
        $this->assertIsInt($payload['iat']);
        $this->assertIsInt($payload['exp']);
    }

    public function testDecodeComSegredoErradoLancaExcecao(): void
    {
        $token = Jwt::encode(['sub' => 'user-123'], 'segredo-certo');
        $this->expectException(\InvalidArgumentException::class);
        Jwt::decode($token, 'segredo-errado');
    }

    public function testDecodeTokenAdulteradoLancaExcecao(): void
    {
        $token = Jwt::encode(['sub' => 'user-123'], 'segredo');
        [$header, $payload, $assinatura] = explode('.', $token);
        $payloadAdulterado = strtr(base64_encode(json_encode(['sub' => 'outro-usuario'])), '+/', '-_');
        $tokenAdulterado = $header . '.' . rtrim($payloadAdulterado, '=') . '.' . $assinatura;

        $this->expectException(\InvalidArgumentException::class);
        Jwt::decode($tokenAdulterado, 'segredo');
    }

    public function testDecodeTokenExpiradoLancaExcecao(): void
    {
        $token = Jwt::encode(['sub' => 'user-123'], 'segredo', ttlSeconds: -10);
        $this->expectException(\InvalidArgumentException::class);
        Jwt::decode($token, 'segredo');
    }

    public function testDecodeTokenMalformadoLancaExcecao(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Jwt::decode('nao-eh-um-jwt', 'segredo');
    }
}
