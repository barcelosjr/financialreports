const express = require('express');
const { queryVendas } = require('../powerbi');
const { createCache } = require('../cache');
const { handlePowerBIError } = require('../utils');
const config = require('../config');

const router = express.Router();

// Vendas no Power BI faz refresh 2x/dia -> TTL bem mais longo que o do
// estoque. Multiplicador aplicado sobre CACHE_TTL_SECONDS para ficar dentro
// da janela sugerida de 1-2h (600s * 6 = 3600s = 1h, com o TTL padrao).
const VENDAS_TTL_MULTIPLIER = 6;
const cache = createCache({ ttlSeconds: config.CACHE_TTL_SECONDS * VENDAS_TTL_MULTIPLIER });

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value) {
  if (!DATE_REGEX.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

router.get('/', async (req, res) => {
  const { dataInicio, dataFim } = req.query;

  if (!dataInicio || !isValidDate(dataInicio)) {
    return res.status(400).json({ error: 'Parâmetro "dataInicio" é obrigatório e deve estar no formato YYYY-MM-DD.' });
  }
  if (!dataFim || !isValidDate(dataFim)) {
    return res.status(400).json({ error: 'Parâmetro "dataFim" é obrigatório e deve estar no formato YYYY-MM-DD.' });
  }
  if (dataInicio > dataFim) {
    return res.status(400).json({ error: 'Parâmetro "dataInicio" não pode ser posterior a "dataFim".' });
  }

  try {
    const key = `vendas-${dataInicio}_${dataFim}`;
    const { data, stale } = await cache.withCache(key, () => queryVendas(dataInicio, dataFim));
    if (stale) res.set('X-Cache-Stale', 'true');
    res.json(data);
  } catch (err) {
    handlePowerBIError(err, res, 'Falha ao consultar vendas.');
  }
});

module.exports = router;
