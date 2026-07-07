require('dotenv').config();

const MOCK_MODE = process.env.MOCK_MODE === 'true';

// Em MOCK_MODE nao ha chamada real ao Azure AD/Power BI, entao as credenciais
// nao sao obrigatorias — isso permite rodar o backend localmente sem um
// modelo semantico publicado (ver secao 3 do briefing / README).
const REQUIRED_VARS = MOCK_MODE
  ? []
  : ['TENANT_ID', 'CLIENT_ID', 'CLIENT_SECRET', 'GROUP_ID', 'DATASET_ID'];

function loadConfig() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Variaveis de ambiente obrigatorias ausentes: ${missing.join(', ')}. ` +
        'Configure o arquivo .env a partir de .env.example, ou defina MOCK_MODE=true para desenvolvimento local sem credenciais.'
    );
  }

  return {
    TENANT_ID: process.env.TENANT_ID,
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    GROUP_ID: process.env.GROUP_ID,
    DATASET_ID: process.env.DATASET_ID,
    CACHE_TTL_SECONDS: Number(process.env.CACHE_TTL_SECONDS) || 600,
    PORT: Number(process.env.PORT) || 3000,
    MOCK_MODE,
    CLIENTS_CONFIG_PATH: process.env.CLIENTS_CONFIG_PATH || './clients.json',
  };
}

module.exports = loadConfig();
