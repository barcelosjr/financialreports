// Resolve, para cada nó de uma árvore de estrutura, o "caminho" completo
// subindo pela cadeia de parentId (ex: "Receita Bruta > Receita de Vendas"),
// igual ao que o estrutura.html do portal-backend real faz para montar os
// chips de conta classificada.
export function caminhosPorNo(nos) {
  const porId = new Map(nos.map((n) => [n.id, n]));
  const cache = new Map();
  function resolver(id) {
    if (cache.has(id)) return cache.get(id);
    const no = porId.get(id);
    if (!no) return '(grupo removido)';
    const texto = no.parentId ? `${resolver(no.parentId)} > ${no.nome}` : no.nome;
    cache.set(id, texto);
    return texto;
  }
  for (const no of nos) resolver(no.id);
  return cache;
}

// Lista {id, caminho} ordenada alfabeticamente pelo caminho — usada para
// popular selects de "para qual grupo esta conta aponta".
export function opcoesOrdenadas(nos) {
  const caminhos = caminhosPorNo(nos);
  return nos
    .map((n) => ({ id: n.id, caminho: caminhos.get(n.id) }))
    .sort((a, b) => a.caminho.localeCompare(b.caminho));
}
