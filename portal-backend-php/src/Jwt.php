<?php
declare(strict_types=1);

namespace App;

/**
 * JWT HS256 self-contained (sem Composer/firebase-php-jwt, mesmo espírito de
 * Uuid.php) -- só o suficiente pro que a Fase 2 precisa: assinar/verificar
 * com um segredo simétrico e checar expiração.
 */
class Jwt
{
    public static function encode(array $payload, string $secret, int $ttlSeconds = 86400): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $payload['iat'] = time();
        $payload['exp'] = time() + $ttlSeconds;

        $segments = [self::b64(json_encode($header)), self::b64(json_encode($payload))];
        $assinatura = hash_hmac('sha256', implode('.', $segments), $secret, true);
        $segments[] = self::b64($assinatura);

        return implode('.', $segments);
    }

    /** @return array Payload decodificado. Lança InvalidArgumentException se inválido/expirado. */
    public static function decode(string $token, string $secret): array
    {
        $partes = explode('.', $token);
        if (count($partes) !== 3) {
            throw new \InvalidArgumentException('Token malformado.');
        }
        [$headerB64, $payloadB64, $assinaturaB64] = $partes;

        $assinaturaEsperada = self::b64(hash_hmac('sha256', $headerB64 . '.' . $payloadB64, $secret, true));
        if (!hash_equals($assinaturaEsperada, $assinaturaB64)) {
            throw new \InvalidArgumentException('Assinatura do token inválida.');
        }

        $payload = json_decode(self::unb64($payloadB64), true);
        if (!is_array($payload)) {
            throw new \InvalidArgumentException('Payload do token inválido.');
        }
        if (isset($payload['exp']) && time() >= (int) $payload['exp']) {
            throw new \InvalidArgumentException('Token expirado.');
        }

        return $payload;
    }

    private static function b64(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function unb64(string $data): string
    {
        return (string) base64_decode(strtr($data, '-_', '+/'), true);
    }
}
