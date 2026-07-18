<?php
// Config fixa para os testes (PHPUnit) -- espelha tests/setup-env.js e
// tests/fixtures/clients.test.json do Node. Sem segredos reais (banco de
// teste local, API key fixa), por isso é versionada (ao contrário de
// config.php).

return [
    'DB' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'dbname' => 'portal_financeiro_test',
        'user' => 'root',
        'pass' => '',
    ],

    'CLIENTS' => [
        'test-api-key-empresa-001' => [
            'cliente' => 'Cliente Teste',
            'empresas' => ['001', '002'],
        ],
    ],

    'MOCK_MODE' => true,

    'AZURE' => [
        'tenant_id' => '',
        'client_id' => '',
        'client_secret' => '',
        'group_id' => '',
        'dataset_id' => '',
    ],

    'CACHE_TTL_SECONDS' => 600,
    'CORS_ORIGIN' => '',
];
