const express = require('express');
const { queryBalancete } = require('../powerbi');
const { createCache } = require('../cache');
const { handlePowerBIError } = require('../utils');
const { isValidPeriodo, expandPeriodoRange } = require('../periodo');
const config = require('../config');

const router = express.Router();

// Lancamentos contabeis mudam com bem menos frequencia que estoque/vendas —
// ver README para a recomendacao de CACHE_TTL_SECONDS (30-60 min) neste caso.
const cache = createCache({ ttlSeconds: config.CACHE_TTL_SECONDS });

const CENTRO_CUSTO_REGEX = /^\d+$/;

/**
 * Valida periodoInicio/periodoFim e o filtro opcional ?empresa= (restrito as
 * empresas autorizadas para a API key da requisicao) e ?centroCusto=.
 * Retorna { erro } com a resposta 400/403 ja montada, ou os valores validados.
 */
function parseFiltrosComuns(req, res) {
  const { periodoInicio, periodoFim, empresa, centroCusto } = req.query;

  if (!periodoInicio || !isValidPeriodo(periodoInicio)) {
    res.status(400).json({ error: 'Parâmetro "periodoInicio" é obrigatório e deve estar no formato YYYY-MM.' });
    return null;
  }
  if (!periodoFim || !isValidPeriodo(periodoFim)) {
    res.status(400).json({ error: 'Parâmetro "periodoFim" é obrigatório e deve estar no formato YYYY-MM.' });
    return null;
  }
  if (periodoInicio > periodoFim) {
    res.status(400).json({ error: 'Parâmetro "periodoInicio" não pode ser posterior a "periodoFim".' });
    return null;
  }

  let empresas = req.empresasAutorizadas;
  if (empresa !== undefined) {
    if (!req.empresasAutorizadas.includes(empresa)) {
      res.status(403).json({ error: 'Empresa informada não está autorizada para esta API key.' });
      return null;
    }
    empresas = [empresa];
  }

  let centroCustoNum;
  if (centroCusto !== undefined) {
    if (!CENTRO_CUSTO_REGEX.test(centroCusto)) {
      res.status(400).json({ error: 'Parâmetro "centroCusto" deve ser um número inteiro.' });
      return null;
    }
    centroCustoNum = Number(centroCusto);
  }

  return {
    periodoInicio,
    periodoFim,
    empresas,
    centroCusto: centroCustoNum,
    periodos: { inicio: periodoInicio, fim: periodoFim, lista: expandPeriodoRange(periodoInicio, periodoFim) },
  };
}

function cacheKey({ empresas, periodoInicio, periodoFim, conta, centroCusto }) {
  const empresasKey = [...empresas].sort().join(',');
  return `balancete-${empresasKey}-${periodoInicio}_${periodoFim}-${conta || 'geral'}-${centroCusto ?? ''}`;
}

router.get('/:conta', async (req, res) => {
  const { conta } = req.params;
  const filtros = parseFiltrosComuns(req, res);
  if (!filtros) return;

  try {
    const key = cacheKey({ ...filtros, conta });
    const { data, stale } = await cache.withCache(key, () =>
      queryBalancete({ empresas: filtros.empresas, periodos: filtros.periodos, conta, centroCusto: filtros.centroCusto })
    );
    if (stale) res.set('X-Cache-Stale', 'true');
    res.json(data);
  } catch (err) {
    handlePowerBIError(err, res, 'Falha ao consultar balancete da conta.');
  }
});

router.get('/', async (req, res) => {
  const filtros = parseFiltrosComuns(req, res);
  if (!filtros) return;

  try {
    const key = cacheKey(filtros);
    const { data, stale } = await cache.withCache(key, () =>
      queryBalancete({ empresas: filtros.empresas, periodos: filtros.periodos, centroCusto: filtros.centroCusto })
    );
    if (stale) res.set('X-Cache-Stale', 'true');
    res.json(data);
  } catch (err) {
    handlePowerBIError(err, res, 'Falha ao consultar balancete.');
  }
});

module.exports = router;
