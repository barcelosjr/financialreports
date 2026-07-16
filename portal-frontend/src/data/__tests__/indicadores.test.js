import { describe, it, expect } from 'vitest';
import { calcularDRE, calcularBalanco, porId } from '../financeiro';
import { calcularIndicadores, todosIndicadores, serieIndicador } from '../indicadores';
import { PERIODOS } from '../constants';

const EMPRESA = ['kobe-comercio'];
const PERIODO = PERIODOS[PERIODOS.length - 1];

function acharIndicador(empresaIds, periodo, chave) {
  return todosIndicadores(empresaIds, periodo).find((i) => i.chave === chave);
}

describe('Liquidez — conferência manual', () => {
  it('Liquidez Corrente bate com Ativo Circulante / Passivo Circulante calculados direto do Balanço', () => {
    const { ativo, passivoPl } = calcularBalanco(EMPRESA, PERIODO);
    const esperado = porId(ativo, 'subtotal-ativo-circulante').valor / porId(passivoPl, 'subtotal-passivo-circulante').valor;
    expect(acharIndicador(EMPRESA, PERIODO, 'liquidezCorrente').valor).toBeCloseTo(esperado, 6);
  });

  it('Liquidez Seca exclui estoques do Ativo Circulante', () => {
    const { ativo, passivoPl } = calcularBalanco(EMPRESA, PERIODO);
    const estoques = porId(ativo, 'ativo-circulante').contas.find((c) => c.id === 'estoques').valor;
    const esperado = (porId(ativo, 'subtotal-ativo-circulante').valor - estoques) / porId(passivoPl, 'subtotal-passivo-circulante').valor;
    expect(acharIndicador(EMPRESA, PERIODO, 'liquidezSeca').valor).toBeCloseTo(esperado, 6);
  });
});

describe('Endividamento — conferência manual', () => {
  it('Endividamento Geral bate com (PC+PNC)/Ativo', () => {
    const { ativo, passivoPl } = calcularBalanco(EMPRESA, PERIODO);
    const pc = porId(passivoPl, 'subtotal-passivo-circulante').valor;
    const pnc = porId(passivoPl, 'subtotal-passivo-nao-circulante').valor;
    const ativoTotal = porId(ativo, 'total-ativo').valor;
    expect(acharIndicador(EMPRESA, PERIODO, 'endividamentoGeral').valor).toBeCloseTo((pc + pnc) / ativoTotal, 6);
  });

  it('Dívida Líquida bate com Empréstimos (CP+LP) − Caixa', () => {
    const { ativo, passivoPl } = calcularBalanco(EMPRESA, PERIODO);
    const caixa = porId(ativo, 'ativo-circulante').contas.find((c) => c.id === 'caixa-equivalentes').valor;
    const empCP = porId(passivoPl, 'passivo-circulante').contas.find((c) => c.id === 'emprestimos-cp').valor;
    const empLP = porId(passivoPl, 'passivo-nao-circulante').contas.find((c) => c.id === 'emprestimos-lp').valor;
    expect(acharIndicador(EMPRESA, PERIODO, 'dividaLiquida').valor).toBeCloseTo(empCP + empLP - caixa, 6);
  });
});

describe('Rentabilidade — conferência manual', () => {
  it('ROE bate com (Lucro Líquido × 12) / Patrimônio Líquido', () => {
    const dre = calcularDRE(EMPRESA, PERIODO);
    const { passivoPl } = calcularBalanco(EMPRESA, PERIODO);
    const lucroLiquido = porId(dre, 'total-lucro-liquido').valor;
    const pl = porId(passivoPl, 'subtotal-patrimonio-liquido').valor;
    expect(acharIndicador(EMPRESA, PERIODO, 'roe').valor).toBeCloseTo((lucroLiquido * 12) / pl, 6);
  });

  it('Margem EBITDA bate com EBITDA / Receita Líquida', () => {
    const dre = calcularDRE(EMPRESA, PERIODO);
    const ebitda = porId(dre, 'subtotal-ebitda').valor;
    const receita = porId(dre, 'subtotal-receita-liquida').valor;
    expect(acharIndicador(EMPRESA, PERIODO, 'margemEbitda').valor).toBeCloseTo(ebitda / receita, 6);
  });
});

describe('DuPont', () => {
  it('ROE decomposto (Margem × Giro × Multiplicador) reproduz o ROE direto', () => {
    const roeDireto = acharIndicador(EMPRESA, PERIODO, 'roe').valor;
    const grupos = calcularIndicadores(EMPRESA, PERIODO);
    const dupont = grupos.find((g) => g.chave === 'dupont').indicadores;
    const roeDecomposto = dupont.find((i) => i.nome === 'ROE Decomposto').valor;
    expect(roeDecomposto).toBeCloseTo(roeDireto, 6);
  });
});

describe('status vs. faixa saudável', () => {
  it('todo indicador com faixaSaudavel definida tem status bom/atencao/ruim', () => {
    for (const ind of todosIndicadores(EMPRESA, PERIODO)) {
      if (ind.faixaSaudavel) expect(['bom', 'atencao', 'ruim']).toContain(ind.status);
      else expect(ind.status).toBe('neutro');
    }
  });
});

describe('serieIndicador', () => {
  it('devolve um ponto por período, na mesma ordem de PERIODOS', () => {
    const serie = serieIndicador(EMPRESA, 'liquidezCorrente');
    expect(serie).toHaveLength(PERIODOS.length);
    expect(serie.map((p) => p.periodo)).toEqual(PERIODOS);
    expect(serie.every((p) => typeof p.valor === 'number')).toBe(true);
  });
});
