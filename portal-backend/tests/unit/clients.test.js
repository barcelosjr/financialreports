jest.mock('fs');
const fs = require('fs');
const { loadClients } = require('../../src/clients');

beforeEach(() => {
  jest.clearAllMocks();
});

test('arquivo ausente lanca erro claro', () => {
  fs.existsSync.mockReturnValue(false);
  expect(() => loadClients()).toThrow(/nao encontrado/i);
});

test('JSON invalido lanca erro', () => {
  fs.existsSync.mockReturnValue(true);
  fs.readFileSync.mockReturnValue('{not json');
  expect(() => loadClients()).toThrow(/nao e um JSON valido/i);
});

test('lista vazia lanca erro', () => {
  fs.existsSync.mockReturnValue(true);
  fs.readFileSync.mockReturnValue(JSON.stringify([]));
  expect(() => loadClients()).toThrow(/pelo menos um cliente/i);
});

test('entrada sem apiKey lanca erro', () => {
  fs.existsSync.mockReturnValue(true);
  fs.readFileSync.mockReturnValue(JSON.stringify([{ cliente: 'X', empresas: ['001'] }]));
  expect(() => loadClients()).toThrow(/apiKey/);
});

test('entrada sem empresas (lista vazia) lanca erro', () => {
  fs.existsSync.mockReturnValue(true);
  fs.readFileSync.mockReturnValue(JSON.stringify([{ apiKey: 'k1', cliente: 'X', empresas: [] }]));
  expect(() => loadClients()).toThrow(/empresas/);
});

test('apiKey duplicada lanca erro', () => {
  fs.existsSync.mockReturnValue(true);
  fs.readFileSync.mockReturnValue(
    JSON.stringify([
      { apiKey: 'dup', cliente: 'A', empresas: ['001'] },
      { apiKey: 'dup', cliente: 'B', empresas: ['002'] },
    ])
  );
  expect(() => loadClients()).toThrow(/duplicada/);
});

test('caso valido retorna Map com cliente e empresas corretos', () => {
  fs.existsSync.mockReturnValue(true);
  fs.readFileSync.mockReturnValue(
    JSON.stringify([{ apiKey: 'k1', cliente: 'Cliente X', empresas: ['001', '002'] }])
  );
  const result = loadClients();
  expect(result.get('k1')).toEqual({ cliente: 'Cliente X', empresas: ['001', '002'] });
});
