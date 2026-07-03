/**
 * Dados ficticios usados apenas quando MOCK_MODE=true (sem modelo semantico
 * real publicado ainda). Espelham as tabelas descritas no briefing do
 * projeto, para que os endpoints funcionem localmente sem credenciais Azure.
 */

const PRODUTOS = [
  { ProdutoID: 1, Nome: 'Parafuso M6', Categoria: 'Ferragem' },
  { ProdutoID: 2, Nome: 'Chapa Aço 2mm', Categoria: 'Metalurgia' },
  { ProdutoID: 3, Nome: 'Tinta Epóxi 5L', Categoria: 'Pintura' },
];

const ESTOQUE = [
  { ProdutoID: 1, Deposito: 'CD-SP', QuantidadeDisponivel: 15000, DataAtualizacao: '2026-07-01' },
  { ProdutoID: 2, Deposito: 'CD-SP', QuantidadeDisponivel: 320, DataAtualizacao: '2026-07-01' },
  { ProdutoID: 3, Deposito: 'CD-RJ', QuantidadeDisponivel: 48, DataAtualizacao: '2026-07-01' },
];

const VENDAS = [
  { VendaID: 5001, ProdutoID: 1, Quantidade: 500, ValorTotal: 225.0, DataVenda: '2026-06-30', Filial: 'SP-01' },
  { VendaID: 5002, ProdutoID: 3, Quantidade: 2, ValorTotal: 420.0, DataVenda: '2026-07-01', Filial: 'RJ-02' },
];

function findProduto(produtoId) {
  return PRODUTOS.find((p) => p.ProdutoID === Number(produtoId));
}

function mockEstoqueGeral() {
  return ESTOQUE.map((linha) => {
    const produto = findProduto(linha.ProdutoID);
    return {
      produto: produto.Nome,
      categoria: produto.Categoria,
      deposito: linha.Deposito,
      quantidade: linha.QuantidadeDisponivel,
    };
  });
}

function mockEstoquePorProduto(produtoId) {
  return mockEstoqueGeral().filter((linha) => {
    const produto = findProduto(produtoId);
    return produto && linha.produto === produto.Nome;
  });
}

function mockVendas(dataInicio, dataFim) {
  const vendasNoPeriodo = VENDAS.filter(
    (v) => v.DataVenda >= dataInicio && v.DataVenda <= dataFim
  );

  const agregadoPorProduto = new Map();
  for (const venda of vendasNoPeriodo) {
    const produto = findProduto(venda.ProdutoID);
    const chave = produto.ProdutoID;
    const atual = agregadoPorProduto.get(chave) || {
      produto: produto.Nome,
      categoria: produto.Categoria,
      valorTotal: 0,
      quantidade: 0,
    };
    atual.valorTotal += venda.ValorTotal;
    atual.quantidade += venda.Quantidade;
    agregadoPorProduto.set(chave, atual);
  }

  return Array.from(agregadoPorProduto.values());
}

module.exports = { mockEstoqueGeral, mockEstoquePorProduto, mockVendas, findProduto };
