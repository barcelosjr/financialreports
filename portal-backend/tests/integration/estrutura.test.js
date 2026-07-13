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
  tmpClassificacoes = path.join(os.tmpdir(), `classificacoes-estrutura-test-${sufixo}.json`);
  tmpEstruturas = path.join(os.tmpdir(), `estruturas-estrutura-test-${sufixo}.json`);
  process.env.CLASSIFICACOES_CONFIG_PATH = tmpClassificacoes;
  process.env.ESTRUTURAS_CONFIG_PATH = tmpEstruturas;
  app = createApp();
});

afterEach(() => {
  if (fs.existsSync(tmpClassificacoes)) fs.unlinkSync(tmpClassificacoes);
  if (fs.existsSync(tmpEstruturas)) fs.unlinkSync(tmpEstruturas);
});

describe('GET /api/contabil/estrutura', () => {
  test('sem X-API-KEY retorna 401', async () => {
    const res = await request(app).get('/api/contabil/estrutura?empresa=001&relatorio=dre');
    expect(res.status).toBe(401);
  });

  test('sem empresa retorna 400', async () => {
    const res = await request(app).get('/api/contabil/estrutura?relatorio=dre').set('X-API-KEY', API_KEY);
    expect(res.status).toBe(400);
  });

  test('empresa fora da lista autorizada retorna 403', async () => {
    const res = await request(app).get('/api/contabil/estrutura?empresa=999&relatorio=dre').set('X-API-KEY', API_KEY);
    expect(res.status).toBe(403);
  });

  test('relatorio invalido retorna 400', async () => {
    const res = await request(app).get('/api/contabil/estrutura?empresa=001&relatorio=invalido').set('X-API-KEY', API_KEY);
    expect(res.status).toBe(400);
  });

  test('retorna lista vazia quando nao ha nenhum no', async () => {
    const res = await request(app).get('/api/contabil/estrutura?empresa=001&relatorio=dre').set('X-API-KEY', API_KEY);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/contabil/estrutura', () => {
  test('cria no raiz com sinal padrao "+"', async () => {
    const res = await request(app)
      .post('/api/contabil/estrutura?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ relatorio: 'dre', nome: 'Receita Operacional' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nome: 'Receita Operacional', parentId: null, ordem: 0, sinal: '+' });
  });

  test('cria no com sinal explicito', async () => {
    const res = await request(app)
      .post('/api/contabil/estrutura?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ relatorio: 'dre', nome: 'Receita Líquida', sinal: '=' });
    expect(res.status).toBe(201);
    expect(res.body.sinal).toBe('=');
  });

  test('sinal invalido retorna 400', async () => {
    const res = await request(app)
      .post('/api/contabil/estrutura?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ relatorio: 'dre', nome: 'X', sinal: '*' });
    expect(res.status).toBe(400);
  });

  test('cria subitem com parentId', async () => {
    const raiz = await request(app)
      .post('/api/contabil/estrutura?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ relatorio: 'dre', nome: 'Receita Operacional' });

    const filho = await request(app)
      .post('/api/contabil/estrutura?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ relatorio: 'dre', nome: 'Receita de Vendas', parentId: raiz.body.id });
    expect(filho.status).toBe(201);
    expect(filho.body.parentId).toBe(raiz.body.id);
  });

  test('sem nome retorna 400', async () => {
    const res = await request(app)
      .post('/api/contabil/estrutura?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ relatorio: 'dre' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/contabil/estrutura/:id', () => {
  test('renomeia o no', async () => {
    const criado = await request(app)
      .post('/api/contabil/estrutura?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ relatorio: 'dre', nome: 'Receita' });

    const renomeado = await request(app)
      .put(`/api/contabil/estrutura/${criado.body.id}?empresa=001&relatorio=dre`)
      .set('X-API-KEY', API_KEY)
      .send({ nome: 'Receita Operacional' });
    expect(renomeado.status).toBe(200);
    expect(renomeado.body.nome).toBe('Receita Operacional');
    expect(renomeado.body.sinal).toBe('+');
  });

  test('atualiza so o sinal, mantendo o nome', async () => {
    const criado = await request(app)
      .post('/api/contabil/estrutura?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ relatorio: 'dre', nome: 'Receita Líquida' });

    const atualizado = await request(app)
      .put(`/api/contabil/estrutura/${criado.body.id}?empresa=001&relatorio=dre`)
      .set('X-API-KEY', API_KEY)
      .send({ sinal: '=' });
    expect(atualizado.status).toBe(200);
    expect(atualizado.body).toMatchObject({ nome: 'Receita Líquida', sinal: '=' });
  });
});

describe('POST /api/contabil/estrutura/:id/mover', () => {
  test('troca a ordem com o irmao adjacente', async () => {
    const a = await request(app)
      .post('/api/contabil/estrutura?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ relatorio: 'dre', nome: 'A' });
    const b = await request(app)
      .post('/api/contabil/estrutura?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ relatorio: 'dre', nome: 'B' });

    const mover = await request(app)
      .post(`/api/contabil/estrutura/${b.body.id}/mover?empresa=001&relatorio=dre`)
      .set('X-API-KEY', API_KEY)
      .send({ direcao: 'up' });
    expect(mover.status).toBe(200);

    const lista = await request(app).get('/api/contabil/estrutura?empresa=001&relatorio=dre').set('X-API-KEY', API_KEY);
    expect(lista.body.find((n) => n.id === a.body.id).ordem).toBe(1);
    expect(lista.body.find((n) => n.id === b.body.id).ordem).toBe(0);
  });
});

describe('DELETE /api/contabil/estrutura/:id', () => {
  test('apaga o no, seus descendentes, e limpa tags orfas nas regras', async () => {
    const pai = await request(app)
      .post('/api/contabil/estrutura?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ relatorio: 'dre', nome: 'Receita' });
    const filho = await request(app)
      .post('/api/contabil/estrutura?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ relatorio: 'dre', nome: 'Vendas', parentId: pai.body.id });

    await request(app)
      .post('/api/contabil/contas/3.1.01.001/regras?empresa=001')
      .set('X-API-KEY', API_KEY)
      .send({ tags: [{ relatorio: 'dre', nodeId: filho.body.id }] });

    const apagar = await request(app)
      .delete(`/api/contabil/estrutura/${pai.body.id}?empresa=001&relatorio=dre`)
      .set('X-API-KEY', API_KEY);
    expect(apagar.status).toBe(200);
    expect(apagar.body.idsRemovidos.sort()).toEqual([pai.body.id, filho.body.id].sort());

    const listaEstrutura = await request(app).get('/api/contabil/estrutura?empresa=001&relatorio=dre').set('X-API-KEY', API_KEY);
    expect(listaEstrutura.body).toEqual([]);

    const contas = await request(app).get('/api/contabil/contas?empresa=001').set('X-API-KEY', API_KEY);
    const conta = contas.body.find((c) => c.conta === '3.1.01.001');
    expect(conta.regras[0].tags).toEqual([]);
  });
});
