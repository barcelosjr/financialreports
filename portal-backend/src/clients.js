const fs = require('fs');
const path = require('path');
const config = require('./config');

/**
 * Carrega e valida o arquivo de clientes (API key -> empresas autorizadas) no
 * boot da aplicacao. Falha rapido se o arquivo nao existir ou estiver mal
 * formado, do mesmo jeito que config.js faz para as variaveis de ambiente.
 */
function loadClients() {
  const filePath = path.resolve(config.CLIENTS_CONFIG_PATH);

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Arquivo de clientes nao encontrado em "${filePath}". ` +
        'Copie clients.example.json para clients.json (ou ajuste CLIENTS_CONFIG_PATH) e preencha as API keys/empresas reais.'
    );
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(`Arquivo de clientes em "${filePath}" nao e um JSON valido: ${err.message}`);
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`Arquivo de clientes em "${filePath}" deve ser uma lista com pelo menos um cliente.`);
  }

  const byApiKey = new Map();
  raw.forEach((entry, index) => {
    const { apiKey, cliente, empresas } = entry || {};
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error(`Entrada ${index} do arquivo de clientes esta sem "apiKey" valido.`);
    }
    if (!Array.isArray(empresas) || empresas.length === 0 || !empresas.every((e) => typeof e === 'string')) {
      throw new Error(`Entrada ${index} ("${cliente || apiKey}") deve ter "empresas" como lista de strings nao vazia.`);
    }
    if (byApiKey.has(apiKey)) {
      throw new Error('Arquivo de clientes tem "apiKey" duplicada.');
    }
    byApiKey.set(apiKey, { cliente: cliente || apiKey, empresas });
  });

  return byApiKey;
}

module.exports = { loadClients };
