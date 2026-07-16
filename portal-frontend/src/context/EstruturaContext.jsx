import { createContext, useContext, useState } from 'react';
import { RELATORIOS } from '../data/constants';
import { gerarEstruturaPadrao } from '../data/estruturaPadrao';
import { CONTAS_FICTICIAS } from '../data/contasFicticias';
import { seededRandom } from '../lib/random';
import { gruposEconomicos as gruposIniciais } from '../data/empresas';
import { proximoIdNo, moverNoLista, removerNoComDescendentes, clonarArvore } from '../lib/tenant';

// Estrutura de plano de contas (árvore editável por relatório), tags de
// conta e importação de contas fictícias — tudo isolado do Tenant/Sessão,
// já que essas telas (Plano de Contas) mudam com frequência e não devem
// re-renderizar o resto do app.
const EstruturaContext = createContext(null);

function estruturaVaziaPorRelatorio() {
  return Object.fromEntries(RELATORIOS.map((r) => [r.chave, []]));
}

function gerarEstruturaCompletaPadrao() {
  return Object.fromEntries(RELATORIOS.map((r) => [r.chave, gerarEstruturaPadrao(r.chave)]));
}

function estruturasIniciais() {
  const mapa = {};
  gruposIniciais.forEach((g) => {
    g.empresas.forEach((e) => {
      mapa[e.id] = gerarEstruturaCompletaPadrao();
    });
  });
  return mapa;
}

