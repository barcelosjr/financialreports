// Orçado × Realizado: gera um orçamento determinístico para a DRE (meta de
// crescimento por bloco + ruído seeded, para não ser um múltiplo perfeito do
// realizado) e compara linha a linha. Mesmo princípio do motor mock em
// financeiro.js — nada é aleatório de verdade, é seeded por
// empresa+conta+período, então é estável entre reloads.
import { calcularDRE, porId, depreciacaoAmortizacao } from './financeiro';
import { seededRange } from '../lib/random';

// Espelha a ordem/sinal dos blocos de DRE_BLOCOS em financeiro.js (mesmo
// padrão de duplicação estrutural já usado em estruturaPadrao.js) — o
// orçamento precisa recompor o total corrente a partir das contas orçadas,
// e calcularDRE só expõe o valor líquido de cada bloco, não o sinal isolado.
const ORDEM_DRE = [
  { id: 'receita-bruta', tipo: 'bloco', sinal: 1 },
  { id: 'deducoes', tipo: 'bloco', sinal: -1 },
  { id: 'subtotal-receita-liquida', tipo: 'subtotal' },
  { id: 'cmv', tipo: 'bloco', sinal: -1 },
  { id: 'subtotal-lucro-bruto', tipo: 'subtotal' },
  { id: 'despesas-operacionais', tipo: 'bloco', sinal: -1 },
  { id: 'subtotal-ebit', tipo: 'subtotal' },
  { id: 'subtotal-ebitda', tipo: 'subtotal', ajusteDA: true },
  { id: 'resultado-financeiro', tipo: 'bloco', sinal: 1 },
  { id: 'subtotal-lair', tipo: 'subtotal' },
  { id: 'impostos-lucro', tipo: 'bloco', sinal: -1 },
  { id: 'total-lucro-liquido', tipo: 'total' },
];

// Meta de crescimento por bloco: receita cresce mais que custo/despesa —
// meta de expansão de margem. Ajustável.
const META_POR_BLOCO = {
  'receita-bruta': 0.05,
  deducoes: 0.04,
  cmv: 0.03,
  'despesas-operacionais': 0.02,
  'resultado-financeiro': 0,
  'impostos-lucro': 0.03,
};

const SINAL_CONTA_NEGATIVA = new Set(['despesas-financeiras']);
const COST_BLOCOS = new Set(['deducoes', 'cmv', 'despesas-operacionais', 'impostos-lucro']);
const REVENUE_OU_NET_BLOCOS = new Set(['receita-bruta', 'resultado-financeiro']);

function orcarConta({ empresaIds, contaId, periodo, valorRealizado, meta }) {
  const chave = `${empresaIds.join('+')}|orcamento|${contaId}|${periodo}`;
  const ruido = seededRange(chave, -0.08, 0.08);
  const magnitude = Math.abs(valorRealizado) * (1 + meta + ruido);
  return SINAL_CONTA_NEGATIVA.has(contaId) ? -magnitude : magnitude;
}

// Gera a DRE orçada, na mesma forma (linhas/contas) de calcularDRE.
export function orcamentoDRE(empresaIds, periodo) {
  const realizado = calcularDRE(empresaIds, periodo);
  const daRealizado = empresaIds.reduce((acc, id) => acc + depreciacaoAmortizacao(id, periodo), 0);
  const daOrcado = orcarConta({ empresaIds, contaId: 'depreciacao', periodo, valorRealizado: daRealizado, meta: 0 });

  let running = 0;
  return ORDEM_DRE.map((item) => {
    const linhaReal = porId(realizado, item.id);
    if (item.tipo !== 'bloco') {
      const ajuste = item.ajusteDA ? daOrcado : 0;
      return { id: item.id, nome: linhaReal.nome, valor: running + ajuste, tipo: linhaReal.tipo };
    }
    const meta = META_POR_BLOCO[item.id] ?? 0;
    const contas = (linhaReal.contas ?? []).map((c) => ({
      id: c.id,
      nome: c.nome,
      valor: orcarConta({ empresaIds, contaId: c.id, periodo, valorRealizado: c.valor, meta }),
    }));
    const valorBloco = contas.reduce((acc, c) => acc + c.valor, 0) * item.sinal;
    running += valorBloco;
    return { id: item.id, nome: linhaReal.nome, valor: valorBloco, tipo: 'bloco', contas };
  });
}

function compararLinha(linhaReal, linhaOrc, despesaHint) {
  const variacaoAbs = linhaReal.valor - linhaOrc.valor;
  const variacaoPct = linhaOrc.valor !== 0 ? variacaoAbs / Math.abs(linhaOrc.valor) : null;
  const atingimento = linhaOrc.valor !== 0 ? linhaReal.valor / linhaOrc.valor : null;
  // "Favorável" depende de a linha ser receita (realizar mais é bom) ou
  // despesa (realizar menos é bom). despesaHint vem do bloco-pai quando o
  // sinal do próprio valor orçado não é confiável (contas de custo/despesa
  // guardam magnitude positiva); senão usamos o sinal do valor orçado.
  // Para despesas comparamos por magnitude — blocos de custo guardam o total
  // corrente já negativo (sinal do bloco), enquanto as contas-filhas guardam
  // magnitude positiva; comparar valores "crus" inverteria o resultado num
  // dos dois casos.
  const ehDespesa = despesaHint ?? linhaOrc.valor < 0;
  const favoravel = ehDespesa ? Math.abs(linhaReal.valor) <= Math.abs(linhaOrc.valor) : variacaoAbs >= 0;
  return {
    id: linhaReal.id,
    nome: linhaReal.nome,
    tipo: linhaReal.tipo,
    realizado: linhaReal.valor,
    orcado: linhaOrc.valor,
    variacaoAbs,
    variacaoPct,
    atingimento,
    status: favoravel ? 'favoravel' : 'desfavoravel',
  };
}

// Compara realizado (calcularDRE) com orçado (orcamentoDRE) linha a linha,
// devolvendo realizado/orçado/variação (R$ e %)/% de atingimento/status.
export function compararOrcadoRealizado(empresaIds, periodo) {
  const realizado = calcularDRE(empresaIds, periodo);
  const orcado = orcamentoDRE(empresaIds, periodo);

  return realizado.map((linhaReal, i) => {
    const linhaOrc = orcado[i];
    let hintBloco = null;
    if (COST_BLOCOS.has(linhaReal.id)) hintBloco = true;
    else if (REVENUE_OU_NET_BLOCOS.has(linhaReal.id)) hintBloco = false;

    const base = compararLinha(linhaReal, linhaOrc, hintBloco);
    if (!linhaReal.contas) return base;

    const hintContas = COST_BLOCOS.has(linhaReal.id) ? true : null;
    return {
      ...base,
      contas: linhaReal.contas.map((contaReal, j) => compararLinha(contaReal, linhaOrc.contas[j], hintContas)),
    };
  });
}
