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

test('getEmpresa retorna lista vazia quando o arquivo nao existe', () => {
  const classificacoes = freshClassificacoes();
  expect(classificacoes.getEmpresa('KOBE')).toEqual([]);
});

test('upsertRegra sem id cria uma nova regra com id gerado', () => {
  const classificacoes = freshClassificacoes();
  const salvo = classificacoes.upsertRegra('KOBE', {
    conta: '123',
    natureza: 'D',
    tags: [{ relatorio: 'dre', nodeId: 'no-1' }],
  });

  expect(salvo.id).toEqual(expect.any(String));
  expect(salvo).toMatchObject({ conta: '123', natureza: 'D', centroCusto: null, tags: [{ relatorio: 'dre', nodeId: 'no-1' }] });
  expect(fs.existsSync(tmpFile)).toBe(true);
  expect(classificacoes.getEmpresa('KOBE')).toEqual([salvo]);
});

test('upsertRegra com id atualiza a regra existente', () => {
  const classificacoes = freshClassificacoes();
  const criada = classificacoes.upsertRegra('KOBE', { conta: '123', tags: [] });
  const atualizada = classificacoes.upsertRegra('KOBE', {
    id: criada.id,
    conta: '123',
    natureza: 'C',
    centroCusto: '20',
    tags: [{ relatorio: 'balanco', nodeId: 'no-2' }],
  });

  expect(atualizada.id).toBe(criada.id);
  expect(classificacoes.getEmpresa('KOBE')).toEqual([atualizada]);
});

test('upsertRegra com id inexistente lanca erro', () => {
  const classificacoes = freshClassificacoes();
  expect(() => classificacoes.upsertRegra('KOBE', { id: 'nao-existe', conta: '123', tags: [] })).toThrow(/não encontrada/);
});

test('upsertRegra valida conta obrigatoria', () => {
  const classificacoes = freshClassificacoes();
  expect(() => classificacoes.upsertRegra('KOBE', { tags: [] })).toThrow(/"conta" é obrigatório/);
});

test('upsertRegra valida natureza', () => {
  const classificacoes = freshClassificacoes();
  expect(() => classificacoes.upsertRegra('KOBE', { conta: '123', natureza: 'X', tags: [] })).toThrow(/"natureza"/);
});

test('upsertRegra valida relatorio da tag', () => {
  const classificacoes = freshClassificacoes();
  expect(() =>
    classificacoes.upsertRegra('KOBE', { conta: '123', tags: [{ relatorio: 'invalido', nodeId: 'no-1' }] })
  ).toThrow(/relatorio.*inválido/i);
});

test('getRegrasDaConta filtra por conta dentro da empresa', () => {
  const classificacoes = freshClassificacoes();
  classificacoes.upsertRegra('KOBE', { conta: '123', tags: [] });
  classificacoes.upsertRegra('KOBE', { conta: '456', tags: [] });

  expect(classificacoes.getRegrasDaConta('KOBE', '123')).toHaveLength(1);
  expect(classificacoes.getRegrasDaConta('KOBE', '999')).toEqual([]);
});

test('deleteRegra remove a regra e retorna true; false se nao existia', () => {
  const classificacoes = freshClassificacoes();
  const regra = classificacoes.upsertRegra('KOBE', { conta: '123', tags: [] });

  expect(classificacoes.deleteRegra('KOBE', regra.id)).toBe(true);
  expect(classificacoes.getEmpresa('KOBE')).toEqual([]);
  expect(classificacoes.deleteRegra('KOBE', regra.id)).toBe(false);
});

test('removerTagsDeNode limpa apenas as tags que apontam para os nodeIds removidos', () => {
  const classificacoes = freshClassificacoes();
  const regra = classificacoes.upsertRegra('KOBE', {
    conta: '123',
    tags: [
      { relatorio: 'dre', nodeId: 'no-apagado' },
      { relatorio: 'balanco', nodeId: 'no-mantido' },
    ],
  });

  classificacoes.removerTagsDeNode('KOBE', ['no-apagado']);

  const [atualizada] = classificacoes.getRegrasDaConta('KOBE', '123');
  expect(atualizada.id).toBe(regra.id);
  expect(atualizada.tags).toEqual([{ relatorio: 'balanco', nodeId: 'no-mantido' }]);
});

test('copyEmpresa copia as regras remapeando os nodeIds das tags via mapeamento', () => {
  const classificacoes = freshClassificacoes();
  classificacoes.upsertRegra('KOBE', {
    conta: '123',
    natureza: 'D',
    tags: [
      { relatorio: 'dre', nodeId: 'old-1' },
      { relatorio: 'balanco', nodeId: 'sem-mapeamento' },
    ],
  });

  const mapeamento = { dre: { 'old-1': 'new-1' }, balanco: {}, fluxoCaixa: {} };
  const destino = classificacoes.copyEmpresa('KOBE', 'ROYAL', mapeamento);

  expect(destino).toHaveLength(1);
  expect(destino[0].conta).toBe('123');
  expect(destino[0].id).toEqual(expect.any(String));
  // Tag sem mapeamento correspondente e descartada (nao aponta pra lugar nenhum no destino).
  expect(destino[0].tags).toEqual([{ relatorio: 'dre', nodeId: 'new-1' }]);
  expect(classificacoes.getEmpresa('ROYAL')).toEqual(destino);

  // Nao afeta a origem.
  expect(classificacoes.getEmpresa('KOBE')).toHaveLength(1);
});

test('arquivo com JSON invalido lanca erro claro', () => {
  fs.writeFileSync(tmpFile, '{not json');
  const classificacoes = freshClassificacoes();
  expect(() => classificacoes.getEmpresa('KOBE')).toThrow(/nao e um JSON valido/i);
});
