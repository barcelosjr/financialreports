const { loadClients } = require('./clients');

// Carregado uma vez no boot (fail fast se clients.json estiver ausente/invalido).
const clientsByApiKey = loadClients();

/**
 * Middleware de autenticacao multi-tenant: valida o header X-API-KEY e anexa
 * req.cliente / req.empresasAutorizadas para as rotas usarem ao montar o
 * filtro DAX. Cada API key so enxerga as empresas listadas para ela.
 */
function apiKeyAuth(req, res, next) {
  const apiKey = req.get('X-API-KEY');
  if (!apiKey) {
    return res.status(401).json({ error: 'Header X-API-KEY é obrigatório.' });
  }

  const client = clientsByApiKey.get(apiKey);
  if (!client) {
    return res.status(401).json({ error: 'API key inválida.' });
  }

  req.cliente = client.cliente;
  req.empresasAutorizadas = client.empresas;
  next();
}

module.exports = { apiKeyAuth };
