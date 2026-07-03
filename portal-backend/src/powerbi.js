const axios = require('axios');
const { getAccessToken } = require('./auth');
const config = require('./config');
const mock = require('./mockData');

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

const ESTOQUE_MAPPING = {
  'Produtos[Nome]': 'produto',
  'Produtos[Categoria]': 'categoria',
  'Estoque[Deposito]': 'deposito',
  '[Quantidade]': 'quantidade',
};

const VENDAS_MAPPING = {
  'Produtos[Nome]': 'produto',
  'Produtos[Categoria]': 'categoria',
  '[ValorTotal]': 'valorTotal',
  '[Quantidade]': 'quantidade',
};

async function queryEstoqueGeral() {
  if (config.MOCK_MODE) return mock.mockEstoqueGeral();

  const dax = `
EVALUATE
SUMMARIZECOLUMNS(
    Produtos[Nome],
    Produtos[Categoria],
    Estoque[Deposito],
    "Quantidade", [Estoque Total]
)`.trim();

  const rows = await executeDaxQuery(dax);
  return rows.map((row) => mapRow(row, ESTOQUE_MAPPING));
}

async function queryEstoquePorProduto(produtoId) {
  if (config.MOCK_MODE) return mock.mockEstoquePorProduto(produtoId);

  const id = Number(produtoId);
  const dax = `
EVALUATE
SUMMARIZECOLUMNS(
    Produtos[Nome],
    Produtos[Categoria],
    Estoque[Deposito],
    FILTER(Produtos, Produtos[ProdutoID] = ${id}),
    "Quantidade", [Estoque Total]
)`.trim();

  const rows = await executeDaxQuery(dax);
  return rows.map((row) => mapRow(row, ESTOQUE_MAPPING));
}

async function queryVendas(dataInicio, dataFim) {
  if (config.MOCK_MODE) return mock.mockVendas(dataInicio, dataFim);

  const [anoI, mesI, diaI] = dataInicio.split('-');
  const [anoF, mesF, diaF] = dataFim.split('-');
  const dax = `
EVALUATE
SUMMARIZECOLUMNS(
    Produtos[Nome],
    Produtos[Categoria],
    FILTER(
        Vendas,
        Vendas[DataVenda] >= DATE(${anoI}, ${mesI}, ${diaI}) &&
        Vendas[DataVenda] <= DATE(${anoF}, ${mesF}, ${diaF})
    ),
    "ValorTotal", [Vendas Total (R$)],
    "Quantidade", [Vendas Qtd]
)`.trim();

  const rows = await executeDaxQuery(dax);
  return rows.map((row) => mapRow(row, VENDAS_MAPPING));
}

module.exports = { queryEstoqueGeral, queryEstoquePorProduto, queryVendas, PowerBIError };
