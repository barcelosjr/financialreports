const { escapeDaxString, handlePowerBIError } = require('../../src/utils');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('escapeDaxString', () => {
  test('escapa aspas duplas', () => {
    expect(escapeDaxString('a"b')).toBe('a""b');
  });

  test.each(['a\rb', 'a\nb', 'a\tb'])('rejeita caracteres de controle (%p)', (v) => {
    expect(() => escapeDaxString(v)).toThrow();
  });
});

describe('handlePowerBIError', () => {
  test('code UNAVAILABLE retorna 503', () => {
    const res = mockRes();
    handlePowerBIError({ code: 'UNAVAILABLE' }, res, 'fallback');
    expect(res.status).toHaveBeenCalledWith(503);
  });

  test('code THROTTLED retorna 503', () => {
    const res = mockRes();
    handlePowerBIError({ code: 'THROTTLED' }, res, 'fallback');
    expect(res.status).toHaveBeenCalledWith(503);
  });

  test('outro erro retorna 500 com o fallbackMessage', () => {
    const res = mockRes();
    handlePowerBIError(new Error('x'), res, 'Falha ao consultar.');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Falha ao consultar.' });
  });
});
