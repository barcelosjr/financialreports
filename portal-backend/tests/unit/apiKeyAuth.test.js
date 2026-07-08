const { apiKeyAuth } = require('../../src/apiKeyAuth');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

test('sem header X-API-KEY retorna 401', () => {
  const req = { get: () => undefined };
  const res = mockRes();
  const next = jest.fn();

  apiKeyAuth(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});

test('header invalido retorna 401', () => {
  const req = { get: () => 'chave-errada' };
  const res = mockRes();
  const next = jest.fn();

  apiKeyAuth(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});

test('header valido anexa req.cliente/req.empresasAutorizadas e chama next()', () => {
  const req = { get: () => 'test-api-key-empresa-001' };
  const res = mockRes();
  const next = jest.fn();

  apiKeyAuth(req, res, next);

  expect(req.cliente).toBe('Cliente Teste');
  expect(req.empresasAutorizadas).toEqual(['001', '002']);
  expect(next).toHaveBeenCalled();
});
