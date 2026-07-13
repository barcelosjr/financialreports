// PRNG determinístico a partir de uma string — usado para gerar valores
// financeiros fictícios que são estáveis entre reloads (mesma empresa +
// conta + período sempre gera o mesmo número), sem precisar guardar uma
// planilha inteira de dados mockados.
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRandom(key) {
  return mulberry32(hashString(key))();
}

export function seededRange(key, min, max) {
  return min + seededRandom(key) * (max - min);
}
