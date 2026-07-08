let config;
try {
  config = require('./config');
} catch (err) {
  console.error(`Erro de configuração: ${err.message}`);
  process.exit(1);
}

let app;
try {
  const { createApp } = require('./app');
  app = createApp();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

app.listen(config.PORT, () => {
  console.log(`portal-backend rodando na porta ${config.PORT}${config.MOCK_MODE ? ' (MOCK_MODE ativo)' : ''}`);
});
