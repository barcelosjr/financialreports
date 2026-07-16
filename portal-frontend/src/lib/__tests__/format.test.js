import { describe, it, expect } from 'vitest';
import { formatarMoeda, formatarIndice, formatarMultiplo, formatarDias, formatarPercentual, formatarPontosPercentuais } from '../format';

describe('formatarPercentual / formatarPontosPercentuais — sem "-0,0"', () => {
  it('não mostra sinal de menos para ruído de ponto flutuante que arredonda para zero', () => {
    expect(formatarPercentual(-0.0000001)).toBe('0.0%');
    expect(formatarPontosPercentuais(-0.0000001)).toBe('0.0 p.p.');
  });

  it('continua mostrando o sinal para valores negativos reais', () => {
    expect(formatarPercentual(-0.05)).toBe('-5.0%');
  });
});

describe('formatarMoeda modo contábil', () => {
  it('mostra negativos entre parênteses quando contabil=true', () => {
    expect(formatarMoeda(-1200, { contabil: true })).toMatch(/\(.*1\.200.*\)/);
  });

  it('mostra sinal de menos quando contabil=false (padrão)', () => {
    expect(formatarMoeda(-1200)).toMatch(/^-/);
  });
});

describe('formatarIndice/formatarMultiplo/formatarDias', () => {
  it('formatarIndice usa 2 casas por padrão', () => {
    expect(formatarIndice(1.256)).toBe('1,26');
  });

  it('formatarMultiplo adiciona sufixo "x"', () => {
    expect(formatarMultiplo(1.84)).toBe('1,8x');
  });

  it('formatarDias arredonda e adiciona sufixo "dias"', () => {
    expect(formatarDias(44.6)).toBe('45 dias');
  });

  it('todos retornam em-dash para valores nulos', () => {
    expect(formatarIndice(null)).toBe('—');
    expect(formatarMultiplo(undefined)).toBe('—');
    expect(formatarDias(NaN)).toBe('—');
  });
});
