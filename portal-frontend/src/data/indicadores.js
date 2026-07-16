// Índices financeiros "de verdade", calculados em cima do motor
// determinístico de financeiro.js (calcularDRE/calcularBalanco/EBITDA).
// Nenhum valor aqui é hardcoded — tudo deriva das mesmas contas que já
// alimentam os três demonstrativos, então bate com o que o usuário vê lá.
import { calcularDRE, calcularBalanco, porId } from './financeiro';
import { PERIODOS } from './constants';

// --- Leitura das contas necessárias a partir das linhas da DRE/Balanço ----

function contaDe(linhas, blocoId, contaId) {
  return porId(linhas, blocoId).contas?.find((c) => c.id === contaId)?.valor ?? 0;
}

function coletarDados(empresaIds, periodo) {
  const dre = calcularDRE(empresaIds, periodo);
  const { ativo, passivoPl } = calcularBalanco(empresaIds, periodo);

  const receitaLiquida = porId(dre, 'subtotal-receita-liquida').valor;
  const lucroBruto = porId(dre, 'subtotal-lucro-bruto').valor;
  const ebit = porId(dre, 'subtotal-ebit').valor;
  const ebitda = porId(dre, 'subtotal-ebitda').valor;
  const lair = porId(dre, 'subtotal-lair').valor;
  const lucroLiquido = porId(dre, 'total-lucro-liquido').valor;
  const cmv = -porId(dre, 'cmv').valor;
  const impostosLucro = -porId(dre, 'impostos-lucro').valor;
  const despesasFinanceiras = -contaDe(dre, 'resultado-financeiro', 'despesas-financeiras');

  const caixa = contaDe(ativo, 'ativo-circulante', 'caixa-equivalentes');
  const contasReceber = contaDe(ativo, 'ativo-circulante', 'contas-receber');
  const estoques = contaDe(ativo, 'ativo-circulante', 'estoques');
  const ativoCirculante = porId(ativo, 'subtotal-ativo-circulante').valor;
  const realizavelLP = contaDe(ativo, 'ativo-nao-circulante', 'realizavel-lp');
  const ativoTotal = porId(ativo, 'total-ativo').valor;

  const fornecedores = contaDe(passivoPl, 'passivo-circulante', 'fornecedores');
  const emprestimosCP = contaDe(passivoPl, 'passivo-circulante', 'emprestimos-cp');
  const passivoCirculante = porId(passivoPl, 'subtotal-passivo-circulante').valor;
  const emprestimosLP = contaDe(passivoPl, 'passivo-nao-circulante', 'emprestimos-lp');
  const passivoNaoCirculante = porId(passivoPl, 'subtotal-passivo-nao-circulante').valor;
  const patrimonioLiquido = porId(passivoPl, 'subtotal-patrimonio-liquido').valor;
  const reservas = contaDe(passivoPl, 'patrimonio-liquido', 'reservas');
  const lucrosAcumulados = contaDe(passivoPl, 'patrimonio-liquido', 'lucros-acumulados');
  const passivoTotal = passivoCirculante + passivoNaoCirculante;
  const dividaBruta = emprestimosCP + emprestimosLP;

  return {
    receitaLiquida, lucroBruto, ebit, ebitda, lair, lucroLiquido, cmv, impostosLucro, despesasFinanceiras,
    caixa, contasReceber, estoques, ativoCirculante, realizavelLP, ativoTotal,
    fornecedores, emprestimosCP, passivoCirculante, emprestimosLP, passivoNaoCirculante,
    patrimonioLiquido, reservas, lucrosAcumulados, passivoTotal, dividaBruta,
  };
}

// --- Status vs. faixa saudável --------------------------------------------

