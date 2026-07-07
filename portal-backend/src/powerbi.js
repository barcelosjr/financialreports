const axios = require('axios');
const { getAccessToken } = require('./auth');
const config = require('./config');
const mock = require('./mockData');
const { escapeDaxString } = require('./utils');

class PowerBIError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = 'PowerBIError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Chama o endpoint executeQueries do Power BI REST API com uma query DAX.
 * Retenta uma vez com um token novo se receber 401 (token expirado/invalido).
 */
async function executeDaxQuery(daxQuery, { retry = true } = {}) {
  const token = await getAccessToken();
  const url = `https://api.powerbi.com/v1.0/myorg/groups/${config.GROUP_ID}/datasets/${config.DATASET_ID}/executeQueries`;

  try {
    const response = await axios.post(
      url,
      { queries: [{ query: daxQuery }], serializerSettings: { includeNulls: true } },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
    );
    return response.data.results[0].tables[0].rows;
  } catch (err) {
    const status = err.response?.status;

    if (status === 401 && retry) {
      await getAccessToken({ forceRefresh: true });
      return executeDaxQuery(daxQuery, { retry: false });
    }

    if (status === 429) {
      console.error('Power BI API retornou 429 (throttling).');
      throw new PowerBIError('Power BI API throttling (429)', { status: 429, code: 'THROTTLED' });
    }

    if (!err.response || err.code === 'ECONNABORTED') {
      console.error('Power BI API indisponivel ou timeout:', err.message);
      throw new PowerBIError('Power BI API indisponivel', { status: 503, code: 'UNAVAILABLE' });
    }

    // Erro do proprio codigo (ex: DAX mal formada) ou outro erro da API.
    console.error('Erro ao consultar Power BI:', status, err.response?.data);
    throw new PowerBIError(`Power BI API error (${status})`, { status: 500, code: 'API_ERROR' });
  }
}

function mapRow(row, mapping) {
  const out = {};
  for (const [rawKey, friendlyKey] of Object.entries(mapping)) {
    out[friendlyKey] = row[rawKey];
  }
  return out;
}

const BALANCETE_MAPPING = {
  'LANCAMENTOS[EMPRESA]': 'empresa',
  'LANCAMENTOS[CONTA]': 'conta',
  'LANCAMENTOS[DESCRICAO_CONTA]': 'descricaoConta',
  '[Debito]': 'debito',
  '[Credito]': 'credito',
  '[Saldo]': 'saldo',
};

function daxStringSet(values) {
  return `{${values.map((v) => `"${escapeDaxString(v)}"`).join(', ')}}`;
}

/**
 * Consulta o balancete (debito/credito/saldo por empresa+conta) no periodo e
 * escopo informados. `empresas` deve ser sempre a lista ja restrita as
 * empresas autorizadas para a API key da requisicao (ver apiKeyAuth.js) —
 * nunca uma lista vinda direto do usuario sem checagem.
 */
async function queryBalancete({ empresas, periodos, conta, centroCusto }) {
  if (config.MOCK_MODE) {
    return mock.mockBalancete({
      empresas,
      periodoInicio: periodos.inicio,
      periodoFim: periodos.fim,
      conta,
      centroCusto,
    });
  }

  const condicoes = [
    `LANCAMENTOS[EMPRESA] IN ${daxStringSet(empresas)}`,
    `LANCAMENTOS[PERIODO] IN ${daxStringSet(periodos.lista)}`,
  ];
  if (conta !== undefined) {
    condicoes.push(`LANCAMENTOS[CONTA] = "${escapeDaxString(conta)}"`);
  }
  if (centroCusto !== undefined) {
    condicoes.push(`LANCAMENTOS[CENTRO_CUSTO] = ${centroCusto}`);
  }

  const dax = `
DEFINE
    MEASURE LANCAMENTOS[Total Debito] =
        CALCULATE(SUM(LANCAMENTOS[VALOR]), LANCAMENTOS[NATUREZA] = "D")
    MEASURE LANCAMENTOS[Total Credito] =
        CALCULATE(SUM(LANCAMENTOS[VALOR]), LANCAMENTOS[NATUREZA] = "C")
    MEASURE LANCAMENTOS[Saldo] = [Total Debito] - [Total Credito]
EVALUATE
SUMMARIZECOLUMNS(
    LANCAMENTOS[EMPRESA],
    LANCAMENTOS[CONTA],
    LANCAMENTOS[DESCRICAO_CONTA],
    FILTER(
        LANCAMENTOS,
        ${condicoes.join(' &&\n        ')}
    ),
    "Debito", [Total Debito],
    "Credito", [Total Credito],
    "Saldo", [Saldo]
)`.trim();

  const rows = await executeDaxQuery(dax);
  return rows.map((row) => mapRow(row, BALANCETE_MAPPING));
}

module.exports = { queryBalancete, PowerBIError };
