const request = require('supertest');

beforeEach(() => {
  jest.resetModules();
});

afterEach(() => {
  process.env.CORS_ORIGIN = '';
});

test('sem CORS_ORIGIN definido, nenhum header de CORS e adicionado', async () => {
  process.env.CORS_ORIGIN = '';
  const { createApp } = require('../../src/app');
  const res = await request(createApp()).get('/health').set('Origin', 'https://exemplo.com');
  expect(res.headers['access-control-allow-origin']).toBeUndefined();
});

test('com CORS_ORIGIN definido, a origem configurada e refletida no header', async () => {
  process.env.CORS_ORIGIN = 'https://exemplo.com';
  const { createApp } = require('../../src/app');
  const res = await request(createApp()).get('/health').set('Origin', 'https://exemplo.com');
  expect(res.headers['access-control-allow-origin']).toBe('https://exemplo.com');
});

test('com CORS_ORIGIN="*", qualquer origem e liberada', async () => {
  process.env.CORS_ORIGIN = '*';
  const { createApp } = require('../../src/app');
  const res = await request(createApp()).get('/health').set('Origin', 'https://qualquer.com');
  expect(res.headers['access-control-allow-origin']).toBe('*');
});
