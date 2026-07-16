export function formatarMoeda(valor, { compacto = false, contabil = false } = {}) {
  const opcoes = {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
    ...(compacto ? { notation: 'compact' } : {}),
  };
  // Modo contábil: negativos entre parênteses (ex: "(R$ 1.200)"), em vez de
  // sinal de menos — convenção de demonstrativos financeiros. O locale
  // pt-BR não tem um padrão "accounting" no CLDR (currencySign:'accounting'
  // não tem efeito), então formatamos o valor absoluto e envolvemos manualmente.
  if (contabil && valor < 0) {
    return `(${new Intl.NumberFormat('pt-BR', opcoes).format(Math.abs(valor))})`;
  }
  return new Intl.NumberFormat('pt-BR', opcoes).format(valor);
}

// Índice/razão financeira (ex: Liquidez Corrente = 1,25) — 2 casas por
// padrão, sem símbolo.
export function formatarIndice(valor, { casasDecimais = 2 } = {}) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: casasDecimais, maximumFractionDigits: casasDecimais });
}

// Múltiplo (ex: Dívida Líquida/EBITDA = 1,8x).
export function formatarMultiplo(valor, { casasDecimais = 1 } = {}) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return `${formatarIndice(valor, { casasDecimais })}x`;
}

// Prazo em dias (ex: PMR = 45 dias).
export function formatarDias(valor) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return `${Math.round(valor)} dias`;
}

// Arredonda para string e evita o "-0,0" do JS quando um valor negativo
// muito pequeno arredonda para zero (ex: ruído de ponto flutuante).
function paraStringSemZeroNegativo(valor, casasDecimais) {
  const texto = valor.toFixed(casasDecimais);
  return Number(texto) === 0 ? Math.abs(Number(texto)).toFixed(casasDecimais) : texto;
}

export function formatarPercentual(valor, { comSinal = true, casasDecimais = 1 } = {}) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  const sinal = comSinal && valor > 0 ? '+' : '';
  return `${sinal}${paraStringSemZeroNegativo(valor * 100, casasDecimais)}%`;
}

// Variação de um indicador que já é, ele mesmo, um percentual (ex: Margem
// Líquida) deve ser expressa em pontos percentuais (p.p.), não em "%" — para
// não parecer uma variação relativa sobre o percentual anterior.
export function formatarPontosPercentuais(valor, { comSinal = true, casasDecimais = 1 } = {}) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  const sinal = comSinal && valor > 0 ? '+' : '';
  return `${sinal}${paraStringSemZeroNegativo(valor * 100, casasDecimais)} p.p.`;
}

export function formatarDataHora(isoString) {
  if (!isoString) return 'Nunca acessou';
  const data = new Date(isoString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data);
}

export function formatarDataRelativa(isoString) {
  if (!isoString) return 'Nunca acessou';
  const agora = new Date('2026-07-11T12:00:00');
  const data = new Date(isoString);
  const diffMs = agora - data;
  const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHoras < 1) return 'Agora há pouco';
  if (diffHoras < 24) return `Há ${diffHoras}h`;
  const diffDias = Math.floor(diffHoras / 24);
  if (diffDias === 1) return 'Ontem';
  if (diffDias < 7) return `Há ${diffDias} dias`;
  return formatarDataHora(isoString);
}
