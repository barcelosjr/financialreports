const fs = require('fs');
const path = require('path');

// Le o env diretamente (em vez de via config.js) para que o caminho do
// arquivo possa ser trocado em runtime nos testes sem precisar recarregar o
// modulo config (que cacheia os valores lidos na primeira chamada).
function getFilePath() {
  return path.resolve(process.env.CLASSIFICACOES_CONFIG_PATH || './classificacoes.json');
}

/**
 * Classificacoes de conta contabil por empresa (DRE / Balanco / Fluxo de
 * Caixa), configuradas manualmente na pagina de administracao. Guardadas em
 * um arquivo JSON simples (mesmo padrao de clients.json) — nao ha volume nem
 * concorrencia que justifiquem um banco de dados aqui.
 *
 * Formato: { "<EMPRESA>": { "<CONTA>": { dre, balanco, fluxoCaixa } } }
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
  return all[empresa] || {};
}

function setConta(empresa, conta, flags) {
  const all = loadAll();
  if (!all[empresa]) all[empresa] = {};

  const salvo = {
    dre: !!flags.dre,
    balanco: !!flags.balanco,
    fluxoCaixa: !!flags.fluxoCaixa,
  };
  all[empresa][conta] = salvo;
  saveAll(all);
  return salvo;
}

/**
 * Copia todas as classificacoes de uma empresa para outra, sobrescrevendo na
 * empresa de destino qualquer classificacao ja existente para as mesmas
 * contas (contas do destino que nao existem na origem sao preservadas).
 */
function copyEmpresa(empresaOrigem, empresaDestino) {
  const all = loadAll();
  const origem = all[empresaOrigem] || {};
  all[empresaDestino] = { ...(all[empresaDestino] || {}), ...JSON.parse(JSON.stringify(origem)) };
  saveAll(all);
  return all[empresaDestino];
}

module.exports = { getEmpresa, setConta, copyEmpresa };
