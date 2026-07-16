import { describe, it, expect } from 'vitest';
import {
  calcularAltmanZ, calcularCovenants, calcularBreakEven, calcularRunway,
  calcularConcentracao, calcularVolatilidade, calcularAlertas, LIMITES_COVENANT_PADRAO,
} from '../risco';
import { PERIODOS } from '../constants';
import { gruposEconomicos } from '../empresas';

const EMPRESA = ['kobe-comercio'];
const PERIODO = PERIODOS[PERIODOS.length - 1];
const GRUPO_KOBE = gruposEconomicos.find((g) => g.id === 'grupo-kobe');

describe('Altman Z-Score', () => {
  it('a zona é consistente com o valor calculado', () => {
    const { valor, zona } = calcularAltmanZ(EMPRESA, PERIODO);
    if (valor > 2.6) expect(zona).toBe('seguro');
    else if (valor >= 1.1) expect(zona).toBe('cinza');
    else expect(zona).toBe('perigo');
  });

  it('calcula para todas as empresas e períodos sem gerar NaN', () => {
    for (const empresa of GRUPO_KOBE.empresas) {
      for (const periodo of PERIODOS) {
        const { valor } = calcularAltmanZ([empresa.id], periodo);
        expect(Number.isFinite(valor)).toBe(true);
      }
    }
  });
});

describe('Covenants', () => {
  it('marca "estourado" quando o valor viola o limite (direção "menor")', () => {
    const covenants = calcularCovenants(EMPRESA, PERIODO, { ...LIMITES_COVENANT_PADRAO, dividaLiquidaEbitda: -999 });
    const dl = covenants.find((c) => c.chave === 'dividaLiquidaEbitda');
    expect(dl.estourado).toBe(true);
    expect(dl.status).toBe('ruim');
  });

  it('marca "cumprido" quando o limite é folgado', () => {
    const covenants = calcularCovenants(EMPRESA, PERIODO, { ...LIMITES_COVENANT_PADRAO, dividaLiquidaEbitda: 999 });
    const dl = covenants.find((c) => c.chave === 'dividaLiquidaEbitda');
    expect(dl.estourado).toBe(false);
    expect(dl.status).toBe('bom');
  });
});

describe('Break-even e alavancagem', () => {
  it('Ponto de Equilíbrio × Índice de Margem de Contribuição bate com os Custos Fixos', () => {
    const { pontoEquilibrio, indiceMC, custosFixos } = calcularBreakEven(EMPRESA, PERIODO);
    expect(pontoEquilibrio * indiceMC).toBeCloseTo(custosFixos, 4);
  });

  it('GAC == GAO × GAF', () => {
    const { gao, gaf, gac } = calcularBreakEven(EMPRESA, PERIODO);
    expect(gac).toBeCloseTo(gao * gaf, 6);
  });

  it('Margem de Segurança é positiva quando a receita atual excede o ponto de equilíbrio', () => {
    const { receita, pontoEquilibrio, margemSeguranca } = calcularBreakEven(EMPRESA, PERIODO);
    expect(margemSeguranca > 0).toBe(receita > pontoEquilibrio);
  });
});

describe('Runway de caixa', () => {
  it('sem risco (emRisco=false) quando o Fluxo de Caixa Operacional é positivo', () => {
    for (const periodo of PERIODOS) {
      const runway = calcularRunway(EMPRESA, periodo);
      if (runway.fco >= 0) {
        expect(runway.mesesRunway).toBeNull();
        expect(runway.emRisco).toBe(false);
      }
    }
  });
});

describe('Concentração no grupo', () => {
  it('shares de receita somam 1 (ou 0 se não houver receita)', () => {
    const { itens } = calcularConcentracao(GRUPO_KOBE.empresas, PERIODO);
    const soma = itens.reduce((acc, i) => acc + i.shareReceita, 0);
    expect(soma).toBeCloseTo(1, 6);
  });

  it('HHI está entre 0 e 10000', () => {
    const { hhiReceita } = calcularConcentracao(GRUPO_KOBE.empresas, PERIODO);
    expect(hhiReceita).toBeGreaterThan(0);
    expect(hhiReceita).toBeLessThanOrEqual(10000);
  });
});

describe('Volatilidade', () => {
  it('desvio-padrão é zero quando a janela tem um único mês', () => {
    const { desvioPadraoMargem } = calcularVolatilidade(EMPRESA, { janelaMeses: 1 });
    expect(desvioPadraoMargem).toBe(0);
  });
});

describe('Agregador de alertas', () => {
  it('ordena por severidade (alta antes de média antes de baixa)', () => {
    const alertas = calcularAlertas(EMPRESA, PERIODO, { limites: { dividaLiquidaEbitda: -999, liquidezCorrente: 999, coberturaJuros: 999 } });
    const severidades = alertas.map((a) => a.severidade);
    const ordemNumerica = { alta: 0, media: 1, baixa: 2 };
    for (let i = 1; i < severidades.length; i += 1) {
      expect(ordemNumerica[severidades[i]]).toBeGreaterThanOrEqual(ordemNumerica[severidades[i - 1]]);
    }
  });

  it('gera ao menos um alerta de covenant estourado com limites impossíveis', () => {
    const alertas = calcularAlertas(EMPRESA, PERIODO, { limites: { dividaLiquidaEbitda: -999, liquidezCorrente: 999, coberturaJuros: 999 } });
    expect(alertas.some((a) => a.titulo.includes('Covenant estourado'))).toBe(true);
  });
});
