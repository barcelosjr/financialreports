import { seededRange } from '../lib/random';
import { PERIODOS } from './constants';

// Fator de porte (tamanho) de cada empresa — escala os valores-base de cada
// conta para que empresas maiores/menores do mesmo grupo pareçam plausíveis
// entre si.
const PORTE = {
  'kobe-comercio': 1.0,
  'kobe-industria': 1.8,
  'kobe-logistica': 0.7,
  'royal-matriz': 2.2,
  'royal-sp': 1.3,
  'royal-rj': 1.1,
  'royal-mg': 0.6,
  'renault-centro': 1.5,
  'renault-zonasul': 0.9,
};

// Taxa de crescimento/queda mensal aproximada de cada empresa, usada para dar
// tendência visível nos gráficos de evolução (mock, não é uma projeção real).
const TENDENCIA_MENSAL = {
  'kobe-comercio': 0.012,
  'kobe-industria': 0.004,
  'kobe-logistica': -0.018,
  'royal-matriz': 0.008,
  'royal-sp': 0.02,
  'royal-rj': -0.006,
  'royal-mg': 0.0,
  'renault-centro': 0.01,
  'renault-zonasul': -0.015,
};

function tendencia(empresaId, periodo) {
  const idx = PERIODOS.indexOf(periodo);
  const taxa = TENDENCIA_MENSAL[empresaId] ?? 0;
  return (1 + taxa) ** idx;
}

function porte(empresaId) {
  return PORTE[empresaId] ?? 1;
}

// --- Estruturas dos relatórios -------------------------------------------
// Cada "bloco" agrupa contas (nível de detalhe). O sinal do bloco define se
// ele soma ou subtrai do total corrente; sinalConta (opcional, por conta)
// inverte uma conta específica dentro do próprio bloco (ex: despesa
// financeira dentro do bloco "Resultado Financeiro").
// Linhas do tipo 'subtotal'/'total' não têm contas — seu valor é o total
// corrente acumulado até aquele ponto.

const DRE_BLOCOS = [
  {
    id: 'receita-bruta', nome: 'Receita Bruta', sinal: 1, contas: [
      { id: 'receita-vendas', nome: 'Receita de Vendas', faixa: [220000, 260000] },
      { id: 'receita-servicos', nome: 'Receita de Serviços', faixa: [30000, 45000] },
    ],
  },
  {
    id: 'deducoes', nome: '(-) Deduções da Receita', sinal: -1, contas: [
      { id: 'impostos-vendas', nome: 'Impostos sobre Vendas', faixa: [22000, 29000] },
      { id: 'devolucoes', nome: 'Devoluções e Abatimentos', faixa: [3000, 7000] },
    ],
  },
  { id: 'subtotal-receita-liquida', nome: 'Receita Líquida', tipo: 'subtotal' },
  {
    id: 'cmv', nome: '(-) Custo dos Produtos/Serviços Vendidos', sinal: -1, contas: [
      { id: 'cmv-materia-prima', nome: 'Matéria-prima e Insumos', faixa: [62000, 82000] },
      { id: 'cmv-mao-obra', nome: 'Mão de Obra Direta', faixa: [24000, 34000] },
    ],
  },
  { id: 'subtotal-lucro-bruto', nome: 'Lucro Bruto', tipo: 'subtotal' },
  {
    id: 'despesas-operacionais', nome: '(-) Despesas Operacionais', sinal: -1, contas: [
      { id: 'desp-administrativas', nome: 'Despesas Administrativas', faixa: [26000, 36000] },
      { id: 'desp-comerciais', nome: 'Despesas Comerciais', faixa: [16000, 24000] },
      { id: 'desp-pessoal', nome: 'Despesas com Pessoal', faixa: [42000, 56000] },
    ],
  },
  { id: 'subtotal-ebit', nome: 'Resultado Operacional (EBIT)', tipo: 'subtotal' },
  // EBITDA não integra o total corrente da DRE (Depreciação/Amortização não é
  // uma linha de despesa aqui, e sim informada no Fluxo de Caixa) — por isso
  // usa `ajusteFn`: soma D&A só para exibir esta linha, sem alterar o
  // `running` que segue para o Resultado Financeiro/LAIR/Lucro Líquido.
  {
    id: 'subtotal-ebitda', nome: 'EBITDA', tipo: 'subtotal',
    ajusteFn: (contaValorFn) => contaValorFn(CONTA_DEPRECIACAO),
  },
  {
    id: 'resultado-financeiro', nome: 'Resultado Financeiro', sinal: 1, contas: [
      { id: 'receitas-financeiras', nome: 'Receitas Financeiras', faixa: [2000, 6000] },
      { id: 'despesas-financeiras', nome: 'Despesas Financeiras', faixa: [6000, 13000], sinalConta: -1 },
    ],
  },
  { id: 'subtotal-lair', nome: 'Resultado Antes dos Impostos', tipo: 'subtotal' },
  {
    id: 'impostos-lucro', nome: '(-) Impostos sobre o Lucro (IRPJ/CSLL)', sinal: -1, contas: [
      { id: 'irpj-csll', nome: 'IRPJ e CSLL', faixa: [14000, 22000] },
    ],
  },
  { id: 'total-lucro-liquido', nome: 'Lucro Líquido do Exercício', tipo: 'total' },
];

