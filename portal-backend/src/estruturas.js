const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RELATORIOS = ['dre', 'balanco', 'fluxoCaixa'];
const SINAIS = ['+', '-', '='];
const SINAL_PADRAO = '+';

// Le o env diretamente (mesmo padrao de classificacoes.js) para que o caminho
// do arquivo possa ser trocado em runtime nos testes sem recarregar config.js.
function getFilePath() {
  return path.resolve(process.env.ESTRUTURAS_CONFIG_PATH || './estruturas.json');
}

function validarRelatorio(relatorio) {
  if (!RELATORIOS.includes(relatorio)) {
    throw new Error(`Relatório inválido: "${relatorio}". Use um de: ${RELATORIOS.join(', ')}.`);
  }
}

function validarSinal(sinal) {
  if (!SINAIS.includes(sinal)) {
    throw new Error(`Campo "sinal" inválido: "${sinal}". Use um de: ${SINAIS.join(', ')}.`);
  }
}

/**
 * Estrutura hierarquica (grupos/subgrupos) de cada relatorio, definida
 * livremente por empresa. Guardada em arquivo JSON simples (mesmo padrao de
 * clients.json/classificacoes.json) como lista plana por relatorio, com
 * parentId representando a arvore. "sinal" indica se a linha soma ("+"),
 * subtrai ("-") ou e um subtotal/resultado ("=") das linhas anteriores —
 * usado futuramente pelo motor de calculo do relatorio.
 *
 * Formato: { "<EMPRESA>": { dre: [{id,nome,parentId,ordem,sinal}], balanco: [...], fluxoCaixa: [...] } }
 */
function loadAll() {
  const filePath = getFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(`Arquivo de estruturas em "${filePath}" nao e um JSON valido: ${err.message}`);
  }
}

function saveAll(data) {
  fs.writeFileSync(getFilePath(), JSON.stringify(data, null, 2));
}

function getEmpresaRelatorio(all, empresa, relatorio) {
  if (!all[empresa]) all[empresa] = {};
  if (!all[empresa][relatorio]) all[empresa][relatorio] = [];
  return all[empresa][relatorio];
}

// Nos salvos antes do campo "sinal" existir nao o tem — trata como "+" (soma),
// o comportamento mais comum, sem precisar reescrever o arquivo em disco.
function comSinalPadrao(no) {
  return no.sinal ? no : { ...no, sinal: SINAL_PADRAO };
}

function getEstrutura(empresa, relatorio) {
  validarRelatorio(relatorio);
  const all = loadAll();
  const nos = (all[empresa] && all[empresa][relatorio]) || [];
  return nos.map(comSinalPadrao);
}

function addNode(empresa, relatorio, { nome, parentId = null, sinal = SINAL_PADRAO }) {
  validarRelatorio(relatorio);
  if (!nome || typeof nome !== 'string' || !nome.trim()) {
    throw new Error('Campo "nome" é obrigatório.');
  }
  validarSinal(sinal);

  const all = loadAll();
  const nos = getEmpresaRelatorio(all, empresa, relatorio);

  if (parentId !== null && !nos.some((n) => n.id === parentId)) {
    throw new Error(`Nó pai "${parentId}" não encontrado.`);
  }

  const irmaos = nos.filter((n) => n.parentId === parentId);
  const novo = {
    id: crypto.randomUUID(),
    nome: nome.trim(),
    parentId,
    ordem: irmaos.length,
    sinal,
  };
  nos.push(novo);
  saveAll(all);
  return novo;
}

/**
 * Atualiza nome e/ou sinal de um no existente (campos omitidos permanecem
 * inalterados).
 */
