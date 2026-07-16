// Análise de risco de negócio: Altman Z''-Score, covenants, break-even,
// alavancagem operacional/financeira, runway de caixa, concentração no
// grupo e volatilidade — construído sobre financeiro.js e indicadores.js
// (nenhuma fórmula duplicada: covenants reusam os índices já calculados).
import { calcularDRE, calcularBalanco, calcularFluxoCaixa, porId, resultadoPorEmpresa } from './financeiro';
import { todosIndicadores } from './indicadores';
import { PERIODOS } from './constants';
import { desvioPadrao } from '../lib/stats';

function contaDe(linhas, blocoId, contaId) {
  return porId(linhas, blocoId).contas?.find((c) => c.id === contaId)?.valor ?? 0;
}

// --- Altman Z''-Score (mercados emergentes / não-manufatura) ---------------

export function calcularAltmanZ(empresaIds, periodo) {
  const dre = calcularDRE(empresaIds, periodo);
  const { ativo, passivoPl } = calcularBalanco(empresaIds, periodo);

  const ativoCirculante = porId(ativo, 'subtotal-ativo-circulante').valor;
  const ativoTotal = porId(ativo, 'total-ativo').valor;
  const passivoCirculante = porId(passivoPl, 'subtotal-passivo-circulante').valor;
  const passivoNaoCirculante = porId(passivoPl, 'subtotal-passivo-nao-circulante').valor;
  const passivoTotal = passivoCirculante + passivoNaoCirculante;
  const patrimonioLiquido = porId(passivoPl, 'subtotal-patrimonio-liquido').valor;
  const reservas = contaDe(passivoPl, 'patrimonio-liquido', 'reservas');
  const lucrosAcumulados = contaDe(passivoPl, 'patrimonio-liquido', 'lucros-acumulados');
  const ebit = porId(dre, 'subtotal-ebit').valor;

  const x1 = (ativoCirculante - passivoCirculante) / ativoTotal;
  const x2 = (reservas + lucrosAcumulados) / ativoTotal;
  const x3 = ebit / ativoTotal;
  const x4 = passivoTotal !== 0 ? patrimonioLiquido / passivoTotal : 0;

  const valor = 3.25 + 6.56 * x1 + 3.26 * x2 + 6.72 * x3 + 1.05 * x4;
  const zona = valor > 2.6 ? 'seguro' : valor >= 1.1 ? 'cinza' : 'perigo';

  return { valor, zona, componentes: { x1, x2, x3, x4 } };
}

// --- Monitores de covenant (limites configuráveis) -------------------------

export const LIMITES_COVENANT_PADRAO = {
  dividaLiquidaEbitda: 3.0, // <=
  liquidezCorrente: 1.0, // >=
  coberturaJuros: 2.0, // >=
};

const COVENANTS_CONFIG = [
  { chave: 'dividaLiquidaEbitda', nome: 'Dívida Líquida / EBITDA', direcao: 'menor', unidade: 'x' },
  { chave: 'liquidezCorrente', nome: 'Liquidez Corrente', direcao: 'maior', unidade: 'x' },
  { chave: 'coberturaJuros', nome: 'Cobertura de Juros', direcao: 'maior', unidade: 'x' },
];

export function calcularCovenants(empresaIds, periodo, limites = LIMITES_COVENANT_PADRAO) {
  const indicadores = todosIndicadores(empresaIds, periodo);
  const valorDe = (chave) => indicadores.find((i) => i.chave === chave)?.valor ?? null;

  return COVENANTS_CONFIG.map((cfg) => {
    const valor = valorDe(cfg.chave);
    const limite = limites[cfg.chave];
    const cumprido = valor == null ? null : cfg.direcao === 'menor' ? valor <= limite : valor >= limite;
    return {
      ...cfg,
      valor,
      limite,
      cumprido,
      estourado: cumprido === false,
      status: cumprido === null ? 'atencao' : cumprido ? 'bom' : 'ruim',
    };
  });
}

// --- Break-even, margem de segurança e alavancagem operacional/financeira -

// Heurística de separação custos fixos/variáveis a partir dos blocos da DRE:
// variáveis = CMV + Impostos sobre Vendas + Despesas Comerciais (escalam com a venda);
// fixos = Despesas Administrativas + Despesas com Pessoal (não escalam no curto prazo).
// Ajustável trocando quais contas entram em cada lado.
export function calcularBreakEven(empresaIds, periodo) {
  const dre = calcularDRE(empresaIds, periodo);
  const receita = porId(dre, 'subtotal-receita-liquida').valor;
  const cmv = -porId(dre, 'cmv').valor;
  const impostosVendas = contaDe(dre, 'deducoes', 'impostos-vendas');
  const despComerciais = contaDe(dre, 'despesas-operacionais', 'desp-comerciais');
  const despAdministrativas = contaDe(dre, 'despesas-operacionais', 'desp-administrativas');
  const despPessoal = contaDe(dre, 'despesas-operacionais', 'desp-pessoal');
  const ebit = porId(dre, 'subtotal-ebit').valor;
  const lair = porId(dre, 'subtotal-lair').valor;

  const custosVariaveis = cmv + impostosVendas + despComerciais;
  const custosFixos = despAdministrativas + despPessoal;
  const margemContribuicao = receita - custosVariaveis;
  const indiceMC = receita !== 0 ? margemContribuicao / receita : 0;
  const pontoEquilibrio = indiceMC !== 0 ? custosFixos / indiceMC : null;
  const margemSeguranca = pontoEquilibrio != null && receita !== 0 ? (receita - pontoEquilibrio) / receita : null;

  // GAO (grau de alavancagem operacional): quanto o EBIT varia para cada 1%
  // de variação na receita. GAF: quanto o LAIR varia para cada 1% de
  // variação no EBIT. GAC = GAO × GAF: alavancagem combinada.
  const gao = ebit !== 0 ? margemContribuicao / ebit : null;
  const gaf = lair !== 0 ? ebit / lair : null;
  const gac = gao != null && gaf != null ? gao * gaf : null;

  return {
    receita, custosVariaveis, custosFixos, margemContribuicao, indiceMC,
    pontoEquilibrio, margemSeguranca, gao, gaf, gac,
  };
}

