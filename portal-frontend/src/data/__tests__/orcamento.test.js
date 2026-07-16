import { describe, it, expect } from 'vitest';
import { orcamentoDRE, compararOrcadoRealizado } from '../orcamento';
import { calcularDRE, porId } from '../financeiro';
import { PERIODOS } from '../constants';

const EMPRESA = ['kobe-comercio'];
const PERIODO = PERIODOS[PERIODOS.length - 1];

describe('orcamentoDRE', () => {
  it('a Receita Líquida orçada soma corretamente (Receita Bruta − Deduções)', () => {
    const orcado = orcamentoDRE(EMPRESA, PERIODO);
    const receitaBruta = porId(orcado, 'receita-bruta').valor;
    const deducoes = porId(orcado, 'deducoes').valor;
    const receitaLiquida = porId(orcado, 'subtotal-receita-liquida').valor;
    expect(receitaLiquida).toBeCloseTo(receitaBruta + deducoes, 6);
  });

  it('o Lucro Líquido orçado fecha como soma corrente de todos os blocos', () => {
    const orcado = orcamentoDRE(EMPRESA, PERIODO);
    const soma = ['receita-bruta', 'deducoes', 'cmv', 'despesas-operacionais', 'resultado-financeiro', 'impostos-lucro']
      .reduce((acc, id) => acc + porId(orcado, id).valor, 0);
    expect(porId(orcado, 'total-lucro-liquido').valor).toBeCloseTo(soma, 6);
  });

  it('é determinístico entre chamadas', () => {
    expect(orcamentoDRE(EMPRESA, PERIODO)).toEqual(orcamentoDRE(EMPRESA, PERIODO));
  });

  it('a Receita Bruta orçada gira em torno da realizada (dentro de ±20%)', () => {
    const orcado = orcamentoDRE(EMPRESA, PERIODO);
    const realizado = calcularDRE(EMPRESA, PERIODO);
    const razao = porId(orcado, 'receita-bruta').valor / porId(realizado, 'receita-bruta').valor;
    expect(razao).toBeGreaterThan(0.8);
    expect(razao).toBeLessThan(1.2);
  });
});

describe('compararOrcadoRealizado', () => {
  it('cada linha tem realizado, orçado, variação e status coerentes', () => {
    const linhas = compararOrcadoRealizado(EMPRESA, PERIODO);
    for (const linha of linhas) {
      expect(linha.realizado).toBeTypeOf('number');
      expect(linha.orcado).toBeTypeOf('number');
      expect(linha.variacaoAbs).toBeCloseTo(linha.realizado - linha.orcado, 6);
      expect(['favoravel', 'desfavoravel']).toContain(linha.status);
    }
  });

  it('receita realizada acima da orçada é favorável', () => {
    const linhas = compararOrcadoRealizado(EMPRESA, PERIODO);
    const receita = linhas.find((l) => l.id === 'subtotal-receita-liquida');
    expect(receita.status).toBe(receita.variacaoAbs >= 0 ? 'favoravel' : 'desfavoravel');
  });

  it('CMV: gastar mais (magnitude realizada > orçada) é desfavorável', () => {
    const linhas = compararOrcadoRealizado(EMPRESA, PERIODO);
    const cmv = linhas.find((l) => l.id === 'cmv');
    const gastouMais = Math.abs(cmv.realizado) > Math.abs(cmv.orcado);
    expect(cmv.status).toBe(gastouMais ? 'desfavoravel' : 'favoravel');
  });

  it('contas de custo dentro do CMV também usam a regra de despesa (não a de receita)', () => {
    const linhas = compararOrcadoRealizado(EMPRESA, PERIODO);
    const cmv = linhas.find((l) => l.id === 'cmv');
    const materiaPrima = cmv.contas.find((c) => c.id === 'cmv-materia-prima');
    // conta de custo armazena magnitude positiva: gastar mais (realizado > orçado) deve ser desfavorável.
    const gastouMais = materiaPrima.realizado > materiaPrima.orcado;
    expect(materiaPrima.status).toBe(gastouMais ? 'desfavoravel' : 'favoravel');
  });

  it('atingimento == realizado/orçado', () => {
    const linhas = compararOrcadoRealizado(EMPRESA, PERIODO);
    const receita = linhas.find((l) => l.id === 'subtotal-receita-liquida');
    expect(receita.atingimento).toBeCloseTo(receita.realizado / receita.orcado, 6);
  });
});
