const request = require('supertest');
const { createApp } = require('../../src/app');

const API_KEY = 'test-api-key-empresa-001';
let app;

beforeEach(() => {
  app = createApp();
});

test('sem X-API-KEY retorna 401', async () => {
  const res = await request(app).get(
    '/api/contabil/balancete?periodoInicio=2026-07&periodoFim=2026-07'
  );
  expect(res.status).toBe(401);
});

test('API key invalida retorna 401', async () => {
  const res = await request(app)
    .get('/api/contabil/balancete?periodoInicio=2026-07&periodoFim=2026-07')
    .set('X-API-KEY', 'invalida');
  expect(res.status).toBe(401);
});

test('sem periodoInicio/periodoFim retorna 400', async () => {
  const res = await request(app).get('/api/contabil/balancete').set('X-API-KEY', API_KEY);
  expect(res.status).toBe(400);
});

test('formato de periodo invalido retorna 400', async () => {
  const res = await request(app)
    .get('/api/contabil/balancete?periodoInicio=2026-13&periodoFim=2026-07')
    .set('X-API-KEY', API_KEY);
  expect(res.status).toBe(400);
});

test('periodoInicio posterior a periodoFim retorna 400', async () => {
  const res = await request(app)
    .get('/api/contabil/balancete?periodoInicio=2026-09&periodoFim=2026-08')
    .set('X-API-KEY', API_KEY);
  expect(res.status).toBe(400);
});

test('empresa fora da lista autorizada retorna 403', async () => {
  const res = await request(app)
    .get('/api/contabil/balancete?periodoInicio=2026-01&periodoFim=2026-12&empresa=999')
    .set('X-API-KEY', API_KEY);
  expect(res.status).toBe(403);
});

test('centroCusto nao numerico retorna 400', async () => {
  const res = await request(app)
    .get('/api/contabil/balancete?periodoInicio=2026-02&periodoFim=2026-02&centroCusto=abc')
    .set('X-API-KEY', API_KEY);
  expect(res.status).toBe(400);
});

test('caminho feliz retorna array agregado esperado (compara com mockData)', async () => {
  const res = await request(app)
    .get('/api/contabil/balancete?periodoInicio=2026-03&periodoFim=2026-08')
    .set('X-API-KEY', API_KEY);

  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  expect(res.body).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        empresa: '001',
        conta: '3.1.01.001',
        debito: 1250,
        credito: 45000,
        saldo: 1250 - 45000,
      }),
      expect.objectContaining({
        empresa: '002',
        conta: '3.1.01.001',
        debito: 0,
        credito: 12000,
        saldo: -12000,
      }),
    ])
  );
});

test('filtro por :conta retorna somente linhas dessa conta', async () => {
  const res = await request(app)
    .get('/api/contabil/balancete/4.1.02.010?periodoInicio=2026-04&periodoFim=2026-07')
    .set('X-API-KEY', API_KEY);

  expect(res.status).toBe(200);
  expect(res.body.length).toBeGreaterThan(0);
  expect(res.body.every((r) => r.conta === '4.1.02.010')).toBe(true);
});

test('header X-Cache-Stale ausente em resposta fresca', async () => {
  const res = await request(app)
    .get('/api/contabil/balancete?periodoInicio=2026-05&periodoFim=2026-05')
    .set('X-API-KEY', API_KEY);
  expect(res.headers['x-cache-stale']).toBeUndefined();
});