export function EstruturaProvider({ children }) {
  const [estruturas, setEstruturas] = useState(estruturasIniciais);
  const [tagsContas, setTagsContas] = useState({});
  const [contasPorEmpresa, setContasPorEmpresa] = useState({});

  function obterNosEstrutura(empresaId, relatorio) {
    return estruturas[empresaId]?.[relatorio] ?? [];
  }

  function atualizarNosRelatorio(empresaId, relatorio, atualizarFn) {
    setEstruturas((prev) => ({
      ...prev,
      [empresaId]: {
        ...(prev[empresaId] ?? estruturaVaziaPorRelatorio()),
        [relatorio]: atualizarFn(prev[empresaId]?.[relatorio] ?? []),
      },
    }));
  }

  function adicionarNoEstrutura(empresaId, relatorio, nome, parentId = null, sinal = '+') {
    atualizarNosRelatorio(empresaId, relatorio, (nos) => {
      const ordem = nos.filter((n) => n.parentId === parentId).length;
      return [...nos, { id: proximoIdNo(), nome, parentId, ordem, sinal }];
    });
  }

  function renomearNoEstrutura(empresaId, relatorio, nodeId, novoNome) {
    atualizarNosRelatorio(empresaId, relatorio, (nos) => nos.map((n) => (n.id === nodeId ? { ...n, nome: novoNome } : n)));
  }

  const PROXIMO_SINAL = { '+': '-', '-': '=', '=': '+' };

  function alterarSinalNoEstrutura(empresaId, relatorio, nodeId, sinal) {
    atualizarNosRelatorio(empresaId, relatorio, (nos) =>
      nos.map((n) => (n.id === nodeId ? { ...n, sinal: sinal ?? PROXIMO_SINAL[n.sinal] ?? '+' } : n))
    );
  }

  function moverNoEstrutura(empresaId, relatorio, nodeId, direcao) {
    atualizarNosRelatorio(empresaId, relatorio, (nos) => moverNoLista(nos, nodeId, direcao));
  }

  function removerNoEstrutura(empresaId, relatorio, nodeId) {
    atualizarNosRelatorio(empresaId, relatorio, (nos) => removerNoComDescendentes(nos, nodeId));
  }

  function copiarEstrutura(empresaOrigemId, empresaDestinoId) {
    setEstruturas((prev) => {
      const origem = prev[empresaOrigemId] ?? estruturaVaziaPorRelatorio();
      const copia = Object.fromEntries(RELATORIOS.map((r) => [r.chave, clonarArvore(origem[r.chave] ?? [])]));
      return { ...prev, [empresaDestinoId]: copia };
    });
  }

  // Chamado pelo TenantContext ao cadastrar uma empresa nova.
  function inicializarEstruturaEmpresa(empresaId) {
    setEstruturas((prev) => ({ ...prev, [empresaId]: gerarEstruturaCompletaPadrao() }));
  }

  // Chamado pelo TenantContext ao remover uma empresa.
  function removerEstruturaEmpresa(empresaId) {
    setEstruturas((prev) => {
      const { [empresaId]: _removida, ...resto } = prev;
      return resto;
    });
  }

  // Tags de conta contábil: cada conta pode apontar para um ou mais nós da
  // estrutura (ex: "3.1.01.001" marcada como DRE > Receita Bruta > Receita
  // de Vendas), igual ao relatorios.html do portal-backend real.
  function obterTagsConta(empresaId, conta) {
    return tagsContas[empresaId]?.[conta] ?? [];
  }

  function adicionarTagConta(empresaId, conta, tag) {
    setTagsContas((prev) => {
      const doEmpresa = prev[empresaId] ?? {};
      const atuais = doEmpresa[conta] ?? [];
      if (atuais.some((t) => t.relatorio === tag.relatorio && t.nodeId === tag.nodeId)) return prev;
      return { ...prev, [empresaId]: { ...doEmpresa, [conta]: [...atuais, tag] } };
    });
  }

  function removerTagConta(empresaId, conta, indice) {
    setTagsContas((prev) => {
      const doEmpresa = prev[empresaId] ?? {};
      const atuais = doEmpresa[conta] ?? [];
      return { ...prev, [empresaId]: { ...doEmpresa, [conta]: atuais.filter((_, i) => i !== indice) } };
    });
  }

  // Plano de contas por empresa: só existe depois de "importado". A
  // importação (100% simulada no frontend — ver README) sorteia, de forma
  // determinística por empresa, quais contas do catálogo fictício "existiam"
  // nos lançamentos do último ano, como se tivesse vindo do Power BI.
  function obterImportacaoContas(empresaId) {
    return contasPorEmpresa[empresaId] ?? { contas: [], importadoEm: null };
  }

  function importarContasEmpresa(empresaId) {
    const importadas = CONTAS_FICTICIAS
      .filter((c) => seededRandom(`${empresaId}|import|${c.conta}`) < 0.8)
      .map((c) => ({ ...c, origem: 'importado' }));
    setContasPorEmpresa((prev) => {
      // contas adicionadas manualmente não são apagadas por uma (re)importação.
      const manuais = (prev[empresaId]?.contas ?? []).filter((c) => c.origem === 'manual');
      const codigosManuais = new Set(manuais.map((c) => c.conta));
      const contas = [...manuais, ...importadas.filter((c) => !codigosManuais.has(c.conta))];
      return { ...prev, [empresaId]: { contas, importadoEm: new Date().toISOString() } };
    });
  }

  function adicionarContaManual(empresaId, { conta, descricao }) {
    const contasAtuais = contasPorEmpresa[empresaId]?.contas ?? [];
    if (contasAtuais.some((c) => c.conta === conta)) return { duplicada: true };
    setContasPorEmpresa((prev) => {
      const atual = prev[empresaId] ?? { contas: [], importadoEm: null };
      return { ...prev, [empresaId]: { ...atual, contas: [...atual.contas, { conta, descricao, origem: 'manual' }] } };
    });
    return { duplicada: false };
  }

  function removerContaManual(empresaId, conta) {
    setContasPorEmpresa((prev) => {
      const atual = prev[empresaId] ?? { contas: [], importadoEm: null };
      return { ...prev, [empresaId]: { ...atual, contas: atual.contas.filter((c) => c.conta !== conta) } };
    });
  }

  const value = {
    obterNosEstrutura,
    adicionarNoEstrutura,
    renomearNoEstrutura,
    alterarSinalNoEstrutura,
    moverNoEstrutura,
    removerNoEstrutura,
    copiarEstrutura,
    inicializarEstruturaEmpresa,
    removerEstruturaEmpresa,
    obterTagsConta,
    adicionarTagConta,
    removerTagConta,
    obterImportacaoContas,
    importarContasEmpresa,
    adicionarContaManual,
    removerContaManual,
  };

  return <EstruturaContext.Provider value={value}>{children}</EstruturaContext.Provider>;
}

export function useEstrutura() {
  const ctx = useContext(EstruturaContext);
  if (!ctx) throw new Error('useEstrutura precisa estar dentro de <EstruturaProvider>');
  return ctx;
}
