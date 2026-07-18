<?php
declare(strict_types=1);

namespace Tests\Integration;

use PHPUnit\Framework\TestCase;
use Tests\Support\ApiClient;
use Tests\Support\TestServer;

final class HealthTest extends TestCase
{
    public static function setUpBeforeClass(): void
    {
        TestServer::ensureRunning();
    }

    public function testHealthRetorna200SemExigirApiKey(): void
    {
        $res = ApiClient::get('/health', ['apiKey' => null]);
        $this->assertSame(200, $res['status']);
        $this->assertSame(['status' => 'ok'], $res['body']);
    }
}