function statusPorLimite(valor, { bom, atencao, direcao = 'maior' }) {
  if (valor === null || valor === undefined || Number.isNaN(valor) || !Number.isFinite(valor)) return 'atencao';
  if (direcao === 'maior') {
    if (valor >= bom) return 'bom';
    if (valor >= atencao) return 'atencao';
    return 'ruim';
  }
  if (valor <= bom) return 'bom';
  if (valor <= atencao) return 'atencao';
  return 'ruim';
}

function divisao(numerador, denominador) {
  if (!denominador) return null;
  return numerador / denominador;
}

// Faixas saudáveis por indicador — centralizadas para facilitar ajuste.
// direcao 'maior': valor >= bom é saudável; direcao 'menor': valor <= bom é saudável.
export const FAIXAS_SAUDAVEIS = {
  liquidezCorrente: { bom: 1.2, atencao: 1.0, direcao: 'maior' },
  liquidezSeca: { bom: 0.9, atencao: 0.7, direcao: 'maior' },
  liquidezImediata: { bom: 0.3, atencao: 0.15, direcao: 'maior' },
  liquidezGeral: { bom: 1.1, atencao: 0.9, direcao: 'maior' },
  endividamentoGeral: { bom: 0.5, atencao: 0.65, direcao: 'menor' },
  composicaoEndividamento: { bom: 0.5, atencao: 0.7, direcao: 'menor' },
  dividaLiquida: null,
  dividaLiquidaEbitda: { bom: 2, atencao: 3, direcao: 'menor' },
  plAtivo: { bom: 0.4, atencao: 0.25, direcao: 'maior' },
  alavancagem: { bom: 1.2, atencao: 2, direcao: 'menor' },
  margemBruta: { bom: 0.35, atencao: 0.2, direcao: 'maior' },
  margemEbit: { bom: 0.12, atencao: 0.05, direcao: 'maior' },
  margemEbitda: { bom: 0.15, atencao: 0.08, direcao: 'maior' },
  margemLiquida: { bom: 0.08, atencao: 0.03, direcao: 'maior' },
  roa: { bom: 0.08, atencao: 0.03, direcao: 'maior' },
  roe: { bom: 0.15, atencao: 0.06, direcao: 'maior' },
  roic: { bom: 0.12, atencao: 0.06, direcao: 'maior' },
  giroAtivo: { bom: 1.2, atencao: 0.7, direcao: 'maior' },
  pmr: { bom: 30, atencao: 45, direcao: 'menor' },
  pme: { bom: 30, atencao: 50, direcao: 'menor' },
  pmp: { bom: 40, atencao: 25, direcao: 'maior' },
  cicloOperacional: { bom: 60, atencao: 90, direcao: 'menor' },
  cicloCaixa: { bom: 30, atencao: 60, direcao: 'menor' },
  ncg: null,
  capitalGiroLiquido: null,
  coberturaJuros: { bom: 3, atencao: 1.5, direcao: 'maior' },
};

function indicador(chave, nome, valor, { formula, unidade, interpretacao }) {
  const faixa = FAIXAS_SAUDAVEIS[chave];
  const status = faixa ? statusPorLimite(valor, faixa) : 'neutro';
  return { chave, nome, valor, formula, unidade, faixaSaudavel: faixa, status, interpretacao };
}

// --- Cálculo central --------------------------------------------------------

