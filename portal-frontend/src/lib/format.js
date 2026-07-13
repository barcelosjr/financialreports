export function formatarMoeda(valor, { compacto = false } = {}) {
  if (compacto) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 0,
    }).format(valor);
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(valor);
}

export function formatarPercentual(valor, { comSinal = true, casasDecimais = 1 } = {}) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  const sinal = comSinal && valor > 0 ? '+' : '';
  return `${sinal}${(valor * 100).toFixed(casasDecimais)}%`;
}

// Variação de um indicador que já é, ele mesmo, um percentual (ex: Margem
// Líquida) deve ser expressa em pontos percentuais (p.p.), não em "%" — para
// não parecer uma variação relativa sobre o percentual anterior.
export function formatarPontosPercentuais(valor, { comSinal = true, casasDecimais = 1 } = {}) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  const sinal = comSinal && valor > 0 ? '+' : '';
  return `${sinal}${(valor * 100).toFixed(casasDecimais)} p.p.`;
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
