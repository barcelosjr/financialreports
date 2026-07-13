// Estrutura padrão (nomes + sinal) usada para popular o plano de contas de
// uma empresa na primeira vez que ela é aberta na tela "Plano de Contas".
// Espelha os mesmos rótulos e o mesmo sinal (+ soma / - diminui / = subtotal)
// já usados em src/data/financeiro.js — só que aqui é puramente estrutural
// (sem valores). Cada empresa pode editar essa árvore livremente depois,
// sem afetar as outras.
//
// sinal:
//   '+' — soma no total do grupo/relatório
//   '-' — diminui do total do grupo/relatório
//   '=' — é uma linha de subtotal/total (marca um ponto de fechamento,
//         normalmente sem filhos)
export const ESTRUTURA_PADRAO = {
  dre: [
    { nome: 'Receita Bruta', sinal: '+', filhos: [
      { nome: 'Receita de Vendas', sinal: '+' },
      { nome: 'Receita de Serviços', sinal: '+' },
    ] },
    { nome: '(-) Deduções da Receita', sinal: '-', filhos: [
      { nome: 'Impostos sobre Vendas', sinal: '-' },
      { nome: 'Devoluções e Abatimentos', sinal: '-' },
    ] },
    { nome: 'Receita Líquida', sinal: '=' },
    { nome: '(-) Custo dos Produtos/Serviços Vendidos', sinal: '-', filhos: [
      { nome: 'Matéria-prima e Insumos', sinal: '-' },
      { nome: 'Mão de Obra Direta', sinal: '-' },
    ] },
    { nome: 'Lucro Bruto', sinal: '=' },
    { nome: '(-) Despesas Operacionais', sinal: '-', filhos: [
      { nome: 'Despesas Administrativas', sinal: '-' },
      { nome: 'Despesas Comerciais', sinal: '-' },
      { nome: 'Despesas com Pessoal', sinal: '-' },
    ] },
    { nome: 'Resultado Operacional (EBIT)', sinal: '=' },
    { nome: 'Resultado Financeiro', sinal: '+', filhos: [
      { nome: 'Receitas Financeiras', sinal: '+' },
      { nome: 'Despesas Financeiras', sinal: '-' },
    ] },
    { nome: 'Resultado Antes dos Impostos', sinal: '=' },
    { nome: '(-) Impostos sobre o Lucro (IRPJ/CSLL)', sinal: '-', filhos: [
      { nome: 'IRPJ e CSLL', sinal: '-' },
    ] },
    { nome: 'Lucro Líquido do Exercício', sinal: '=' },
  ],
  balanco: [
    { nome: 'Ativo Circulante', sinal: '+', filhos: [
      { nome: 'Caixa e Equivalentes de Caixa', sinal: '+' },
      { nome: 'Contas a Receber de Clientes', sinal: '+' },
      { nome: 'Estoques', sinal: '+' },
      { nome: 'Outros Ativos Circulantes', sinal: '+' },
    ] },
    { nome: 'Ativo Não Circulante', sinal: '+', filhos: [
      { nome: 'Realizável a Longo Prazo', sinal: '+' },
      { nome: 'Imobilizado', sinal: '+' },
      { nome: 'Intangível', sinal: '+' },
    ] },
    { nome: 'Ativo Total', sinal: '=' },
    { nome: 'Passivo Circulante', sinal: '+', filhos: [
      { nome: 'Fornecedores', sinal: '+' },
      { nome: 'Empréstimos e Financiamentos (CP)', sinal: '+' },
      { nome: 'Obrigações Trabalhistas e Tributárias', sinal: '+' },
    ] },
    { nome: 'Passivo Não Circulante', sinal: '+', filhos: [
      { nome: 'Empréstimos e Financiamentos (LP)', sinal: '+' },
    ] },
    { nome: 'Patrimônio Líquido', sinal: '+', filhos: [
      { nome: 'Capital Social', sinal: '+' },
      { nome: 'Reservas de Lucros', sinal: '+' },
      { nome: 'Lucros/Prejuízos Acumulados', sinal: '+' },
    ] },
    { nome: 'Passivo + Patrimônio Líquido', sinal: '=' },
  ],
  fluxoCaixa: [
    { nome: 'Saldo Inicial de Caixa', sinal: '=' },
    { nome: 'Atividades Operacionais', sinal: '+', filhos: [
      { nome: 'Lucro Líquido do Exercício', sinal: '+' },
      { nome: 'Depreciação e Amortização', sinal: '+' },
      { nome: 'Variação no Capital de Giro', sinal: '+' },
    ] },
    { nome: 'Caixa Gerado nas Operações', sinal: '=' },
    { nome: 'Atividades de Investimento', sinal: '+', filhos: [
      { nome: 'Aquisição de Imobilizado', sinal: '-' },
      { nome: 'Venda de Ativos', sinal: '+' },
    ] },
    { nome: 'Caixa das Atividades de Investimento', sinal: '=' },
    { nome: 'Atividades de Financiamento', sinal: '+', filhos: [
      { nome: 'Captação de Empréstimos', sinal: '+' },
      { nome: 'Pagamento de Empréstimos', sinal: '-' },
      { nome: 'Distribuição de Dividendos', sinal: '-' },
    ] },
    { nome: 'Caixa das Atividades de Financiamento', sinal: '=' },
    { nome: 'Variação Líquida de Caixa', sinal: '=' },
    { nome: 'Saldo Final de Caixa', sinal: '=' },
  ],
};

let contador = 0;
function proximoId() {
  contador += 1;
  return `no-${Date.now()}-${contador}`;
}

// Gera uma árvore nova (ids únicos, independentes de qualquer outra empresa)
// a partir do template padrão de um relatório.
export function gerarEstruturaPadrao(relatorio) {
  const nos = [];
  (ESTRUTURA_PADRAO[relatorio] || []).forEach((raiz, i) => {
    const idRaiz = proximoId();
    nos.push({ id: idRaiz, nome: raiz.nome, parentId: null, ordem: i, sinal: raiz.sinal });
    (raiz.filhos || []).forEach((filho, j) => {
      nos.push({ id: proximoId(), nome: filho.nome, parentId: idRaiz, ordem: j, sinal: filho.sinal });
    });
  });
  return nos;
}
