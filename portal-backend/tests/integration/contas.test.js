const request = require('supertest');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../../src/app');

const API_KEY = 'test-api-key-empresa-001';
let app;
let tmpFile;

beforeEach(() => {
  tmpFile = path.join(os.tmpdir(), `classificacoes-contas-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  process.env.CLASSIFICACOES_CONFIG_PATH = tmpFile;
  app = createApp();
});

afterEach(() => {
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
});

describe('GET /api/contabil/empresas', () => {
  test('sem X-API-KEY retorna 401', async () => {
    const res = await request(app).get('/api/contabil/empresas');
    expect(res.status).toBe(401);
  });

  test('retorna as empresas autorizadas para a API key', async () => {
    const res = await request(app).get('/api/contabil/empresas').set('X-API-KEY', API_KEY);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ empresas: ['001', '002'] });
  });
});

describe('GET /api/contabil/contas', () => {
  test('sem X-API-KEY retorna 401', async () => {
    const res = await request(app).get('/api/contabil/contas?empresa=001');
    expect(res.status).toBe(401);
  });

  test('sem empresa retorna 400', async () => {
    const res = await request(app).get('/api/contabil/contas').set('X-API-KEY', API_KEY);
    expect(res.status).toBe(400);
  });

  test('empresa fora da lista autorizada retorna 403', async () => {
    const res = await request(app).get('/api/contabil/contas?empresa=999').set('X-API-KEY', API_KEY);
    expect(res.status).toBe(403);
  });

  test('lista as contas unicas da empresa, ainda sem classificacao', async () => {
    const res = await request(app).get('/api/contabil/contas?empresa=001').set('X-API-KEY', API_KEY);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { conta: '3.1.01.001', descricaoConta: 'Receita de Vendas', dre: false, balanco: false, fluxoCaixa: false },
      { conta: '4.1.02.010', descricaoConta: 'Despesas Administrativas', dre: false, balanco: false, fluxoCaixa: false },
    ]);
  });
});

describe('PUT /api/contabil/contas/:conta', () => {
  test('sem empresa retorna 400', async () => {
    const res = await request(app)
      .put('/api/contabil/contas/3.1.01.001')
      .set('X-API-KEY', API_KEY)
      .send({ dre: true });
    expect(res.status).toBe(400);
  });

  test('empresa fora da lista autorizada retorna 403', async () => {
    const res = await request(app)
      .put('/api/contabil/contas/3.1.01.001?empresa=999')
      .set('X-API-KEY', API_KEY)
      .send({ dre: true });
    expect(res.status).toBe(403);
  });

  test('campo nao booleano retorna 400', async () => {
    const res = await request(app)
      .put('/api/contabil/contas/3.1.01.001?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ dre: 'sim' });
    expect(res.status).toBe(400);
  });

  test('salva a classificacao e reflete na proxima listagem', async () => {
    const salvar = await request(app)
      .put('/api/contabil/contas/3.1.01.001?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ dre: true, fluxoCaixa: true });
    expect(salvar.status).toBe(200);
    expect(salvar.body).toEqual({ conta: '3.1.01.001', dre: true, balanco: false, fluxoCaixa: true });

    const listar = await request(app).get('/api/contabil/contas?empresa=001').set('X-API-KEY', API_KEY);
    expect(listar.body).toEqual(
      expect.arrayContaining([
        { conta: '3.1.01.001', descricaoConta: 'Receita de Vendas', dre: true, balanco: false, fluxoCaixa: true },
      ])
    );
  });
});

describe('POST /api/contabil/contas/copiar', () => {
  test('sem empresaOrigem/empresaDestino retorna 400', async () => {
    const res = await request(app).post('/api/contabil/contas/copiar').set('X-API-KEY', API_KEY).send({});
    expect(res.status).toBe(400);
  });

  test('origem igual a destino retorna 400', async () => {
    const res = await request(app)
      .post('/api/contabil/contas/copiar')
      .set('X-API-KEY', API_KEY)
      .send({ empresaOrigem: '001', empresaDestino: '001' });
    expect(res.status).toBe(400);
  });

  test('empresa nao autorizada retorna 403', async () => {
    const res = await request(app)
      .post('/api/contabil/contas/copiar')
      .set('X-API-KEY', API_KEY)
      .send({ empresaOrigem: '001', empresaDestino: '999' });
    expect(res.status).toBe(403);
  });

  test('copia as classificacoes da origem para o destino', async () => {
    await request(app)
      .put('/api/contabil/contas/3.1.01.001?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ dre: true });
    await request(app)
      .put('/api/contabil/contas/4.1.02.010?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ balanco: true });

    const copiar = await request(app)
      .post('/api/contabil/contas/copiar')
      .set('X-API-KEY', API_KEY)
      .send({ empresaOrigem: '001', empresaDestino: '002' });
    expect(copiar.status).toBe(200);
    expect(copiar.body).toEqual({ empresa: '002', contasCopiadas: 2 });

    const listar = await request(app).get('/api/contabil/contas?empresa=002').set('X-API-KEY', API_KEY);
    expect(listar.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ conta: '3.1.01.001', dre: true }),
      ])
    );
  });
});
