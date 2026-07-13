const request = require('supertest');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../../src/app');

const API_KEY = 'test-api-key-empresa-001';
let app;
let tmpClassificacoes;
let tmpEstruturas;

beforeEach(() => {
  const sufixo = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  tmpClassificacoes = path.join(os.tmpdir(), `classificacoes-contas-test-${sufixo}.json`);
  tmpEstruturas = path.join(os.tmpdir(), `estruturas-contas-test-${sufixo}.json`);
  process.env.CLASSIFICACOES_CONFIG_PATH = tmpClassificacoes;
  process.env.ESTRUTURAS_CONFIG_PATH = tmpEstruturas;
  app = createApp();
});

afterEach(() => {
  if (fs.existsSync(tmpClassificacoes)) fs.unlinkSync(tmpClassificacoes);
  if (fs.existsSync(tmpEstruturas)) fs.unlinkSync(tmpEstruturas);
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

  test('lista as contas unicas da empresa, ainda sem regras', async () => {
    const res = await request(app).get('/api/contabil/contas?empresa=001').set('X-API-KEY', API_KEY);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { conta: '3.1.01.001', descricaoConta: 'Receita de Vendas', regras: [] },
      { conta: '4.1.02.010', descricaoConta: 'Despesas Administrativas', regras: [] },
    ]);
  });
});

describe('POST/PUT/DELETE /api/contabil/contas/:conta/regras', () => {
  test('POST sem empresa retorna 400', async () => {
    const res = await request(app)
      .post('/api/contabil/contas/3.1.01.001/regras')
      .set('X-API-KEY', API_KEY)
      .send({ tags: [] });
    expect(res.status).toBe(400);
  });

  test('POST com empresa fora da lista autorizada retorna 403', async () => {
    const res = await request(app)
      .post('/api/contabil/contas/3.1.01.001/regras?empresa=999')
      .set('X-API-KEY', API_KEY)
      .send({ tags: [] });
    expect(res.status).toBe(403);
  });

  test('POST com natureza invalida retorna 400', async () => {
    const res = await request(app)
      .post('/api/contabil/contas/3.1.01.001/regras?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ natureza: 'X', tags: [] });
    expect(res.status).toBe(400);
  });

  test('cria a regra e reflete na proxima listagem', async () => {
    const criar = await request(app)
      .post('/api/contabil/contas/3.1.01.001/regras?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ natureza: 'D', tags: [{ relatorio: 'dre', nodeId: 'no-1' }] });
    expect(criar.status).toBe(201);
    expect(criar.body).toMatchObject({ conta: '3.1.01.001', natureza: 'D', centroCusto: null });

    const listar = await request(app).get('/api/contabil/contas?empresa=001').set('X-API-KEY', API_KEY);
    expect(listar.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ conta: '3.1.01.001', regras: [expect.objectContaining({ natureza: 'D' })] }),
      ])
    );
  });

  test('PUT atualiza uma regra existente', async () => {
    const criar = await request(app)
      .post('/api/contabil/contas/3.1.01.001/regras?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ tags: [] });
    const regraId = criar.body.id;

    const atualizar = await request(app)
      .put(`/api/contabil/contas/3.1.01.001/regras/${regraId}?empresa=001`)
      .set('X-API-KEY', API_KEY)
      .send({ centroCusto: '20', tags: [{ relatorio: 'balanco', nodeId: 'no-2' }] });
    expect(atualizar.status).toBe(200);
    expect(atualizar.body).toMatchObject({ id: regraId, centroCusto: '20' });
  });

  test('DELETE remove a regra; 404 se ja nao existir', async () => {
    const criar = await request(app)
      .post('/api/contabil/contas/3.1.01.001/regras?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ tags: [] });
    const regraId = criar.body.id;

    const apagar = await request(app)
      .delete(`/api/contabil/contas/3.1.01.001/regras/${regraId}?empresa=001`)
      .set('X-API-KEY', API_KEY);
    expect(apagar.status).toBe(200);

    const apagarDeNovo = await request(app)
      .delete(`/api/contabil/contas/3.1.01.001/regras/${regraId}?empresa=001`)
      .set('X-API-KEY', API_KEY);
    expect(apagarDeNovo.status).toBe(404);
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

  test('copia estrutura e regras da origem para o destino, remapeando as tags', async () => {
    const criarNo = await request(app)
      .post('/api/contabil/estrutura?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ relatorio: 'dre', nome: 'Receita Operacional' });
    const nodeId = criarNo.body.id;

    await request(app)
      .post('/api/contabil/contas/3.1.01.001/regras?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ tags: [{ relatorio: 'dre', nodeId }] });

    const copiar = await request(app)
      .post('/api/contabil/contas/copiar')
      .set('X-API-KEY', API_KEY)
      .send({ empresaOrigem: '001', empresaDestino: '002' });
    expect(copiar.status).toBe(200);
    expect(copiar.body).toEqual({ empresa: '002', contasCopiadas: 1 });

    const estruturaDestino = await request(app).get('/api/contabil/estrutura?empresa=002&relatorio=dre').set('X-API-KEY', API_KEY);
    expect(estruturaDestino.body).toHaveLength(1);
    const novoNodeId = estruturaDestino.body[0].id;
    expect(novoNodeId).not.toBe(nodeId);

    const listar = await request(app).get('/api/contabil/contas?empresa=002').set('X-API-KEY', API_KEY);
    expect(listar.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conta: '3.1.01.001',
          regras: [expect.objectContaining({ tags: [{ relatorio: 'dre', nodeId: novoNodeId }] })],
        }),
      ])
    );
  });
});