const ATIVO_BLOCOS = [
  {
    id: 'ativo-circulante', nome: 'Ativo Circulante', sinal: 1, contas: [
      { id: 'caixa-equivalentes', nome: 'Caixa e Equivalentes de Caixa', faixa: [60000, 140000] },
      { id: 'contas-receber', nome: 'Contas a Receber de Clientes', faixa: [90000, 180000] },
      { id: 'estoques', nome: 'Estoques', faixa: [70000, 150000] },
      { id: 'outros-ativos-circ', nome: 'Outros Ativos Circulantes', faixa: [8000, 20000] },
    ],
  },
  { id: 'subtotal-ativo-circulante', nome: 'Total do Ativo Circulante', tipo: 'subtotal', soLinhaAnterior: true },
  {
    id: 'ativo-nao-circulante', nome: 'Ativo Não Circulante', sinal: 1, contas: [
      { id: 'realizavel-lp', nome: 'Realizável a Longo Prazo', faixa: [15000, 35000] },
      { id: 'imobilizado', nome: 'Imobilizado', faixa: [180000, 420000] },
      { id: 'intangivel', nome: 'Intangível', faixa: [10000, 30000] },
    ],
  },
  { id: 'subtotal-ativo-nao-circulante', nome: 'Total do Ativo Não Circulante', tipo: 'subtotal', soLinhaAnterior: true },
  { id: 'total-ativo', nome: 'Ativo Total', tipo: 'total' },
];

const PASSIVO_PL_BLOCOS = [
  {
    id: 'passivo-circulante', nome: 'Passivo Circulante', sinal: 1, contas: [
      { id: 'fornecedores', nome: 'Fornecedores', faixa: [50000, 110000] },
      { id: 'emprestimos-cp', nome: 'Empréstimos e Financiamentos (CP)', faixa: [20000, 55000] },
      { id: 'obrigacoes-trab-trib', nome: 'Obrigações Trabalhistas e Tributárias', faixa: [30000, 60000] },
    ],
  },
  { id: 'subtotal-passivo-circulante', nome: 'Total do Passivo Circulante', tipo: 'subtotal', soLinhaAnterior: true },
  {
    id: 'passivo-nao-circulante', nome: 'Passivo Não Circulante', sinal: 1, contas: [
      { id: 'emprestimos-lp', nome: 'Empréstimos e Financiamentos (LP)', faixa: [60000, 160000] },
    ],
  },
  { id: 'subtotal-passivo-nao-circulante', nome: 'Total do Passivo Não Circulante', tipo: 'subtotal', soLinhaAnterior: true },
  {
    id: 'patrimonio-liquido', nome: 'Patrimônio Líquido', sinal: 1, contas: [
      { id: 'capital-social', nome: 'Capital Social', faixa: [80000, 160000] },
      { id: 'reservas', nome: 'Reservas de Lucros', faixa: [10000, 30000] },
      { id: 'lucros-acumulados', nome: 'Lucros/Prejuízos Acumulados', faixa: null },
    ],
  },
  { id: 'subtotal-patrimonio-liquido', nome: 'Total do Patrimônio Líquido', tipo: 'subtotal', soLinhaAnterior: true },
  { id: 'total-passivo-pl', nome: 'Passivo + Patrimônio Líquido', tipo: 'total' },
];

