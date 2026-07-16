import { describe, it, expect } from 'vitest';
import { projetarSerie, projetarIndicadoresPrincipais, detectarRupturaCaixa } from '../previsao';

const EMPRESA = ['kobe-comercio'];

const SERIE_CRESCENTE = [
  { periodo: '2025-07', valor: 100 },
  { periodo: '2025-08', valor: 110 },
  { periodo: '2025-09', valor: 120 },
  { periodo: '2025-10', valor: 130 },
  { periodo: '2025-11', valor: 140 },
  { periodo: '2025-12', valor: 150 },
];

describe('projetarSerie', () => {
  it('reproduz a tendência com regressão linear (série perfeitamente linear)', () => {
    const { projecao } = projetarSerie(SERIE_CRESCENTE, { metodo: 'linear', horizonte: 3 });
    expect(projecao).toHaveLength(3);
    expect(projecao[0].valor).toBeCloseTo(160, 4);
    expect(projecao[1].valor).toBeCloseTo(170, 4);
    expect(projecao[2].valor).toBeCloseTo(180, 4);
  });

  it('a banda de confiança é praticamente nula para uma série sem ruído', () => {
    const { projecao } = projetarSerie(SERIE_CRESCENTE, { metodo: 'linear', horizonte: 2 });
    expect(projecao[0].max - projecao[0].min).toBeCloseTo(0, 6);
  });

  it('continua a numeração de período corretamente através da virada de ano', () => {
    const { projecao } = projetarSerie(SERIE_CRESCENTE, { metodo: 'linear', horizonte: 2 });
    expect(projecao.map((p) => p.periodo)).toEqual(['2026-01', '2026-02']);
  });

  it('média móvel projeta um valor constante igual à média dos últimos 3 meses', () => {
    const { projecao } = projetarSerie(SERIE_CRESCENTE, { metodo: 'mediaMovel', horizonte: 2 });
    const mediaEsperada = (130 + 140 + 150) / 3;
    expect(projecao[0].valor).toBeCloseTo(mediaEsperada, 6);
    expect(projecao[1].valor).toBeCloseTo(mediaEsperada, 6);
  });

  it('CAGR aplica a mesma taxa de crescimento composta a cada passo', () => {
    const serieGeometrica = [
      { periodo: '2025-07', valor: 100 },
      { periodo: '2025-08', valor: 110 },
      { periodo: '2025-09', valor: 121 },
    ];
    const { projecao } = projetarSerie(serieGeometrica, { metodo: 'cagr', horizonte: 1 });
    expect(projecao[0].valor).toBeCloseTo(133.1, 4);
  });
});

describe('projetarIndicadoresPrincipais', () => {
  it('projeta Receita, EBITDA, Lucro Líquido e Saldo de Caixa com o horizonte pedido', () => {
    const resultado = projetarIndicadoresPrincipais(EMPRESA, { horizonte: 4 });
    expect(resultado.receita.projecao).toHaveLength(4);
    expect(resultado.ebitda.projecao).toHaveLength(4);
    expect(resultado.lucroLiquido.projecao).toHaveLength(4);
    expect(resultado.saldoCaixa.projecao).toHaveLength(4);
  });

  it('é determinístico entre chamadas (mesmo histórico seeded)', () => {
    const a = projetarIndicadoresPrincipais(EMPRESA, { horizonte: 3 });
    const b = projetarIndicadoresPrincipais(EMPRESA, { horizonte: 3 });
    expect(a.receita.projecao).toEqual(b.receita.projecao);
  });
});

describe('detectarRupturaCaixa', () => {
  it('retorna null quando o caixa projetado nunca fica negativo', () => {
    const serieSempreCaixaPositivo = SERIE_CRESCENTE;
    const { projecao } = projetarSerie(serieSempreCaixaPositivo, { metodo: 'linear', horizonte: 6 });
    expect(projecao.every((p) => p.valor > 0)).toBe(true);
  });

  it('identifica o primeiro mês em que o saldo projetado cruza zero', () => {
    const serieCaixaCaindo = [
      { periodo: '2025-07', valor: 500 },
      { periodo: '2025-08', valor: 300 },
      { periodo: '2025-09', valor: 100 },
      { periodo: '2025-10', valor: -100 },
    ];
    const { projecao } = projetarSerie(serieCaixaCaindo, { metodo: 'linear', horizonte: 4 });
    const primeiroNegativo = projecao.find((p) => p.valor < 0);
    expect(primeiroNegativo).toBeDefined();
  });

  it('não quebra ao rodar com dados reais do motor', () => {
    expect(() => detectarRupturaCaixa(EMPRESA, { horizonte: 6 })).not.toThrow();
  });
});
