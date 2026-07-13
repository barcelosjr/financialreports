const express = require('express');
const estruturas = require('../estruturas');
const classificacoes = require('../classificacoes');
const { parseEmpresa } = require('../utils');

const router = express.Router();

function parseRelatorio(req, res) {
  const { relatorio } = req.query.relatorio !== undefined ? req.query : req.body || {};
  if (!relatorio || !estruturas.RELATORIOS.includes(relatorio)) {
    res.status(400).json({ error: `Parâmetro "relatorio" é obrigatório e deve ser um de: ${estruturas.RELATORIOS.join(', ')}.` });
    return null;
  }
  return relatorio;
}

// GET /api/contabil/estrutura?empresa=X&relatorio=dre
router.get('/', (req, res) => {
  const empresa = parseEmpresa(req, res);
  if (!empresa) return;
  const relatorio = parseRelatorio(req, res);
  if (!relatorio) return;

  res.json(estruturas.getEstrutura(empresa, relatorio));
});

// POST /api/contabil/estrutura?empresa=X  { relatorio, nome, parentId, sinal }
router.post('/', (req, res) => {
  const empresa = parseEmpresa(req, res);
  if (!empresa) return;
  const relatorio = parseRelatorio(req, res);
  if (!relatorio) return;

  try {
    const no = estruturas.addNode(empresa, relatorio, {
      nome: req.body?.nome,
      parentId: req.body?.parentId ?? null,
      sinal: req.body?.sinal,
    });
    res.status(201).json(no);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/contabil/estrutura/:id?empresa=X&relatorio=dre  { nome?, sinal? }
router.put('/:id', (req, res) => {
  const empresa = parseEmpresa(req, res);
  if (!empresa) return;
  const relatorio = parseRelatorio(req, res);
  if (!relatorio) return;

  try {
    const no = estruturas.updateNode(empresa, relatorio, req.params.id, {
      nome: req.body?.nome,
      sinal: req.body?.sinal,
    });
    res.json(no);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/contabil/estrutura/:id/mover?empresa=X&relatorio=dre  { direcao }
router.post('/:id/mover', (req, res) => {
  const empresa = parseEmpresa(req, res);
  if (!empresa) return;
  const relatorio = parseRelatorio(req, res);
  if (!relatorio) return;

  try {
    const irmaos = estruturas.moveNode(empresa, relatorio, req.params.id, req.body?.direcao);
    res.json(irmaos);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/contabil/estrutura/:id?empresa=X&relatorio=dre
router.delete('/:id', (req, res) => {
  const empresa = parseEmpresa(req, res);
  if (!empresa) return;
  const relatorio = parseRelatorio(req, res);
  if (!relatorio) return;

  try {
    const idsRemovidos = estruturas.deleteNode(empresa, relatorio, req.params.id);
    classificacoes.removerTagsDeNode(empresa, idsRemovidos);
    res.json({ idsRemovidos });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
