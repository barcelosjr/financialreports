// Estatística descritiva mínima, compartilhada entre risco.js (volatilidade)
// e previsao.js (bandas de confiança).
export function media(valores) {
  if (valores.length === 0) return 0;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

export function desvioPadrao(valores) {
  if (valores.length === 0) return 0;
  const m = media(valores);
  const variancia = valores.reduce((acc, v) => acc + (v - m) ** 2, 0) / valores.length;
  return Math.sqrt(variancia);
}