// Diferente do DRE, os três blocos de atividades aqui NÃO formam um total
// corrente entre si — cada um é independente (seu próprio valor já é o
// "caixa gerado" daquela atividade) e só se somam na linha final. Por isso
// não há linhas de subtotal entre eles: o próprio valor do bloco já é o
// número relevante, e "Variação Líquida de Caixa" acumula os três.
// Conta de D&A compartilhada entre o Fluxo de Caixa (linha real da DEA) e o
// ajuste de EBITDA na DRE — mesmo `id`/`faixa` garante o mesmo valor seeded
// (mesma empresa/período) nos dois lugares, sem duplicar a fonte da verdade.
const CONTA_DEPRECIACAO = { id: 'depreciacao', nome: 'Depreciação e Amortização', faixa: [8000, 16000] };

const FLUXO_BLOCOS_CENTRAL = [
  {
    id: 'atividades-operacionais', nome: 'Atividades Operacionais', sinal: 1, contas: [
      { id: 'lucro-liquido-fc', nome: 'Lucro Líquido do Exercício', faixa: null },
      CONTA_DEPRECIACAO,
      { id: 'variacao-capital-giro', nome: 'Variação no Capital de Giro', faixa: [-20000, 15000] },
    ],
  },
  {
    id: 'atividades-investimento', nome: 'Atividades de Investimento', sinal: 1, contas: [
      { id: 'aquisicao-imobilizado', nome: 'Aquisição de Imobilizado', faixa: [5000, 25000], sinalConta: -1 },
      { id: 'venda-ativos', nome: 'Venda de Ativos', faixa: [0, 6000] },
    ],
  },
  {
    id: 'atividades-financiamento', nome: 'Atividades de Financiamento', sinal: 1, contas: [
      { id: 'captacao-emprestimos', nome: 'Captação de Empréstimos', faixa: [0, 20000] },
      { id: 'pagamento-emprestimos', nome: 'Pagamento de Empréstimos', faixa: [8000, 18000], sinalConta: -1 },
      { id: 'dividendos', nome: 'Distribuição de Dividendos', faixa: [0, 15000], sinalConta: -1 },
    ],
  },
  { id: 'variacao-liquida', nome: 'Variação Líquida de Caixa', tipo: 'total' },
];

// --- Motor de cálculo -------------------------------------------------------

function computeLinhas(blocos, contaValorFn) {
  let running = 0;
  let ultimoBlocoValor = 0;
  const linhas = [];
  for (const bloco of blocos) {
    if (bloco.tipo === 'subtotal' || bloco.tipo === 'total') {
      const ajuste = bloco.ajusteFn ? bloco.ajusteFn(contaValorFn) : 0;
      // soLinhaAnterior: usado pelo Balanço, onde cada seção (Ativo Circulante,
      // Ativo Não Circulante, ...) é independente das demais — "Total da
      // seção" deve repetir só o bloco imediatamente anterior, não acumular
      // com seções anteriores (isso só acontece nos totais finais, que usam
      // `running` corrido de verdade). Sem essa flag (caso do DRE, que É uma
      // cascata contínua), o subtotal usa o total corrente normalmente.
      const base = bloco.soLinhaAnterior ? ultimoBlocoValor : running;
      linhas.push({ id: bloco.id, nome: bloco.nome, valor: base + ajuste, tipo: bloco.tipo });
      continue;
    }
    const contas = bloco.contas.map((c) => ({
      id: c.id,
      nome: c.nome,
      valor: contaValorFn(c) * (c.sinalConta ?? 1),
    }));
    const somaContas = contas.reduce((acc, c) => acc + c.valor, 0);
    const valorBloco = somaContas * bloco.sinal;
    running += valorBloco;
    ultimoBlocoValor = valorBloco;
    linhas.push({ id: bloco.id, nome: bloco.nome, valor: valorBloco, tipo: 'bloco', contas });
  }
  return linhas;
}

