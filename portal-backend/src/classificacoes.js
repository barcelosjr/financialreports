const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RELATORIOS = ['dre', 'balanco', 'fluxoCaixa'];

// Le o env diretamente (em vez de via config.js) para que o caminho do
// arquivo possa ser trocado em runtime nos testes sem precisar recarregar o
// modulo config (que cacheia os valores lidos na primeira chamada).
function getFilePath() {
  return path.resolve(process.env.CLASSIFICACOES_CONFIG_PATH || './classificacoes.json');
}

/**
 * Classificacoes de conta contabil por empresa, guardadas como uma lista de
 * "regras": conta + natureza opcional (D/C) + centro de custo opcional,
 * apontando para uma ou mais tags (linhas da estrutura de DRE/Balanco/Fluxo
 * de Caixa definida em estruturas.js). Uma conta pode ter varias regras (ex:
 * uma por natureza) e uma regra pode ter varias tags no mesmo relatorio (ex:
 * rateada entre duas linhas).
 *
 * Formato: { "<EMPRESA>": [ { id, conta, natureza, centroCusto, tags: [{relatorio, nodeId}] } ] }
 */
function loadAll() {
  const filePath = getFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(`Arquivo de classificacoes em "${filePath}" nao e um JSON valido: ${err.message}`);
  }
}

function saveAll(data) {
  fs.writeFileSync(getFilePath(), JSON.stringify(data, null, 2));
}

function getEmpresa(empresa) {
  const all = loadAll();
  return all[empresa] || [];
}

function getRegrasDaConta(empresa, conta) {
  return getEmpresa(empresa).filter((r) => r.conta === conta);
}

function validarNatureza(natureza) {
  if (natureza !== null && natureza !== undefined && natureza !== 'D' && natureza !== 'C') {
    throw new Error('Campo "natureza" deve ser "D", "C" ou nulo/ausente.');
  }
}

function validarTags(tags) {
  if (!Array.isArray(tags)) {
    throw new Error('Campo "tags" deve ser uma lista.');
  }
  tags.forEach((tag, index) => {
    if (!tag || typeof tag !== 'object') {
      throw new Error(`Tag ${index} inválida.`);
    }
    if (!RELATORIOS.includes(tag.relatorio)) {
      throw new Error(`Tag ${index} tem "relatorio" inválido: "${tag.relatorio}". Use um de: ${RELATORIOS.join(', ')}.`);
    }
    if (!tag.nodeId || typeof tag.nodeId !== 'string') {
      throw new Error(`Tag ${index} está sem "nodeId" válido.`);
    }
  });
}

/**
 * Cria (sem "id") ou atualiza (com "id") uma regra de classificacao. Retorna
 * a regra salva.
 */
function upsertRegra(empresa, { id, conta, natureza = null, centroCusto = null, tags = [] }) {
  if (!conta || typeof conta !== 'string') {
    throw new Error('Campo "conta" é obrigatório.');
  }
  validarNatureza(natureza);
  if (centroCusto !== null && centroCusto !== undefined && typeof centroCusto !== 'string') {
    throw new Error('Campo "centroCusto" deve ser texto ou nulo/ausente.');
  }
  validarTags(tags);

  const all = loadAll();
  if (!all[empresa]) all[empresa] = [];

  const regraSalva = {
    conta,
    natureza: natureza || null,
    centroCusto: centroCusto || null,
    tags: tags.map((t) => ({ relatorio: t.relatorio, nodeId: t.nodeId })),
  };

  if (id) {
    const idx = all[empresa].findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Regra "${id}" não encontrada.`);
    regraSalva.id = id;
    all[empresa][idx] = regraSalva;
  } else {
    regraSalva.id = crypto.randomUUID();
    all[empresa].push(regraSalva);
  }

  saveAll(all);
  return regraSalva;
}

function deleteRegra(empresa, id) {
  const all = loadAll();
  const lista = all[empresa] || [];
  const existia = lista.some((r) => r.id === id);
  all[empresa] = lista.filter((r) => r.id !== id);
  saveAll(all);
  return existia;
}

/**
 * Remove, de todas as regras de uma empresa, qualquer tag que aponte para um
 * dos nodeIds informados (chamado quando um no da estrutura e apagado, para
 * nao deixar tags orfas). Regras que ficarem sem nenhuma tag sao mantidas
 * (podem ter natureza/centroCusto configurados de proposito, aguardando nova
 * tag).
 */
function removerTagsDeNode(empresa, nodeIds) {
  const idsRemovidos = new Set(nodeIds);
  const all = loadAll();
  const lista = all[empresa] || [];
  for (const regra of lista) {
    regra.tags = regra.tags.filter((t) => !idsRemovidos.has(t.nodeId));
  }
  all[empresa] = lista;
  saveAll(all);
}

/**
 * Copia todas as regras de uma empresa para outra, sobrescrevendo as regras
 * ja existentes no destino. As tags sao remapeadas via mapeamentoNodeIds
 * (formato { dre: {oldId:newId}, balanco: {...}, fluxoCaixa: {...} }, vindo
 * de estruturas.copyEmpresaComMapeamento) — tags cujo no de origem nao exista
 * no mapeamento sao descartadas.
 */
function copyEmpresa(empresaOrigem, empresaDestino, mapeamentoNodeIds) {
  const all = loadAll();
  const origem = all[empresaOrigem] || [];

  const destino = origem.map((regra) => ({
    ...regra,
    id: crypto.randomUUID(),
    tags: regra.tags
      .map((t) => {
        const novoId = mapeamentoNodeIds[t.relatorio] && mapeamentoNodeIds[t.relatorio][t.nodeId];
        return novoId ? { relatorio: t.relatorio, nodeId: novoId } : null;
      })
      .filter(Boolean),
  }));

  all[empresaDestino] = destino;
  saveAll(all);
  return destino;
}

module.exports = { getEmpresa, getRegrasDaConta, upsertRegra, deleteRegra, removerTagsDeNode, copyEmpresa };
