const fs = require('fs');
const os = require('os');
const path = require('path');

let tmpFile;

function freshEstruturas() {
  jest.resetModules();
  process.env.ESTRUTURAS_CONFIG_PATH = tmpFile;
  return require('../../src/estruturas');
}

beforeEach(() => {
  tmpFile = path.join(os.tmpdir(), `estruturas-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
});

afterEach(() => {
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
});

test('getEstrutura retorna lista vazia quando o arquivo nao existe', () => {
  const estruturas = freshEstruturas();
  expect(estruturas.getEstrutura('KOBE', 'dre')).toEqual([]);
});

test('getEstrutura rejeita relatorio invalido', () => {
  const estruturas = freshEstruturas();
  expect(() => estruturas.getEstrutura('KOBE', 'invalido')).toThrow(/Relatório inválido/);
});

test('addNode cria no raiz com ordem incremental entre irmaos e sinal padrao "+"', () => {
  const estruturas = freshEstruturas();
  const a = estruturas.addNode('KOBE', 'dre', { nome: 'Receita' });
  const b = estruturas.addNode('KOBE', 'dre', { nome: 'Despesa', sinal: '-' });

  expect(a.parentId).toBeNull();
  expect(a.ordem).toBe(0);
  expect(a.sinal).toBe('+');
  expect(b.ordem).toBe(1);
  expect(b.sinal).toBe('-');
  expect(estruturas.getEstrutura('KOBE', 'dre')).toHaveLength(2);
});

test('addNode rejeita sinal invalido', () => {
  const estruturas = freshEstruturas();
  expect(() => estruturas.addNode('KOBE', 'dre', { nome: 'X', sinal: '*' })).toThrow(/"sinal" inválido/);
});

test('getEstrutura preenche sinal "+" para nos salvos antes desse campo existir', () => {
  const estruturas = freshEstruturas();
  fs.writeFileSync(tmpFile, JSON.stringify({
    KOBE: { dre: [{ id: 'legado-1', nome: 'Receita Antiga', parentId: null, ordem: 0 }] }, balanco: [], fluxoCaixa: [],
  }));
  const nos = estruturas.getEstrutura('KOBE', 'dre');
  expect(nos).toEqual([{ id: 'legado-1', nome: 'Receita Antiga', parentId: null, ordem: 0, sinal: '+' }]);
});

test('addNode com parentId inexistente lanca erro', () => {
  const estruturas = freshEstruturas();
  expect(() => estruturas.addNode('KOBE', 'dre', { nome: 'X', parentId: 'nao-existe' })).toThrow(/não encontrado/);
});

test('addNode cria subitem filho de um no existente', () => {
  const estruturas = freshEstruturas();
  const pai = estruturas.addNode('KOBE', 'dre', { nome: 'Receita' });
  const filho = estruturas.addNode('KOBE', 'dre', { nome: 'Vendas', parentId: pai.id });

  expect(filho.parentId).toBe(pai.id);
  expect(filho.ordem).toBe(0);
});

test('updateNode atualiza o nome mantendo id/parentId/ordem/sinal', () => {
  const estruturas = freshEstruturas();
  const no = estruturas.addNode('KOBE', 'dre', { nome: 'Receita' });
  const renomeado = estruturas.updateNode('KOBE', 'dre', no.id, { nome: 'Receita Operacional' });

  expect(renomeado).toEqual({ ...no, nome: 'Receita Operacional' });
});

test('updateNode atualiza so o sinal quando nome nao e informado', () => {
  const estruturas = freshEstruturas();
  const no = estruturas.addNode('KOBE', 'dre', { nome: 'Receita' });
  const atualizado = estruturas.updateNode('KOBE', 'dre', no.id, { sinal: '=' });

  expect(atualizado).toEqual({ ...no, sinal: '=' });
});

test('updateNode rejeita sinal invalido', () => {
  const estruturas = freshEstruturas();
  const no = estruturas.addNode('KOBE', 'dre', { nome: 'Receita' });
  expect(() => estruturas.updateNode('KOBE', 'dre', no.id, { sinal: '*' })).toThrow(/"sinal" inválido/);
});

test('updateNode com id inexistente lanca erro', () => {
  const estruturas = freshEstruturas();
  expect(() => estruturas.updateNode('KOBE', 'dre', 'nao-existe', { nome: 'X' })).toThrow(/não encontrado/);
});

test('moveNode troca a ordem com o irmao adjacente', () => {
  const estruturas = freshEstruturas();
  const a = estruturas.addNode('KOBE', 'dre', { nome: 'A' });
  const b = estruturas.addNode('KOBE', 'dre', { nome: 'B' });

  estruturas.moveNode('KOBE', 'dre', b.id, 'up');

  const nos = estruturas.getEstrutura('KOBE', 'dre');
  expect(nos.find((n) => n.id === a.id).ordem).toBe(1);
  expect(nos.find((n) => n.id === b.id).ordem).toBe(0);
});

test('moveNode na ponta da lista nao faz nada', () => {
  const estruturas = freshEstruturas();
  const a = estruturas.addNode('KOBE', 'dre', { nome: 'A' });
  estruturas.moveNode('KOBE', 'dre', a.id, 'up');

  const nos = estruturas.getEstrutura('KOBE', 'dre');
  expect(nos.find((n) => n.id === a.id).ordem).toBe(0);
});

test('deleteNode remove o no e todos os descendentes (cascade)', () => {
  const estruturas = freshEstruturas();
  const pai = estruturas.addNode('KOBE', 'dre', { nome: 'Receita' });
  const filho = estruturas.addNode('KOBE', 'dre', { nome: 'Vendas', parentId: pai.id });
  const neto = estruturas.addNode('KOBE', 'dre', { nome: 'Vendas SP', parentId: filho.id });
  const outro = estruturas.addNode('KOBE', 'dre', { nome: 'Despesa' });

  const idsRemovidos = estruturas.deleteNode('KOBE', 'dre', pai.id);

  expect(idsRemovidos.sort()).toEqual([pai.id, filho.id, neto.id].sort());
  expect(estruturas.getEstrutura('KOBE', 'dre')).toEqual([outro]);
});

test('copyEmpresaComMapeamento copia a arvore inteira com ids novos e retorna o mapeamento', () => {
  const estruturas = freshEstruturas();
  const pai = estruturas.addNode('KOBE', 'dre', { nome: 'Receita' });
  const filho = estruturas.addNode('KOBE', 'dre', { nome: 'Vendas', parentId: pai.id });
  estruturas.addNode('KOBE', 'balanco', { nome: 'Ativo' });

  const mapeamento = estruturas.copyEmpresaComMapeamento('KOBE', 'ROYAL');

  const dreDestino = estruturas.getEstrutura('ROYAL', 'dre');
  expect(dreDestino).toHaveLength(2);
  const paiDestino = dreDestino.find((n) => n.parentId === null);
  const filhoDestino = dreDestino.find((n) => n.parentId !== null);
  expect(paiDestino.nome).toBe('Receita');
  expect(filhoDestino.nome).toBe('Vendas');
  expect(filhoDestino.parentId).toBe(paiDestino.id);
  expect(paiDestino.id).not.toBe(pai.id);

  expect(mapeamento.dre[pai.id]).toBe(paiDestino.id);
  expect(mapeamento.dre[filho.id]).toBe(filhoDestino.id);
  expect(estruturas.getEstrutura('ROYAL', 'balanco')).toHaveLength(1);
  expect(estruturas.getEstrutura('ROYAL', 'fluxoCaixa')).toEqual([]);

  // Nao afeta a origem.
  expect(estruturas.getEstrutura('KOBE', 'dre')).toHaveLength(2);
});

test('arquivo com JSON invalido lanca erro claro', () => {
  fs.writeFileSync(tmpFile, '{not json');
  const estruturas = freshEstruturas();
  expect(() => estruturas.getEstrutura('KOBE', 'dre')).toThrow(/nao e um JSON valido/i);
});