function fazerContaValorFn(empresaId, periodo, overrides = {}) {
  const escala = porte(empresaId) * tendencia(empresaId, periodo);
  return (conta) => {
    if (conta.id in overrides) return overrides[conta.id];
    const [min, max] = conta.faixa;
    return seededRange(`${empresaId}|${conta.id}|${periodo}`, min, max) * escala;
  };
}

export function porId(linhas, id) {
  return linhas.find((l) => l.id === id) ?? { valor: 0 };
}

const dreCache = new Map();
export function buildDRE(empresaId, periodo) {
  const chave = `${empresaId}|${periodo}`;
  if (dreCache.has(chave)) return dreCache.get(chave);
  const linhas = computeLinhas(DRE_BLOCOS, fazerContaValorFn(empresaId, periodo));
  dreCache.set(chave, linhas);
  return linhas;
}

export function buildBalanco(empresaId, periodo) {
  const ativo = computeLinhas(ATIVO_BLOCOS, fazerContaValorFn(empresaId, periodo));
  const ativoTotal = porId(ativo, 'total-ativo').valor;

  // Patrimônio Líquido usa "Lucros/Prejuízos Acumulados" como valor de
  // fechamento (plug), garantindo que Ativo Total == Passivo + PL sempre
  // bata, como num balanço real.
  const contaValor = fazerContaValorFn(empresaId, periodo);
  const blocoCirculante = PASSIVO_PL_BLOCOS.find((b) => b.id === 'passivo-circulante');
  const blocoNaoCirculante = PASSIVO_PL_BLOCOS.find((b) => b.id === 'passivo-nao-circulante');
  const blocoPL = PASSIVO_PL_BLOCOS.find((b) => b.id === 'patrimonio-liquido');

  const passivoCirculante = blocoCirculante.contas.reduce((acc, c) => acc + contaValor(c), 0);
  const passivoNaoCirculante = blocoNaoCirculante.contas.reduce((acc, c) => acc + contaValor(c), 0);
  const capitalSocial = contaValor(blocoPL.contas.find((c) => c.id === 'capital-social'));
  const reservas = contaValor(blocoPL.contas.find((c) => c.id === 'reservas'));
  const lucrosAcumulados = ativoTotal - passivoCirculante - passivoNaoCirculante - capitalSocial - reservas;

  const passivoPl = computeLinhas(
    PASSIVO_PL_BLOCOS,
    fazerContaValorFn(empresaId, periodo, { 'lucros-acumulados': lucrosAcumulados })
  );

  return { ativo, passivoPl };
}

const fluxoCache = new Map();
export function buildFluxoCaixaSerie(empresaId) {
  if (fluxoCache.has(empresaId)) return fluxoCache.get(empresaId);
  let saldoAnterior = seededRange(`${empresaId}|saldo-inicial-base`, 40000, 120000) * porte(empresaId);
  const serie = [];
  for (const periodo of PERIODOS) {
    const lucroLiquido = porId(buildDRE(empresaId, periodo), 'total-lucro-liquido').valor;
    const linhasCentrais = computeLinhas(
      FLUXO_BLOCOS_CENTRAL,
      fazerContaValorFn(empresaId, periodo, { 'lucro-liquido-fc': lucroLiquido })
    );
    const variacaoLiquida = porId(linhasCentrais, 'variacao-liquida').valor;
    const saldoInicial = saldoAnterior;
    const saldoFinal = saldoInicial + variacaoLiquida;
    saldoAnterior = saldoFinal;
    serie.push({
      periodo,
      saldoInicial,
      saldoFinal,
      variacaoLiquida,
      linhas: [
        { id: 'saldo-inicial', nome: 'Saldo Inicial de Caixa', valor: saldoInicial, tipo: 'total' },
        ...linhasCentrais,
        { id: 'saldo-final', nome: 'Saldo Final de Caixa', valor: saldoFinal, tipo: 'total' },
      ],
    });
  }
  fluxoCache.set(empresaId, serie);
  return serie;
}

