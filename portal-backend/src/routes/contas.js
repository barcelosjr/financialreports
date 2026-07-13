const express = require('express');
const { queryContasUnicas } = require('../powerbi');
const { createCache } = require('../cache');
const { handlePowerBIError, parseEmpresa } = require('../utils');
const classificacoes = require('../classificacoes');
const estruturas = require('../estruturas');
const config = require('../config');

const router = express.Router();

// Contas unicas mudam raramente (so quando o plano de contas ganha uma conta
// nova) — mesmo TTL do balancete e suficiente.
const cache = createCache({ ttlSeconds: config.CACHE_TTL_SECONDS });

// GET /api/contabil/contas?empresa=X
// Lista as contas unicas da empresa, cada uma com suas regras de classificacao
// (conta + natureza/centroCusto opcionais -> tags de DRE/Balanco/Fluxo de Caixa).
router.get('/', async (req, res) => {
  const empresa = parseEmpresa(req, res);
  if (!empresa) return;

  try {
    const key = `contas-${empresa}`;
    const { data, stale } = await cache.withCache(key, () => queryContasUnicas({ empresa }));
    const regrasPorConta = new Map();
    for (const regra of classificacoes.getEmpresa(empresa)) {
      if (!regrasPorConta.has(regra.conta)) regrasPorConta.set(regra.conta, []);
      regrasPorConta.get(regra.conta).push(regra);
    }

    const contas = data.map((linha) => ({
      conta: linha.conta,
      descricaoConta: linha.descricaoConta,
      regras: regrasPorConta.get(linha.conta) || [],
    }));

    if (stale) res.set('X-Cache-Stale', 'true');
    res.json(contas);
  } catch (err) {
    handlePowerBIError(err, res, 'Falha ao consultar contas.');
  }
});

// POST /api/contabil/contas/:conta/regras?empresa=X
// Cria uma nova regra de classificacao para a conta.
router.post('/:conta/regras', (req, res) => {
  const empresa = parseEmpresa(req, res);
  if (!empresa) return;

  const { conta } = req.params;
  const { natureza, centroCusto, tags } = req.body || {};

  try {
    const salvo = classificacoes.upsertRegra(empresa, { conta, natureza, centroCusto, tags });
    res.status(201).json(salvo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/contabil/contas/:conta/regras/:regraId?empresa=X
// Atualiza uma regra existente da conta.
router.put('/:conta/regras/:regraId', (req, res) => {
  const empresa = parseEmpresa(req, res);
  if (!empresa) return;

  const { conta, regraId } = req.params;
  const { natureza, centroCusto, tags } = req.body || {};

  try {
    const salvo = classificacoes.upsertRegra(empresa, { id: regraId, conta, natureza, centroCusto, tags });
    res.json(salvo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/contabil/contas/:conta/regras/:regraId?empresa=X
router.delete('/:conta/regras/:regraId', (req, res) => {
  const empresa = parseEmpresa(req, res);
  if (!empresa) return;

  const existia = classificacoes.deleteRegra(empresa, req.params.regraId);
  if (!existia) {
    return res.status(404).json({ error: 'Regra não encontrada.' });
  }
  res.json({ ok: true });
});

// POST /api/contabil/contas/copiar { empresaOrigem, empresaDestino }
// Copia a estrutura (DRE/Balanco/Fluxo de Caixa) e as regras de classificacao
// da origem para o destino, sobrescrevendo o que existir no destino.
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

  const mapeamento = estruturas.copyEmpresaComMapeamento(empresaOrigem, empresaDestino);
  const regras = classificacoes.copyEmpresa(empresaOrigem, empresaDestino, mapeamento);
  res.json({ empresa: empresaDestino, contasCopiadas: regras.length });
});

module.exports = router;
