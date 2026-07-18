import { describe, it, expect } from 'vitest';
import {
  buildBalanco, calcularBalanco, calcularDRE, calcularEBITDA, depreciacaoAmortizacao,
  porId, construirTabelaPeriodos,
} from '../financeiro';
import { PERIODOS } from '../constants';

const EMPRESA = 'kobe-comercio';
const GRUPO = ['kobe-comercio', 'kobe-industria', 'kobe-logistica'];
const PERIODO = PERIODOS[PERIODOS.length - 1];

describe('Balanço', () => {
  it('fecha Ativo Total == Passivo + Patrimônio Líquido para uma empresa', () => {
    const { ativo, passivoPl } = buildBalanco(EMPRESA, PERIODO);
    const ativoTotal = porId(ativo, 'total-ativo').valor;
    const passivoPlTotal = porId(passivoPl, 'total-passivo-pl').valor;
    expect(ativoTotal).toBeCloseTo(passivoPlTotal, 6);
  });

  it('fecha Ativo Total == Passivo + PL também agregado por grupo', () => {
    const { ativo, passivoPl } = calcularBalanco(GRUPO, PERIODO);
    const ativoTotal = porId(ativo, 'total-ativo').valor;
    const passivoPlTotal = porId(passivoPl, 'total-passivo-pl').valor;
    expect(ativoTotal).toBeCloseTo(passivoPlTotal, 6);
  });

  it('cada subtotal de seção (Total do X) bate com o valor do próprio bloco, não com um acumulado das seções anteriores', () => {
    const { ativo, passivoPl } = buildBalanco(EMPRESA, PERIODO);
    expect(porId(ativo, 'subtotal-ativo-circulante').valor).toBeCloseTo(porId(ativo, 'ativo-circulante').valor, 6);
    expect(porId(ativo, 'subtotal-ativo-nao-circulante').valor).toBeCloseTo(porId(ativo, 'ativo-nao-circulante').valor, 6);
    expect(porId(passivoPl, 'subtotal-passivo-circulante').valor).toBeCloseTo(porId(passivoPl, 'passivo-circulante').valor, 6);
    expect(porId(passivoPl, 'subtotal-passivo-nao-circulante').valor).toBeCloseTo(porId(passivoPl, 'passivo-nao-circulante').valor, 6);
    expect(porId(passivoPl, 'subtotal-patrimonio-liquido').valor).toBeCloseTo(porId(passivoPl, 'patrimonio-liquido').valor, 6);
  });

  it('fecha o balanço em todos os períodos e empresas do grupo', () => {
    for (const empresaId of GRUPO) {
      for (const periodo of PERIODOS) {
        const { ativo, passivoPl } = buildBalanco(empresaId, periodo);
        expect(porId(ativo, 'total-ativo').valor).toBeCloseTo(porId(passivoPl, 'total-passivo-pl').valor, 6);
      }
    }
  });
});

describe('EBITDA', () => {
  it('EBITDA == EBIT + Depreciação e Amortização', () => {
    const dre = calcularDRE([EMPRESA], PERIODO);
    const ebit = porId(dre, 'subtotal-ebit').valor;
    const ebitda = porId(dre, 'subtotal-ebitda').valor;
    const dea = depreciacaoAmortizacao(EMPRESA, PERIODO);
    expect(ebitda).toBeCloseTo(ebit + dea, 6);
  });

  it('calcularEBITDA(empresaIds, periodo) bate com a linha subtotal-ebitda da DRE agregada', () => {
    const dre = calcularDRE(GRUPO, PERIODO);
    expect(calcularEBITDA(GRUPO, PERIODO)).toBeCloseTo(porId(dre, 'subtotal-ebitda').valor, 6);
  });

  it('não altera o Lucro Líquido (EBITDA não entra no total corrente)', () => {
    const dre = calcularDRE([EMPRESA], PERIODO);
    const lair = porId(dre, 'subtotal-lair').valor;
    const financeiro = porId(dre, 'resultado-financeiro').valor;
    const ebit = porId(dre, 'subtotal-ebit').valor;
    expect(lair).toBeCloseTo(ebit + financeiro, 6);
  });
});

describe('Agregação por grupo', () => {
  it('DRE do grupo é a soma das DREs individuais', () => {
    const agregado = calcularDRE(GRUPO, PERIODO);
    const somaManual = GRUPO.reduce((acc, id) => acc + porId(calcularDRE([id], PERIODO), 'total-lucro-liquido').valor, 0);
    expect(porId(agregado, 'total-lucro-liquido').valor).toBeCloseTo(somaManual, 6);
  });
});

describe('construirTabelaPeriodos — AH/AV', () => {
  it('AH tem o sinal correto (positivo quando o valor sobe)', () => {
    const periodos = PERIODOS.slice(-2);
    const linhas = construirTabelaPeriodos(calcularDRE, [EMPRESA], periodos, { ah: true });
    const linha = linhas.find((l) => l.id === 'subtotal-receita-liquida');
    const [valorAnterior, valorAtual] = linha.valoresPorPeriodo;
    const ahAtual = linha.ahPorPeriodo[1];
    expect(Math.sign(ahAtual)).toBe(Math.sign(valorAtual - valorAnterior));
  });

  it('AV soma 100% na própria linha-base', () => {
    const periodos = [PERIODO];
    const linhas = construirTabelaPeriodos(calcularDRE, [EMPRESA], periodos, { av: true, baseAVId: 'subtotal-receita-liquida' });
    const base = linhas.find((l) => l.id === 'subtotal-receita-liquida');
    expect(base.avPorPeriodo[0]).toBeCloseTo(1, 6);
  });

  it('total soma os valores do período selecionado (linha e contas)', () => {
    const periodos = PERIODOS.slice(-3);
    const linhas = construirTabelaPeriodos(calcularDRE, [EMPRESA], periodos, { total: true });
    const linha = linhas.find((l) => l.id === 'subtotal-receita-liquida');
    const somaManual = linha.valoresPorPeriodo.reduce((acc, v) => acc + v, 0);
    expect(linha.total).toBeCloseTo(somaManual, 6);

    const blocoComContas = linhas.find((l) => l.id === 'receita-bruta');
    const conta = blocoComContas.contas[0];
    const somaContaManual = conta.valoresPorPeriodo.reduce((acc, v) => acc + v, 0);
    expect(conta.total).toBeCloseTo(somaContaManual, 6);
  });

  it('total fica undefined quando não solicitado', () => {
    const linhas = construirTabelaPeriodos(calcularDRE, [EMPRESA], [PERIODO], {});
    const linha = linhas.find((l) => l.id === 'subtotal-receita-liquida');
    expect(linha.total).toBeUndefined();
  });
});
