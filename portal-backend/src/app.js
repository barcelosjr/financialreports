const express = require('express');
const cors = require('cors');

function buildCorsOptions(config) {
  const raw = config.CORS_ORIGIN;
  if (!raw) return undefined;
  if (raw === '*') return { origin: '*' };
  const origins = raw.split(',').map((o) => o.trim()).filter(Boolean);
  return { origin: origins.length === 1 ? origins[0] : origins };
}

/**
 * Monta o app Express (middlewares, rotas, handlers de erro) sem chamar
 * app.listen — permite reuso em testes (supertest) sem abrir porta real.
 * Mantém o fail-fast do bootstrap original: erros de config/clients.json
 * saem com mensagem específica de qual etapa falhou.
 */
function createApp() {
  let config;
  try {
    config = require('./config');
  } catch (err) {
    throw new Error(`Erro de configuração: ${err.message}`);
  }

  let apiKeyAuth;
  try {
    ({ apiKeyAuth } = require('./apiKeyAuth'));
  } catch (err) {
    throw new Error(`Erro ao carregar configuração de clientes: ${err.message}`);
  }

  const contabilRouter = require('./routes/contabil');

  const app = express();
  app.use(express.json());

  const corsOptions = buildCorsOptions(config);
  if (corsOptions) {
    app.use(cors(corsOptions));
  }

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/contabil/balancete', apiKeyAuth, contabilRouter);

  app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada.' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  });

  return app;
}

module.exports = { createApp };