export function buildFluxoCaixa(empresaId, periodo) {
  return buildFluxoCaixaSerie(empresaId).find((s) => s.periodo === periodo);
}

// --- Agregação entre empresas (grupo inteiro ou seleção) -------------------

function somarLinhas(listas) {
  // Lista vazia acontece de verdade agora: com o backend real (Fase 2), há
  // uma folga entre o login resolver e GET /grupos terminar, em que
  // empresaIdsEscopo é [] -- no mock isso nunca acontecia (grupos já
  // vinham prontos no primeiro render).
  if (listas.length === 0) return [];
  const [primeira, ...resto] = listas;
  return primeira.map((linha, i) => ({
    ...linha,
    valor: resto.reduce((acc, lista) => acc + lista[i].valor, linha.valor),
    contas: linha.contas
      ? linha.contas.map((conta, j) => ({
          ...conta,
          valor: resto.reduce((acc, lista) => acc + lista[i].contas[j].valor, conta.valor),
        }))
      : undefined,
  }));
}

export function calcularDRE(empresaIds, periodo) {
  return somarLinhas(empresaIds.map((id) => buildDRE(id, periodo)));
}

// Depreciação e Amortização de uma única empresa (mesmo valor da linha do
// Fluxo de Caixa — ver CONTA_DEPRECIACAO).
export function depreciacaoAmortizacao(empresaId, periodo) {
  return fazerContaValorFn(empresaId, periodo)(CONTA_DEPRECIACAO);
}

export function calcularEBITDA(empresaIds, periodo) {
  return porId(calcularDRE(empresaIds, periodo), 'subtotal-ebitda').valor;
}

export function calcularBalanco(empresaIds, periodo) {
  const resultados = empresaIds.map((id) => buildBalanco(id, periodo));
  return {
    ativo: somarLinhas(resultados.map((r) => r.ativo)),
    passivoPl: somarLinhas(resultados.map((r) => r.passivoPl)),
  };
}

export function calcularFluxoCaixa(empresaIds, periodo) {
  const linhas = somarLinhas(empresaIds.map((id) => buildFluxoCaixa(id, periodo).linhas));
  return {
    linhas,
    saldoInicial: porId(linhas, 'saldo-inicial').valor,
    saldoFinal: porId(linhas, 'saldo-final').valor,
    variacaoLiquida: porId(linhas, 'variacao-liquida').valor,
  };
}

// --- Agregação por intervalo de período (periodoInicio/periodoFim) --------

export function periodosNoIntervalo(periodoInicio, periodoFim) {
  const iIni = PERIODOS.indexOf(periodoInicio);
  const iFim = PERIODOS.indexOf(periodoFim);
  return PERIODOS.slice(iIni, iFim + 1);
}

// Todos os períodos de PERIODOS cujo ano (prefixo "AAAA") bate com o ano
// informado — usado pelo filtro "Ano" das telas de relatório.
export function periodosDoAno(ano) {
  return PERIODOS.filter((p) => p.startsWith(`${ano}-`));
}

export function anosDisponiveis() {
  return [...new Set(PERIODOS.map((p) => p.split('-')[0]))];
}

// Para cada ano disponível, o período de fechamento (último mês daquele ano
// dentro de PERIODOS) — usado pelo Balanço, que só faz sentido comparado ano
// a ano (posição de fechamento), não mês a mês.
export function periodosFechamentoAnual() {
  return anosDisponiveis().map((ano) => {
    const meses = periodosDoAno(ano);
    return { ano, periodo: meses[meses.length - 1] };
  });
}