function updateNode(empresa, relatorio, id, { nome, sinal } = {}) {
  validarRelatorio(relatorio);
  if (nome !== undefined && (typeof nome !== 'string' || !nome.trim())) {
    throw new Error('Campo "nome" não pode ser vazio.');
  }
  if (sinal !== undefined) validarSinal(sinal);

  const all = loadAll();
  const nos = getEmpresaRelatorio(all, empresa, relatorio);
  const no = nos.find((n) => n.id === id);
  if (!no) throw new Error(`Nó "${id}" não encontrado.`);

  if (nome !== undefined) no.nome = nome.trim();
  if (sinal !== undefined) no.sinal = sinal;
  saveAll(all);
  return comSinalPadrao(no);
}

/**
 * Troca a "ordem" do no com a de seu irmao adjacente (mesma parentId).
 * Nao faz nada (retorna o estado atual) se ja estiver na ponta da lista.
 */
function moveNode(empresa, relatorio, id, direcao) {
  validarRelatorio(relatorio);
  if (direcao !== 'up' && direcao !== 'down') {
    throw new Error('Campo "direcao" deve ser "up" ou "down".');
  }

  const all = loadAll();
  const nos = getEmpresaRelatorio(all, empresa, relatorio);
  const no = nos.find((n) => n.id === id);
  if (!no) throw new Error(`Nó "${id}" não encontrado.`);

  const irmaos = nos.filter((n) => n.parentId === no.parentId).sort((a, b) => a.ordem - b.ordem);
  const idx = irmaos.findIndex((n) => n.id === id);
  const alvoIdx = direcao === 'up' ? idx - 1 : idx + 1;

  if (alvoIdx < 0 || alvoIdx >= irmaos.length) {
    return nos.filter((n) => n.parentId === no.parentId);
  }

  const alvo = irmaos[alvoIdx];
  const ordemTemp = no.ordem;
  no.ordem = alvo.ordem;
  alvo.ordem = ordemTemp;

  saveAll(all);
  return nos.filter((n) => n.parentId === no.parentId);
}

/**
 * Remove um no e todos os seus descendentes (cascade). Retorna a lista de ids
 * removidos, usada por routes/estrutura.js para limpar tags orfas em
 * classificacoes.js.
 */
function deleteNode(empresa, relatorio, id) {
  validarRelatorio(relatorio);
  const all = loadAll();
  const nos = getEmpresaRelatorio(all, empresa, relatorio);

  const idsParaRemover = new Set();
  function coletarDescendentes(nodeId) {
    idsParaRemover.add(nodeId);
    for (const n of nos) {
      if (n.parentId === nodeId) coletarDescendentes(n.id);
    }
  }
  coletarDescendentes(id);

  all[empresa][relatorio] = nos.filter((n) => !idsParaRemover.has(n.id));
  saveAll(all);
  return Array.from(idsParaRemover);
}

/**
 * Sobrescreve a estrutura inteira do destino com uma copia da origem (ids
 * novos, mesma arvore/nomes/ordem). Retorna o mapeamento oldId->newId por
 * relatorio, usado por classificacoes.copyEmpresa para remapear as tags
 * copiadas junto.
 */
function copyEmpresaComMapeamento(empresaOrigem, empresaDestino) {
  const all = loadAll();
  const origem = all[empresaOrigem] || {};
  const mapeamento = {};
  const destino = {};

  for (const relatorio of RELATORIOS) {
    const nosOrigem = origem[relatorio] || [];
    const mapaRelatorio = {};
    const nosDestino = nosOrigem.map((n) => {
      const novoId = crypto.randomUUID();
      mapaRelatorio[n.id] = novoId;
      return { ...n, id: novoId };
    });
    // Remapeia parentId apos gerar todos os ids novos.
    nosDestino.forEach((n) => {
      if (n.parentId !== null) n.parentId = mapaRelatorio[n.parentId];
    });
    destino[relatorio] = nosDestino;
    mapeamento[relatorio] = mapaRelatorio;
  }

  all[empresaDestino] = destino;
  saveAll(all);
  return mapeamento;
}

module.exports = {
  RELATORIOS,
  SINAIS,
  getEstrutura,
  addNode,
  updateNode,
  moveNode,
  deleteNode,
  copyEmpresaComMapeamento,
};
