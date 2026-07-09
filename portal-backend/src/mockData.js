/**
 * Dados ficticios usados apenas quando MOCK_MODE=true, espelhando a
 * estrutura real da tabela LANCAMENTOS (ver README) para permitir
 * desenvolvimento/teste local sem credenciais Azure/Power BI.
 */

const LANCAMENTOS = [
  { EMPRESA: '001', CONTA: '3.1.01.001', DESCRICAO_CONTA: 'Receita de Vendas', CENTRO_CUSTO: 10, DESCRICAO_CC: 'Comercial', NATUREZA: 'C', VALOR: 45000.0, PERIODO: '07/2026' },
  { EMPRESA: '001', CONTA: '3.1.01.001', DESCRICAO_CONTA: 'Receita de Vendas', CENTRO_CUSTO: 10, DESCRICAO_CC: 'Comercial', NATUREZA: 'D', VALOR: 1250.0, PERIODO: '07/2026' },
  { EMPRESA: '001', CONTA: '4.1.02.010', DESCRICAO_CONTA: 'Despesas Administrativas', CENTRO_CUSTO: 20, DESCRICAO_CC: 'Administrativo', NATUREZA: 'D', VALOR: 8300.0, PERIODO: '07/2026' },
  { EMPRESA: '002', CONTA: '3.1.01.001', DESCRICAO_CONTA: 'Receita de Vendas', CENTRO_CUSTO: 10, DESCRICAO_CC: 'Comercial', NATUREZA: 'C', VALOR: 12000.0, PERIODO: '08/2026' },
];

function periodoParaChave(periodo) {
  const [mes, ano] = periodo.split('/');
  return `${ano}-${mes}`;
}

function mockContasUnicas({ empresa }) {
  const vistos = new Map();
  for (const linha of LANCAMENTOS) {
    if (linha.EMPRESA !== empresa) continue;
    if (!vistos.has(linha.CONTA)) {
      vistos.set(linha.CONTA, linha.DESCRICAO_CONTA);
    }
  }
  return Array.from(vistos.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([conta, descricaoConta]) => ({ conta, descricaoConta }));
}

function mockBalancete({ empresas, periodoInicio, periodoFim, conta, centroCusto }) {
  const linhas = LANCAMENTOS.filter((linha) => {
    const chavePeriodo = periodoParaChave(linha.PERIODO);
    return (
      empresas.includes(linha.EMPRESA) &&
      chavePeriodo >= periodoInicio &&
      chavePeriodo <= periodoFim &&
      (conta === undefined || linha.CONTA === conta) &&
      (centroCusto === undefined || linha.CENTRO_CUSTO === centroCusto)
    );
  });

  const agregado = new Map();
  for (const linha of linhas) {
    const chave = `${linha.EMPRESA}|${linha.CONTA}`;
    const atual = agregado.get(chave) || {
      empresa: linha.EMPRESA,
      conta: linha.CONTA,
      descricaoConta: linha.DESCRICAO_CONTA,
      debito: 0,
      credito: 0,
    };
    if (linha.NATUREZA === 'D') atual.debito += linha.VALOR;
    if (linha.NATUREZA === 'C') atual.credito += linha.VALOR;
    agregado.set(chave, atual);
  }

  return Array.from(agregado.values()).map((linha) => ({
    ...linha,
    saldo: linha.debito - linha.credito,
  }));
}

module.exports = { mockBalancete, mockContasUnicas };