export function calcularFluxoCaixaIntervalo(empresaIds, periodoInicio, periodoFim) {
  const periodos = periodosNoIntervalo(periodoInicio, periodoFim);
  const listasCentrais = empresaIds.flatMap((id) =>
    periodos.map((p) => buildFluxoCaixa(id, p).linhas.filter((l) => l.id !== 'saldo-inicial' && l.id !== 'saldo-final'))
  );
  const linhasCentrais = somarLinhas(listasCentrais);
  const saldoInicial = empresaIds.reduce((acc, id) => acc + buildFluxoCaixa(id, periodoInicio).saldoInicial, 0);
  const saldoFinal = empresaIds.reduce((acc, id) => acc + buildFluxoCaixa(id, periodoFim).saldoFinal, 0);
  return {
    linhas: [
      { id: 'saldo-inicial', nome: 'Saldo Inicial de Caixa', valor: saldoInicial, tipo: 'total' },
      ...linhasCentrais,
      { id: 'saldo-final', nome: 'Saldo Final de Caixa', valor: saldoFinal, tipo: 'total' },
    ],
    saldoInicial,
    saldoFinal,
    variacaoLiquida: saldoFinal - saldoInicial,
  };
}

// --- Tabela multi-período (uma coluna por mês, com Média/AH/AV opcionais) --
//
// Usada pelas telas de relatório quando o usuário pede "por mês(es)/ano":
// em vez de somar tudo num único total, devolve, para cada linha, um valor
// por período selecionado — mais Análise Horizontal (variação vs. o mês
// anterior na linha do tempo, esteja ele selecionado ou não), Análise
// Vertical (% sobre uma linha-base, ex: Receita Líquida) e Média do período
// selecionado, quando pedidos.
//
// `calcularFn(empresaIds, periodo)` deve devolver um array de linhas no
// mesmo formato de calcularDRE/calcularBalanco(...).ativo/etc.

function pctVariacao(atual, anterior) {
  if (anterior === null || anterior === undefined || anterior === 0) return null;
  return (atual - anterior) / Math.abs(anterior);
}

export function construirTabelaPeriodos(calcularFn, empresaIds, periodos, opcoes = {}) {
  const { media = false, ah = false, av = false, total = false, baseAVId = null, ahVsColunaAnterior = false } = opcoes;

  // AH padrão (DRE/Fluxo) compara cada mês com o mês imediatamente anterior,
  // esteja ele selecionado ou não — por isso pode precisar carregar um mês a
  // mais. AH "vs. coluna anterior" (Balanço anual) compara cada coluna com a
  // coluna anterior da própria seleção, então não precisa de nada extra.
  const periodosNecessarios = new Set(periodos);
  if (ah && !ahVsColunaAnterior) {
    for (const p of periodos) {
      const idx = PERIODOS.indexOf(p);
      if (idx > 0) periodosNecessarios.add(PERIODOS[idx - 1]);
    }
  }

  const cache = new Map();
  for (const p of periodosNecessarios) cache.set(p, calcularFn(empresaIds, p));

  const valorEm = (periodo, i, contaIdx) =>
    contaIdx == null ? cache.get(periodo)[i].valor : cache.get(periodo)[i].contas[contaIdx].valor;

  function ahDaLinha(i, contaIdx) {
    if (!ah) return undefined;
    return periodos.map((p, k) => {
      let periodoAnterior;
      if (ahVsColunaAnterior) {
        periodoAnterior = k > 0 ? periodos[k - 1] : null;
      } else {
        const idx = PERIODOS.indexOf(p);
        periodoAnterior = idx > 0 ? PERIODOS[idx - 1] : null;
      }
      if (!periodoAnterior || !cache.has(periodoAnterior)) return null;
      return pctVariacao(valorEm(p, i, contaIdx), valorEm(periodoAnterior, i, contaIdx));
    });
  }

  function avDaLinha(i, contaIdx) {
    if (!av || !baseAVId) return undefined;
    return periodos.map((p) => {
      const linhasPeriodo = cache.get(p);
      const base = linhasPeriodo.find((l) => l.id === baseAVId)?.valor;
      if (!base) return null;
      const valor = contaIdx == null ? linhasPeriodo[i].valor : linhasPeriodo[i].contas[contaIdx].valor;
      return valor / base;
    });
  }

  function mediaDe(valores) {
    if (!media) return undefined;
    return valores.reduce((acc, v) => acc + v, 0) / valores.length;
  }

  function totalDe(valores) {
    if (!total) return undefined;
    return valores.reduce((acc, v) => acc + v, 0);
  }

  const linhaBase = cache.get(periodos[0]);

  return linhaBase.map((linha, i) => {
    const valoresPorPeriodo = periodos.map((p) => cache.get(p)[i].valor);

    const contas = linha.contas
      ? linha.contas.map((conta, j) => {
          const valoresContaPorPeriodo = periodos.map((p) => cache.get(p)[i].contas[j].valor);
          return {
            id: conta.id,
            nome: conta.nome,
            valoresPorPeriodo: valoresContaPorPeriodo,
            ahPorPeriodo: ahDaLinha(i, j),
            avPorPeriodo: avDaLinha(i, j),
            media: mediaDe(valoresContaPorPeriodo),
            total: totalDe(valoresContaPorPeriodo),
          };
        })
      : undefined;

    return {
      id: linha.id,
      nome: linha.nome,
      tipo: linha.tipo,
      valoresPorPeriodo,
      ahPorPeriodo: ahDaLinha(i, null),
      avPorPeriodo: avDaLinha(i, null),
      media: mediaDe(valoresPorPeriodo),
      total: totalDe(valoresPorPeriodo),
      contas,
    };
  });
}

