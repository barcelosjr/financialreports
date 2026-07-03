const axios = require('axios');
const { createCache } = require('./cache');
const config = require('./config');

const TOKEN_KEY = 'aad_access_token';
// TTL "chute" inicial; o valor real e definido por chamada com base no
// expires_in retornado pelo Azure AD (menos uma margem de seguranca).
const tokenCache = createCache({ ttlSeconds: 3600 });

async function requestNewToken() {
  const url = `https://login.microsoftonline.com/${config.TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.CLIENT_ID,
    client_secret: config.CLIENT_SECRET,
    scope: 'https://analysis.windows.net/powerbi/api/.default',
  });

  let response;
  try {
    response = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    });
  } catch (err) {
    // Nunca logar o body da requisicao (contem o client secret).
    console.error('Falha ao autenticar no Azure AD:', err.response?.status, err.response?.data?.error);
    throw new Error('Falha ao autenticar no Azure AD.');
  }

  const { access_token, expires_in } = response.data;
  // Reaproveita o token ate ~1 minuto antes de expirar.
  const safeTTL = Math.max(60, Number(expires_in) - 60);
  tokenCache.set(TOKEN_KEY, access_token, safeTTL);
  return access_token;
}

/**
 * Retorna um access token valido para a API do Power BI, reaproveitando o
 * cache sempre que possivel. Use forceRefresh para ignorar o cache (ex: apos
 * um 401 inesperado da API do Power BI).
 */
async function getAccessToken({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = tokenCache.get(TOKEN_KEY);
    if (cached) return cached;
  }
  return requestNewToken();
}

module.exports = { getAccessToken };
