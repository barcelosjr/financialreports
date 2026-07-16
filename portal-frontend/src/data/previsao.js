// Projeção/previsibilidade: projeta uma série histórica N meses à frente
// por regressão linear, média móvel ou CAGR, com banda de confiança.
// Determinístico — parte só do histórico seeded, sem aleatoriedade extra,
// então o resultado é estável entre reloads.
import { serieMensal, calcularFluxoCaixa, calcularEBITDA } from './financeiro';
import { PERIODOS } from './constants';
import { desvioPadrao } from '../lib/stats';

function regressaoLinear(valores) {
  const n = valores.length;
  const mediaX = (n - 1) / 2;
  const mediaY = valores.reduce((a, b) => a + b, 0) / n;
  const numerador = valores.reduce((acc, v, x) => acc + (x - mediaX) * (v - mediaY), 0);
  const denominador = valores.reduce((acc, _, x) => acc + (x - mediaX) ** 2, 0);
  const inclinacao = denominador !== 0 ? numerador / denominador : 0;
  const intercepto = mediaY - inclinacao * mediaX;
  const residuos = valores.map((v, x) => v - (intercepto + inclinacao * x));
  const sse = residuos.reduce((acc, r) => acc + r ** 2, 0);
  const erroPadrao = n > 2 ? Math.sqrt(sse / (n - 2)) : 0;
  return { inclinacao, intercepto, erroPadrao, prever: (x) => intercepto + inclinacao * x };
}

function mediaMovelJanela(valores, janela = 3) {
  const ultimos = valores.slice(-janela);
  const media = ultimos.reduce((a, b) => a + b, 0) / ultimos.length;
  return { media, desvio: desvioPadrao(ultimos) };
}

function taxaCagr(valores) {
  const inicio = valores[0];
  const fim = valores[valores.length - 1];
  const passos = valores.length - 1;
  if (inicio <= 0 || fim <= 0 || passos <= 0) return 0;
  return (fim / inicio) ** (1 / passos) - 1;
}

function proximoPeriodo(periodo) {
  const [ano, mes] = periodo.split('-').map(Number);
  return mes === 12 ? `${ano + 1}-01` : `${ano}-${String(mes + 1).padStart(2, '0')}`;
}

function gerarPeriodosFuturos(ultimoPeriodo, quantidade) {
  const periodos = [];
  let atual = ultimoPeriodo;
  for (let i = 0; i < quantidade; i += 1) {
    atual = proximoPeriodo(atual);
    periodos.push(atual);
  }
  return periodos;
}

// Fator de sazonalidade simples: razão entre a média histórica do mesmo mês
// do calendário e a média geral da série. Com só ~12 meses de histórico
// (um ano), cada "média do mês" tende a ter uma única observação — é uma
// aproximação grosseira, não uma decomposição sazonal robusta.
function fatorSazonal(serieHistorica, periodoAlvo, mediaGeral) {
  const mesAlvo = periodoAlvo.split('-')[1];
  const doMesmoMes = serieHistorica.filter((p) => p.periodo.split('-')[1] === mesAlvo);
  if (doMesmoMes.length === 0 || mediaGeral === 0) return 1;
  const mediaDoMes = doMesmoMes.reduce((acc, p) => acc + p.valor, 0) / doMesmoMes.length;
  return mediaDoMes / mediaGeral;
}

// Projeta uma série histórica [{ periodo, valor }] (cronológica) `horizonte`
// meses à frente. `metodo`: 'linear' (regressão por mínimos quadrados),
// 'mediaMovel' (média dos últimos 3 meses) ou 'cagr' (taxa composta de
// crescimento). Cada ponto projetado vem com { min, max } (banda de
// confiança que se alarga com a distância no horizonte).
export function projetarSerie(serieHistorica, { metodo = 'linear', horizonte = 6, sazonalidade = false } = {}) {
  const valores = serieHistorica.map((p) => p.valor);
  const n = valores.length;
  const mediaGeral = valores.reduce((a, b) => a + b, 0) / n;
  const ultimoPeriodo = serieHistorica[n - 1].periodo;
  const periodosFuturos = gerarPeriodosFuturos(ultimoPeriodo, horizonte);
  const sazonal = (periodo) => (sazonalidade ? fatorSazonal(serieHistorica, periodo, mediaGeral) : 1);

  let projecao;
  if (metodo === 'mediaMovel') {
    const { media: base, desvio } = mediaMovelJanela(valores, 3);
    projecao = periodosFuturos.map((periodo, i) => {
      const valor = base * sazonal(periodo);
      const largura = desvio * (1 + i * 0.1);
      return { periodo, valor, min: valor - largura, max: valor + largura };
    });
  } else if (metodo === 'cagr') {
    const taxa = taxaCagr(valores);
    const taxasMensais = valores.slice(1).map((v, i) => (valores[i] !== 0 ? v / valores[i] - 1 : 0));
    const desvioTaxa = desvioPadrao(taxasMensais);
    projecao = periodosFuturos.map((periodo, i) => {
      const passo = i + 1;
      const base = valores[n - 1] * (1 + taxa) ** passo;
      const valor = base * sazonal(periodo);
      const largura = Math.abs(valor) * desvioTaxa * Math.sqrt(passo);
      return { periodo, valor, min: valor - largura, max: valor + largura };
    });
  } else {
    const { erroPadrao, prever } = regressaoLinear(valores);
    projecao = periodosFuturos.map((periodo, i) => {
      const valor = prever(n + i) * sazonal(periodo);
      const largura = erroPadrao * (1 + i * 0.15);
      return { periodo, valor, min: valor - largura, max: valor + largura };
    });
  }

  return { metodo, horizonte, historico: serieHistorica, projecao };
}

// --- Projeções específicas do produto (Receita, EBITDA, Lucro, Caixa) ------

function serieEbitda(empresaIds) {
  return PERIODOS.map((periodo) => ({ periodo, valor: calcularEBITDA(empresaIds, periodo) }));
}

function serieSaldoCaixa(empresaIds) {
  return PERIODOS.map((periodo) => ({ periodo, valor: calcularFluxoCaixa(empresaIds, periodo).saldoFinal }));
}

export function projetarIndicadoresPrincipais(empresaIds, { metodo = 'linear', horizonte = 6 } = {}) {
  const opcoes = { metodo, horizonte };
  return {
    receita: projetarSerie(serieMensal(empresaIds, 'dre', 'subtotal-receita-liquida'), opcoes),
    ebitda: projetarSerie(serieEbitda(empresaIds), opcoes),
    lucroLiquido: projetarSerie(serieMensal(empresaIds, 'dre', 'total-lucro-liquido'), opcoes),
    saldoCaixa: projetarSerie(serieSaldoCaixa(empresaIds), opcoes),
  };
}

// Identifica o primeiro mês projetado em que o saldo de caixa cruza zero —
// vira um alerta de ruptura de caixa (consumido junto com risco.js#calcularAlertas).
export function detectarRupturaCaixa(empresaIds, { metodo = 'linear', horizonte = 6 } = {}) {
  const { projecao } = projetarSerie(serieSaldoCaixa(empresaIds), { metodo, horizonte });
  const mesRuptura = projecao.find((p) => p.valor < 0);
  if (!mesRuptura) return null;
  return {
    periodo: mesRuptura.periodo,
    saldoProjetado: mesRuptura.valor,
    mesesAteRuptura: projecao.indexOf(mesRuptura) + 1,
  };
}
