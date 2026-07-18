<?php
declare(strict_types=1);

namespace Tests\Unit;

use App\Uuid;
use PHPUnit\Framework\TestCase;

final class UuidTest extends TestCase
{
    public function testGeraUuidV4ValidoEUnicoACadaChamada(): void
    {
        $a = Uuid::v4();
        $b = Uuid::v4();
        $padrao = '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/';

        $this->assertMatchesRegularExpression($padrao, $a);
        $this->assertMatchesRegularExpression($padrao, $b);
        $this->assertNotSame($a, $b);
    }
}
