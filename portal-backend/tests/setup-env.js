const path = require('path');

process.env.MOCK_MODE = 'true';
process.env.CLIENTS_CONFIG_PATH = path.join(__dirname, 'fixtures', 'clients.test.json');
process.env.CACHE_TTL_SECONDS = '600';
process.env.PORT = '0';
process.env.CORS_ORIGIN = '';
