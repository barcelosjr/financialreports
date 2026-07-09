const express = require('express');
const { queryContasUnicas } = require('../powerbi');
const { createCache } = require('../cache');
const { handlePowerBIError } = require('../utils');
const classificacoes = require('../classificacoes');
const config = require('../config');

const router = express.Router();

// Contas unicas mudam raramente (so quando o plano de contas ganha uma conta
// nova) — mesmo TTL do balancete e suficiente.
const cache = createCache({ ttlSeconds: config.CACHE_TTL_SECONDS });

const CAMPOS_CLASSIFICACAO = ['dre', 'balanco', 'fluxoCaixa'];

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

// GET /api/contabil/contas?empresa=X
// Lista as contas unicas da empresa, ja mescladas com a classificacao salva.
router.get('/', async (req, res) => {
  const empresa = parseEmpresa(req, res);
  if (!empresa) return;

  try {
    const key = `contas-${empresa}`;
    const { data, stale } = await cache.withCache(key, () => queryContasUnicas({ empresa }));
    const classificacoesEmpresa = classificacoes.getEmpresa(empresa);

    const contas = data.map((linha) => {
      const c = classificacoesEmpresa[linha.conta] || {};
      return {
        conta: linha.conta,
        descricaoConta: linha.descricaoConta,
        dre: !!c.dre,
        balanco: !!c.balanco,
        fluxoCaixa: !!c.fluxoCaixa,
      };
    });

    if (stale) res.set('X-Cache-Stale', 'true');
    res.json(contas);
  } catch (err) {
    handlePowerBIError(err, res, 'Falha ao consultar contas.');
  }
});

// PUT /api/contabil/contas/:conta?empresa=X
// Salva a classificacao de uma unica conta (clique de "Salvar" por linha).
router.put('/:conta', (req, res) => {
  const empresa = parseEmpresa(req, res);
  if (!empresa) return;

  const { conta } = req.params;
  const body = req.body || {};

  for (const campo of CAMPOS_CLASSIFICACAO) {
    if (body[campo] !== undefined && typeof body[campo] !== 'boolean') {
      return res.status(400).json({ error: `Campo "${campo}" deve ser booleano.` });
    }
  }

  const salvo = classificacoes.setConta(empresa, conta, body);
  res.json({ conta, ...salvo });
});

// POST /api/contabil/contas/copiar { empresaOrigem, empresaDestino }
// Copia as classificacoes de uma empresa para outra (sobrescreve na empresa
// de destino as contas que existirem tambem na origem).
router.post('/copiar', (req, res) => {
  const { empresaOrigem, empresaDestino } = req.body || {};

  if (!empresaOrigem || !empresaDestino) {
    return res.status(400).json({ error: 'Parâmetros "empresaOrigem" e "empresaDestino" são obrigatórios.' });
  }
  if (empresaOrigem === empresaDestino) {
    return res.status(400).json({ error: 'Empresa de origem e destino devem ser diferentes.' });
  }
  if (!req.empresasAutorizadas.includes(empresaOrigem) || !req.empresasAutorizadas.includes(empresaDestino)) {
    return res.status(403).json({ error: 'Empresa de origem ou destino não está autorizada para esta API key.' });
  }

  const resultado = classificacoes.copyEmpresa(empresaOrigem, empresaDestino);
  res.json({ empresa: empresaDestino, contasCopiadas: Object.keys(resultado).length });
});

module.exports = router;
