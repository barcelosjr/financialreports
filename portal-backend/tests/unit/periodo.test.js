const { isValidPeriodo, expandPeriodoRange } = require('../../src/periodo');

describe('isValidPeriodo', () => {
  test.each(['2026-01', '2026-12', '2026-07'])('aceita %s', (v) => {
    expect(isValidPeriodo(v)).toBe(true);
  });

  test.each(['2026-00', '2026-13', '2026-1', '26-01', '2026/01', 'abcd-01', ''])(
    'rejeita %s',
    (v) => {
      expect(isValidPeriodo(v)).toBe(false);
    }
  );
});

describe('expandPeriodoRange', () => {
  test('intervalo dentro do mesmo ano', () => {
    expect(expandPeriodoRange('2026-01', '2026-03')).toEqual(['01/2026', '02/2026', '03/2026']);
  });

  test('intervalo cruzando o ano', () => {
    expect(expandPeriodoRange('2025-11', '2026-02')).toEqual([
      '11/2025',
      '12/2025',
      '01/2026',
      '02/2026',
    ]);
  });

  test('mes unico', () => {
    expect(expandPeriodoRange('2026-07', '2026-07')).toEqual(['07/2026']);
  });
});