// --- KPIs e séries para o Dashboard -----------------------------------------

export function calcularKpis(empresaIds, periodo) {
  const idxAtual = PERIODOS.indexOf(periodo);
  const periodoAnterior = idxAtual > 0 ? PERIODOS[idxAtual - 1] : null;

  const dreAtual = calcularDRE(empresaIds, periodo);
  const receitaLiquida = porId(dreAtual, 'subtotal-receita-liquida').valor;
  const lucroLiquido = porId(dreAtual, 'total-lucro-liquido').valor;
  const margem = receitaLiquida !== 0 ? lucroLiquido / receitaLiquida : 0;
  const saldoCaixa = calcularFluxoCaixa(empresaIds, periodo).saldoFinal;

  let variacao = { receitaLiquida: null, lucroLiquido: null, margem: null, saldoCaixa: null };
  if (periodoAnterior) {
    const dreAnterior = calcularDRE(empresaIds, periodoAnterior);
    const receitaAnterior = porId(dreAnterior, 'subtotal-receita-liquida').valor;
    const lucroAnterior = porId(dreAnterior, 'total-lucro-liquido').valor;
    const margemAnterior = receitaAnterior !== 0 ? lucroAnterior / receitaAnterior : 0;
    const saldoAnterior = calcularFluxoCaixa(empresaIds, periodoAnterior).saldoFinal;

    const pct = (atual, anterior) => (anterior !== 0 ? (atual - anterior) / Math.abs(anterior) : null);
    variacao = {
      receitaLiquida: pct(receitaLiquida, receitaAnterior),
      lucroLiquido: pct(lucroLiquido, lucroAnterior),
      margem: margemAnterior !== 0 ? margem - margemAnterior : null,
      saldoCaixa: pct(saldoCaixa, saldoAnterior),
    };
  }

  return { receitaLiquida, lucroLiquido, margem, saldoCaixa, variacao };
}

export function serieMensal(empresaIds, relatorio, campoId) {
  return PERIODOS.map((periodo) => {
    let valor;
    if (relatorio === 'dre') {
      valor = porId(calcularDRE(empresaIds, periodo), campoId).valor;
    } else {
      valor = calcularFluxoCaixa(empresaIds, periodo)[campoId];
    }
    return { periodo, valor };
  });
}

export function resultadoPorEmpresa(empresas, periodo) {
  return empresas.map((empresa) => ({
    empresaId: empresa.id,
    nome: empresa.nome,
    lucroLiquido: porId(buildDRE(empresa.id, periodo), 'total-lucro-liquido').valor,
    receitaLiquida: porId(buildDRE(empresa.id, periodo), 'subtotal-receita-liquida').valor,
  }));
}
