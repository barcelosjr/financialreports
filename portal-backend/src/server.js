const express = require('express');

let config;
try {
  config = require('./config');
} catch (err) {
  console.error(`Erro de configuração: ${err.message}`);
  process.exit(1);
}

let apiKeyAuth;
try {
  ({ apiKeyAuth } = require('./apiKeyAuth'));
} catch (err) {
  console.error(`Erro ao carregar configuração de clientes: ${err.message}`);
  process.exit(1);
}

const contabilRouter = require('./routes/contabil');

const app = express();
app.use(express.json());

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

app.listen(config.PORT, () => {
  console.log(`portal-backend rodando na porta ${config.PORT}${config.MOCK_MODE ? ' (MOCK_MODE ativo)' : ''}`);
});