// --- Runway / queima de caixa -----------------------------------------------

export function calcularRunway(empresaIds, periodo) {
  const fluxo = calcularFluxoCaixa(empresaIds, periodo);
  const fco = porId(fluxo.linhas, 'atividades-operacionais').valor;
  const saldoCaixa = fluxo.saldoFinal;

  if (fco >= 0) return { fco, saldoCaixa, burnMensal: 0, mesesRunway: null, emRisco: false };

  const burnMensal = -fco;
  const mesesRunway = saldoCaixa / burnMensal;
  return { fco, saldoCaixa, burnMensal, mesesRunway, emRisco: mesesRunway < 6 };
}

// --- Concentração no grupo (share de receita/lucro + HHI) ------------------

export function calcularConcentracao(empresas, periodo) {
  const resultado = resultadoPorEmpresa(empresas, periodo);
  const totalReceita = resultado.reduce((acc, r) => acc + r.receitaLiquida, 0);
  const totalLucro = resultado.reduce((acc, r) => acc + r.lucroLiquido, 0);

  const itens = resultado.map((r) => ({
    ...r,
    shareReceita: totalReceita !== 0 ? r.receitaLiquida / totalReceita : 0,
    shareLucro: totalLucro !== 0 ? r.lucroLiquido / totalLucro : 0,
  }));

  // HHI (Índice Herfindahl-Hirschman) na escala 0–10000: soma dos shares (em
  // %) ao quadrado. > 2500 costuma ser lido como "alta concentração".
  const hhiReceita = itens.reduce((acc, i) => acc + (i.shareReceita * 100) ** 2, 0);

  return { itens, hhiReceita };
}

// --- Volatilidade (desvio-padrão de margem e receita) -----------------------

export function calcularVolatilidade(empresaIds, { janelaMeses = 6 } = {}) {
  const periodosJanela = PERIODOS.slice(-janelaMeses);
  const pontos = periodosJanela.map((p) => {
    const dre = calcularDRE(empresaIds, p);
    const receita = porId(dre, 'subtotal-receita-liquida').valor;
    const lucro = porId(dre, 'total-lucro-liquido').valor;
    return { receita, margem: receita !== 0 ? lucro / receita : 0 };
  });

  return {
    janelaMeses,
    desvioPadraoMargem: desvioPadrao(pontos.map((p) => p.margem)),
    desvioPadraoReceita: desvioPadrao(pontos.map((p) => p.receita)),
  };
}

// --- Agregador de alertas ----------------------------------------------------

const ORDEM_SEVERIDADE = { alta: 0, media: 1, baixa: 2 };

// Consolida os sinais de risco num só lugar (Dashboard + tela de Análise de
// Risco). Alertas de outros módulos (ex: ruptura de caixa projetada em
// previsao.js) devem ser concatenados pelo chamador — ver Previsao.jsx.
export function calcularAlertas(empresaIds, periodo, { limites = LIMITES_COVENANT_PADRAO } = {}) {
  const alertas = [];

  const z = calcularAltmanZ(empresaIds, periodo);
  if (z.zona === 'perigo') {
    alertas.push({
      severidade: 'alta',
      titulo: "Zona de perigo no Altman Z''-Score",
      detalhe: `Z''-Score em ${z.valor.toFixed(2)}, abaixo de 1,10 — risco elevado de insolvência.`,
    });
  } else if (z.zona === 'cinza') {
    alertas.push({
      severidade: 'media',
      titulo: "Zona de atenção no Altman Z''-Score",
      detalhe: `Z''-Score em ${z.valor.toFixed(2)}, na zona cinza (1,10–2,60).`,
    });
  }

  for (const cov of calcularCovenants(empresaIds, periodo, limites)) {
    if (cov.estourado) {
      alertas.push({
        severidade: 'alta',
        titulo: `Covenant estourado: ${cov.nome}`,
        detalhe: `Valor atual ${cov.valor?.toFixed(2)}${cov.unidade} vs. limite ${cov.direcao === 'menor' ? '≤' : '≥'} ${cov.limite}${cov.unidade}.`,
      });
    }
  }

  const runway = calcularRunway(empresaIds, periodo);
  if (runway.emRisco) {
    alertas.push({
      severidade: runway.mesesRunway < 3 ? 'alta' : 'media',
      titulo: 'Queima de caixa acelerada',
      detalhe: `No ritmo atual de queima, o caixa dura aproximadamente ${runway.mesesRunway.toFixed(1)} meses.`,
    });
  }

  return alertas.sort((a, b) => ORDEM_SEVERIDADE[a.severidade] - ORDEM_SEVERIDADE[b.severidade]);
}
