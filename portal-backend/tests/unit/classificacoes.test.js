const fs = require('fs');
const os = require('os');
const path = require('path');

let tmpFile;

function freshClassificacoes() {
  jest.resetModules();
  process.env.CLASSIFICACOES_CONFIG_PATH = tmpFile;
  return require('../../src/classificacoes');
}

beforeEach(() => {
  tmpFile = path.join(os.tmpdir(), `classificacoes-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
});

afterEach(() => {
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
});

test('getEmpresa retorna objeto vazio quando o arquivo nao existe', () => {
  const classificacoes = freshClassificacoes();
  expect(classificacoes.getEmpresa('KOBE')).toEqual({});
});

test('setConta cria o arquivo e salva a classificacao (normalizando pra booleano)', () => {
  const classificacoes = freshClassificacoes();
  const salvo = classificacoes.setConta('KOBE', '123', { dre: true, balanco: 'sim', fluxoCaixa: undefined });

  expect(salvo).toEqual({ dre: true, balanco: true, fluxoCaixa: false });
  expect(fs.existsSync(tmpFile)).toBe(true);
  expect(classificacoes.getEmpresa('KOBE')).toEqual({ '123': { dre: true, balanco: true, fluxoCaixa: false } });
});

test('setConta preserva outras contas/empresas ja salvas', () => {
  const classificacoes = freshClassificacoes();
  classificacoes.setConta('KOBE', '123', { dre: true });
  classificacoes.setConta('KOBE', '456', { balanco: true });
  classificacoes.setConta('ROYAL', '123', { fluxoCaixa: true });

  expect(classificacoes.getEmpresa('KOBE')).toEqual({
    '123': { dre: true, balanco: false, fluxoCaixa: false },
    '456': { dre: false, balanco: true, fluxoCaixa: false },
  });
  expect(classificacoes.getEmpresa('ROYAL')).toEqual({ '123': { dre: false, balanco: false, fluxoCaixa: true } });
});

test('copyEmpresa copia as contas da origem para o destino, sobrescrevendo conflitos', () => {
  const classificacoes = freshClassificacoes();
  classificacoes.setConta('KOBE', '123', { dre: true });
  classificacoes.setConta('KOBE', '456', { balanco: true });
  classificacoes.setConta('ROYAL', '123', { fluxoCaixa: true });
  classificacoes.setConta('ROYAL', '999', { dre: true });

  const resultado = classificacoes.copyEmpresa('KOBE', 'ROYAL');

  expect(resultado).toEqual({
    '999': { dre: true, balanco: false, fluxoCaixa: false },
    '123': { dre: true, balanco: false, fluxoCaixa: false },
    '456': { dre: false, balanco: true, fluxoCaixa: false },
  });
});

test('arquivo com JSON invalido lanca erro claro', () => {
  fs.writeFileSync(tmpFile, '{not json');
  const classificacoes = freshClassificacoes();
  expect(() => classificacoes.getEmpresa('KOBE')).toThrow(/nao e um JSON valido/i);
});
