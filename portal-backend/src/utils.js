/**
 * Traduz um erro de consulta ao Power BI em uma resposta HTTP segura,
 * sem vazar detalhes internos (stack traces, mensagens da API, etc).
 * O erro completo ja foi logado no servidor por quem o lancou (powerbi.js).
 */
function handlePowerBIError(err, res, fallbackMessage) {
  if (err.code === 'UNAVAILABLE' || err.code === 'THROTTLED') {
    return res.status(503).json({ error: 'Serviço de dados temporariamente indisponível. Tente novamente em instantes.' });
  }
  console.error(fallbackMessage, err);
  return res.status(500).json({ error: fallbackMessage });
}

/**
 * Escapa um valor de texto vindo do usuario antes de interpola-lo numa
 * string literal DAX (dobra aspas duplas, regra de escaping do DAX, e
 * rejeita quebras de linha/caracteres de controle) para evitar DAX injection
 * em filtros construidos a partir de query params (ex: ?conta=).
 */
function escapeDaxString(value) {
  if (/[\r\n\t]/.test(value)) {
    throw new Error('Valor contém caracteres inválidos.');
  }
  return value.replace(/"/g, '""');
}

/**
 * Le e valida o parametro obrigatorio ?empresa=, restrito as empresas
 * autorizadas para a API key da requisicao (req.empresasAutorizadas, anexado
 * por apiKeyAuth.js). Retorna a empresa validada, ou null apos ja ter escrito
 * a resposta 400/403 em res.
 */
function parseEmpresa(req, res) {
  const { empresa } = req.query;
  if (!empresa) {
    res.status(400).json({ error: 'Parâmetro "empresa" é obrigatório.' });
    return null;
  }
  if (!req.empresasAutorizadas.includes(empresa)) {
    res.status(403).json({ error: 'Empresa informada não está autorizada para esta API key.' });
    return null;
  }
  return empresa;
}

module.exports = { handlePowerBIError, escapeDaxString, parseEmpresa };