export function calcularIndicadores(empresaIds, periodo) {
  const d = coletarDados(empresaIds, periodo);

  // ROA/ROE/ROIC/Giro do Ativo comparam um fluxo mensal (DRE) com um estoque
  // (Balanço) — anualizamos o fluxo (×12) para a razão fazer sentido como
  // taxa anual, prática padrão de análise de índices.
  const anual = 12;
  const taxaEfetiva = d.lair > 0 ? d.impostosLucro / d.lair : 0.34;
  const nopatAnual = d.ebit * anual * (1 - taxaEfetiva);
  const capitalInvestido = d.dividaBruta + d.patrimonioLiquido;

  const margemLiquida = divisao(d.lucroLiquido, d.receitaLiquida);
  const giroAtivo = divisao(d.receitaLiquida * anual, d.ativoTotal);
  const multiplicadorPL = divisao(d.ativoTotal, d.patrimonioLiquido);

  const liquidez = [
    indicador('liquidezCorrente', 'Liquidez Corrente', divisao(d.ativoCirculante, d.passivoCirculante), {
      formula: 'Ativo Circulante / Passivo Circulante', unidade: 'x',
      interpretacao: 'Quantos reais em ativos de curto prazo cobrem cada real de dívida de curto prazo.',
    }),
    indicador('liquidezSeca', 'Liquidez Seca', divisao(d.ativoCirculante - d.estoques, d.passivoCirculante), {
      formula: '(Ativo Circulante − Estoques) / Passivo Circulante', unidade: 'x',
      interpretacao: 'Capacidade de pagar dívidas de curto prazo sem depender da venda de estoques.',
    }),
    indicador('liquidezImediata', 'Liquidez Imediata', divisao(d.caixa, d.passivoCirculante), {
      formula: 'Caixa e Equivalentes / Passivo Circulante', unidade: 'x',
      interpretacao: 'Quanto da dívida de curto prazo é coberto só pelo caixa disponível hoje.',
    }),
    indicador('liquidezGeral', 'Liquidez Geral', divisao(d.ativoCirculante + d.realizavelLP, d.passivoCirculante + d.passivoNaoCirculante), {
      formula: '(Ativo Circulante + Realizável a LP) / (Passivo Circulante + Passivo Não Circulante)', unidade: 'x',
      interpretacao: 'Capacidade de pagamento considerando todas as dívidas e ativos realizáveis, curto e longo prazo.',
    }),
  ];

  const endividamento = [
    indicador('endividamentoGeral', 'Endividamento Geral', divisao(d.passivoTotal, d.ativoTotal), {
      formula: '(Passivo Circulante + Não Circulante) / Ativo Total', unidade: '%',
      interpretacao: 'Percentual do ativo total financiado por capital de terceiros.',
    }),
    indicador('composicaoEndividamento', 'Composição do Endividamento', divisao(d.passivoCirculante, d.passivoTotal), {
      formula: 'Passivo Circulante / Passivo Total', unidade: '%',
      interpretacao: 'Quanto da dívida total vence no curto prazo — quanto maior, mais pressão de caixa imediata.',
    }),
    indicador('dividaLiquida', 'Dívida Líquida', d.dividaBruta - d.caixa, {
      formula: 'Empréstimos (CP + LP) − Caixa e Equivalentes', unidade: 'R$',
      interpretacao: 'Dívida financeira que sobraria se a empresa usasse todo o caixa disponível para quitá-la.',
    }),
    indicador('dividaLiquidaEbitda', 'Dívida Líquida / EBITDA', divisao(d.dividaBruta - d.caixa, d.ebitda * anual), {
      formula: 'Dívida Líquida / EBITDA anualizado (× 12)', unidade: 'x',
      interpretacao: 'Quantos anos de geração de caixa operacional seriam necessários para quitar a dívida líquida.',
    }),
    indicador('plAtivo', 'PL / Ativo', divisao(d.patrimonioLiquido, d.ativoTotal), {
      formula: 'Patrimônio Líquido / Ativo Total', unidade: '%',
      interpretacao: 'Percentual do ativo total financiado com capital próprio.',
    }),
    indicador('alavancagem', 'Alavancagem (Passivo/PL)', divisao(d.passivoTotal, d.patrimonioLiquido), {
      formula: 'Passivo Total / Patrimônio Líquido', unidade: 'x',
      interpretacao: 'Quantas vezes o capital de terceiros excede o capital próprio investido.',
    }),
  ];

  const rentabilidade = [
    indicador('margemBruta', 'Margem Bruta', divisao(d.lucroBruto, d.receitaLiquida), {
      formula: 'Lucro Bruto / Receita Líquida', unidade: '%',
      interpretacao: 'Percentual da receita que sobra após o custo direto de produtos/serviços vendidos.',
    }),
    indicador('margemEbit', 'Margem Operacional (EBIT)', divisao(d.ebit, d.receitaLiquida), {
      formula: 'EBIT / Receita Líquida', unidade: '%',
      interpretacao: 'Rentabilidade da operação antes de juros e impostos.',
    }),
    indicador('margemEbitda', 'Margem EBITDA', divisao(d.ebitda, d.receitaLiquida), {
      formula: 'EBITDA / Receita Líquida', unidade: '%',
      interpretacao: 'Geração de caixa operacional como percentual da receita, antes de efeitos financeiros e não-caixa.',
    }),
    indicador('margemLiquida', 'Margem Líquida', margemLiquida, {
      formula: 'Lucro Líquido / Receita Líquida', unidade: '%',
      interpretacao: 'Percentual da receita que efetivamente vira lucro para os sócios.',
    }),
    indicador('roa', 'ROA', divisao(d.lucroLiquido * anual, d.ativoTotal), {
      formula: '(Lucro Líquido × 12) / Ativo Total', unidade: '%',
      interpretacao: 'Retorno anualizado gerado sobre o total de ativos da empresa.',
    }),
    indicador('roe', 'ROE', divisao(d.lucroLiquido * anual, d.patrimonioLiquido), {
      formula: '(Lucro Líquido × 12) / Patrimônio Líquido', unidade: '%',
      interpretacao: 'Retorno anualizado gerado sobre o capital próprio investido pelos sócios.',
    }),
    indicador('roic', 'ROIC', divisao(nopatAnual, capitalInvestido), {
      formula: 'NOPAT anualizado / (Dívida Bruta + Patrimônio Líquido)', unidade: '%',
      interpretacao: 'Retorno sobre o capital total investido (dívida + capital próprio), independente de como é financiado.',
    }),
    indicador('giroAtivo', 'Giro do Ativo', giroAtivo, {
      formula: '(Receita Líquida × 12) / Ativo Total', unidade: 'x',
      interpretacao: 'Quantas vezes por ano o ativo total "gira" em receita — eficiência no uso dos ativos.',
    }),
  ];

  const razaoPmr = divisao(d.contasReceber, d.receitaLiquida);
  const razaoPme = divisao(d.estoques, d.cmv);
  const razaoPmp = divisao(d.fornecedores, d.cmv);
  const ciclo = [
    indicador('pmr', 'Prazo Médio de Recebimento', razaoPmr != null ? razaoPmr * 30 : null, {
      formula: '(Contas a Receber / Receita Líquida) × 30', unidade: 'dias',
      interpretacao: 'Tempo médio, em dias, que a empresa leva para receber dos clientes.',
    }),
    indicador('pme', 'Prazo Médio de Estocagem', razaoPme != null ? razaoPme * 30 : null, {
      formula: '(Estoques / CMV) × 30', unidade: 'dias',
      interpretacao: 'Tempo médio, em dias, que a mercadoria fica parada em estoque antes de ser vendida.',
    }),
    indicador('pmp', 'Prazo Médio de Pagamento', razaoPmp != null ? razaoPmp * 30 : null, {
      formula: '(Fornecedores / CMV) × 30', unidade: 'dias',
      interpretacao: 'Tempo médio, em dias, que a empresa leva para pagar seus fornecedores.',
    }),
  ];
  const pmrVal = ciclo[0].valor ?? 0;
  const pmeVal = ciclo[1].valor ?? 0;
  const pmpVal = ciclo[2].valor ?? 0;
  const cicloOperacional = pmrVal + pmeVal;
  const cicloCaixa = cicloOperacional - pmpVal;
  ciclo.push(
    indicador('cicloOperacional', 'Ciclo Operacional', cicloOperacional, {
      formula: 'PMR + PME', unidade: 'dias',
      interpretacao: 'Tempo total entre a compra do estoque e o recebimento da venda.',
    }),
    indicador('cicloCaixa', 'Ciclo de Caixa', cicloCaixa, {
      formula: 'Ciclo Operacional − PMP', unidade: 'dias',
      interpretacao: 'Tempo que a operação fica financiando o próprio caixa até recuperar o que foi pago a fornecedores.',
    }),
    indicador('ncg', 'Necessidade de Capital de Giro', (d.contasReceber + d.estoques) - d.fornecedores, {
      formula: '(Contas a Receber + Estoques) − Fornecedores', unidade: 'R$',
      interpretacao: 'Capital que a operação do dia a dia exige além do que os fornecedores financiam.',
    }),
    indicador('capitalGiroLiquido', 'Capital de Giro Líquido', d.ativoCirculante - d.passivoCirculante, {
      formula: 'Ativo Circulante − Passivo Circulante', unidade: 'R$',
      interpretacao: 'Folga financeira de curto prazo — quanto do ativo circulante não é comprometido com dívidas de curto prazo.',
    }),
  );

  const cobertura = [
    indicador('coberturaJuros', 'Cobertura de Juros', divisao(d.ebit, d.despesasFinanceiras), {
      formula: 'EBIT / Despesas Financeiras', unidade: 'x',
      interpretacao: 'Quantas vezes o resultado operacional cobre as despesas financeiras do período.',
    }),
  ];

  const dupont = [
    indicador('dupontMargem', 'Margem Líquida (DuPont)', margemLiquida, {
      formula: 'Lucro Líquido / Receita Líquida', unidade: '%', interpretacao: 'Componente 1 do DuPont: eficiência de custos e despesas.',
    }),
    indicador('dupontGiro', 'Giro do Ativo (DuPont)', giroAtivo, {
      formula: '(Receita Líquida × 12) / Ativo Total', unidade: 'x', interpretacao: 'Componente 2 do DuPont: eficiência no uso dos ativos.',
    }),
    indicador('dupontAlavancagem', 'Multiplicador de PL (DuPont)', multiplicadorPL, {
      formula: 'Ativo Total / Patrimônio Líquido', unidade: 'x', interpretacao: 'Componente 3 do DuPont: quanto a estrutura de capital amplia o retorno.',
    }),
    indicador('roe', 'ROE Decomposto', (margemLiquida ?? 0) * (giroAtivo ?? 0) * (multiplicadorPL ?? 0), {
      formula: 'Margem Líquida × Giro do Ativo × Multiplicador de PL', unidade: '%',
      interpretacao: 'ROE reconstruído a partir dos três fatores — mostra de onde vem o retorno sobre o patrimônio.',
    }),
  ];

  return [
    { chave: 'liquidez', nome: 'Liquidez', indicadores: liquidez },
    { chave: 'endividamento', nome: 'Endividamento / Estrutura', indicadores: endividamento },
    { chave: 'rentabilidade', nome: 'Rentabilidade', indicadores: rentabilidade },
    { chave: 'ciclo', nome: 'Ciclo / Eficiência', indicadores: ciclo },
    { chave: 'cobertura', nome: 'Cobertura', indicadores: cobertura },
    { chave: 'dupont', nome: 'Decomposição DuPont (ROE)', indicadores: dupont },
  ];
}

export function todosIndicadores(empresaIds, periodo) {
  return calcularIndicadores(empresaIds, periodo).flatMap((g) => g.indicadores);
}

// Série temporal de um indicador (por chave) ao longo de todos os PERIODOS —
// usada por Sparkline/tendência nos cards de Indicadores.
export function serieIndicador(empresaIds, chave) {
  return PERIODOS.map((periodo) => {
    const encontrado = todosIndicadores(empresaIds, periodo).find((ind) => ind.chave === chave);
    return { periodo, valor: encontrado?.valor ?? null };
  });
}
