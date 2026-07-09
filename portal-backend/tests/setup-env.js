const os = require('os');
const path = require('path');

process.env.MOCK_MODE = 'true';
process.env.CLIENTS_CONFIG_PATH = path.join(__dirname, 'fixtures', 'clients.test.json');
process.env.CACHE_TTL_SECONDS = '600';
process.env.PORT = '0';
process.env.CORS_ORIGIN = '';
// Nunca deve apontar para o classificacoes.json real do usuario; testes que
// escrevem classificacao (tests/integration/contas.test.js) sobrescrevem com
// um arquivo temporario proprio antes de cada teste.
process.env.CLASSIFICACOES_CONFIG_PATH = path.join(os.tmpdir(), 'portal-backend-tests-classificacoes-default.json');
