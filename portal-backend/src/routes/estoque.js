const express = require('express');
const { queryEstoqueGeral, queryEstoquePorProduto } = require('../powerbi');
const { createCache } = require('../cache');
const { handlePowerBIError } = require('../utils');
const config = require('../config');

const router = express.Router();

// Estoque no Power BI faz refresh a cada 1h -> TTL de cache padrao (10 min
// via CACHE_TTL_SECONDS) fica dentro da janela sugerida de 10-15 min.
const cache = createCache({ ttlSeconds: config.CACHE_TTL_SECONDS });

router.get('/:produtoId', async (req, res) => {
  const { produtoId } = req.params;
  if (!/^\d+$/.test(produtoId)) {
    return res.status(400).json({ error: 'O parâmetro produtoId deve ser um número inteiro positivo.' });
  }

  try {
    const { data, stale } = await cache.withCache(`estoque-${produtoId}`, () =>
      queryEstoquePorProduto(produtoId)
    );
    if (stale) res.set('X-Cache-Stale', 'true');
    res.json(data);
  } catch (err) {
    handlePowerBIError(err, res, 'Falha ao consultar estoque do produto.');
  }
});

router.get('/', async (req, res) => {
  try {
    const { data, stale } = await cache.withCache('estoque-geral', () => queryEstoqueGeral());
    if (stale) res.set('X-Cache-Stale', 'true');
    res.json(data);
  } catch (err) {
    handlePowerBIError(err, res, 'Falha ao consultar estoque.');
  }
});

module.exports = router;
