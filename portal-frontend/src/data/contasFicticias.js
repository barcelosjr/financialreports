// Catálogo fictício "de origem" — simula o universo de contas que existiria
// no Power BI (tabela LANCAMENTOS, coluna CONTA/DESCRICAO_CONTA, ver README
// do portal-backend) se a integração real já existisse. A ação "Importar
// plano de contas" na aba Plano de Contas sorteia, de forma determinística
// por empresa, um subconjunto deste catálogo — simulando que cada empresa
// só usou parte dessas contas nos lançamentos do último ano.
export const CONTAS_FICTICIAS = [
  { conta: '1.1.01.001', descricao: 'Caixa e Equivalentes de Caixa' },
  { conta: '1.1.02.001', descricao: 'Contas a Receber de Clientes' },
  { conta: '1.1.03.001', descricao: 'Estoques' },
  { conta: '1.1.04.001', descricao: 'Adiantamentos a Fornecedores' },
  { conta: '1.2.01.001', descricao: 'Imobilizado — Máquinas e Equipamentos' },
  { conta: '1.2.02.001', descricao: 'Intangível — Marcas e Patentes' },
  { conta: '2.1.01.001', descricao: 'Fornecedores Nacionais' },
  { conta: '2.1.02.001', descricao: 'Empréstimos e Financiamentos (CP)' },
  { conta: '2.1.03.001', descricao: 'Obrigações Trabalhistas' },
  { conta: '2.2.01.001', descricao: 'Empréstimos e Financiamentos (LP)' },
  { conta: '2.3.01.001', descricao: 'Capital Social' },
  { conta: '2.3.02.001', descricao: 'Lucros Acumulados' },
  { conta: '3.1.01.001', descricao: 'Receita de Vendas' },
  { conta: '3.1.02.001', descricao: 'Receita de Serviços' },
  { conta: '3.2.01.001', descricao: 'Impostos sobre Vendas' },
  { conta: '3.2.02.001', descricao: 'Devoluções e Abatimentos' },
  { conta: '4.1.01.001', descricao: 'Custo da Mercadoria Vendida' },
  { conta: '4.1.02.001', descricao: 'Mão de Obra Direta' },
  { conta: '4.2.01.001', descricao: 'Despesas Administrativas' },
  { conta: '4.2.02.001', descricao: 'Despesas Comerciais' },
  { conta: '4.2.03.001', descricao: 'Despesas com Pessoal' },
  { conta: '4.3.01.001', descricao: 'Receitas Financeiras' },
  { conta: '4.3.02.001', descricao: 'Despesas Financeiras' },
  { conta: '4.4.01.001', descricao: 'IRPJ e CSLL' },
  { conta: '1.1.05.001', descricao: 'Aplicações Financeiras' },
  { conta: '1.2.03.001', descricao: 'Depreciação Acumulada' },
  { conta: '2.1.04.001', descricao: 'Adiantamentos de Clientes' },
  { conta: '2.3.03.001', descricao: 'Reservas de Lucros' },
  { conta: '3.1.03.001', descricao: 'Descontos Concedidos' },
  { conta: '4.2.04.001', descricao: 'Despesas com Ocupação (Aluguel)' },
];
