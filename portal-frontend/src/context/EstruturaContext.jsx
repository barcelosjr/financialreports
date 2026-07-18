import { createContext, useContext, useRef, useState } from 'react';
import { RELATORIOS } from '../data/constants';
import { gerarEstruturaPadrao } from '../data/estruturaPadrao';
import { CONTAS_FICTICIAS } from '../data/contasFicticias';
import { seededRandom } from '../lib/random';
import { gruposEconomicos as gruposIniciais, empresaPorId } from '../data/empresas';
import { proximoIdNo, moverNoLista, removerNoComDescendentes, clonarArvore } from '../lib/tenant';
import { usePersistedState } from '../lib/usePersistedState';
import { apiGet, apiPost, apiPut, apiDelete } from '../data/api';
import { FLAGS } from '../data/flags';

// Estrutura de plano de contas (árvore editável por relatório), tags de
// conta e importação de contas — tudo isolado do Tenant/Sessão, já que
// essas telas (Plano de Contas) mudam com frequência e não devem
// re-renderizar o resto do app.
//
// Atrás do flag VITE_USE_BACKEND_ESTRUTURA (ver data/flags.js): desligado,
// tudo fica em useState local (mock, como sempre foi); ligado, os mesmos
// métodos passam a ler de um cache local alimentado pelo backend (PHP) e a
// escrever via api.js, com refetch após cada mutação. As leituras
// (obterNosEstrutura/obterTagsConta/obterImportacaoContas) continuam
// síncronas nos dois modos — não viram async.
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
  // ---- Modo mock (flag desligado) ----
  const [estruturas, setEstruturas] = useState(estruturasIniciais);
  const [tagsContas, setTagsContas] = useState({});
  const [contasPorEmpresa, setContasPorEmpresa] = useState({});

  // ---- Modo backend (flag ligado) ----
  // estruturasApi: empresaId -> relatorio -> nos[]
  const [estruturasApi, setEstruturasApi] = useState({});
  // regrasPorContaApi: empresaId -> conta -> regra[] (regra crua do backend:
  // { id, conta, natureza, centroCusto, tags:[{relatorio,nodeId}] })
  const [regrasPorContaApi, setRegrasPorContaApi] = useState({});
  // contasApi: empresaId -> { contas:[{conta,descricaoConta}], importadoEm }
  const [contasApi, setContasApi] = useState({});
  // Contas adicionadas manualmente continuam só no cliente nesta fase (sem
  // endpoint no backend ainda) — persistidas por empresa.
  const [contasManuaisPorEmpresa, setContasManuaisPorEmpresa] = usePersistedState('fr-contas-manuais', {});

  // Chaves já buscadas (ou em busca) — evita refetch a cada render/leitura.
  const pedidosEstrutura = useRef(new Set()); // "empresaId|relatorio"
  const pedidosContas = useRef(new Set()); // empresaId

  function codigoDaEmpresa(empresaId) {
    // EstruturaProvider fica ACIMA de TenantProvider (não dá pra usar
    // useTenant() aqui) — o cache é chaveado pelo id sintético
    // (ex: "kobe-comercio"), mas a API usa o código (ex: "001"). Lê do
    // dado estático por enquanto; na Fase 2 troca pela lista viva de grupos.
    return empresaPorId(empresaId)?.codigo ?? null;
  }

  // -------------------- Estrutura (árvore por relatório) --------------------

  function recarregarEstrutura(empresaId, relatorio) {
    const codigo = codigoDaEmpresa(empresaId);
    if (!codigo) return Promise.resolve();
    pedidosEstrutura.current.add(`${empresaId}|${relatorio}`);
    return apiGet('/contabil/estrutura', { params: { empresa: codigo, relatorio } }).then((nos) => {
      setEstruturasApi((prev) => ({
        ...prev,
        [empresaId]: { ...(prev[empresaId] ?? {}), [relatorio]: nos },
      }));
    });
  }

  function garantirEstruturaCarregada(empresaId, relatorio) {
    if (!empresaId) return;
    // PlanoContas.jsx lê obterNosEstrutura(empresaId, relatorio) incondicionalmente
    // mesmo na aba "Plano de Contas" (relatorio="contas", pseudo-chave que não é
    // um relatório de verdade) — no mock isso só devolvia [] sem efeito; aqui,
    // sem essa guarda, dispararia uma requisição real que o backend rejeita (400).
    if (!RELATORIOS.some((r) => r.chave === relatorio)) return;
    const chave = `${empresaId}|${relatorio}`;
    if (pedidosEstrutura.current.has(chave)) return;
    pedidosEstrutura.current.add(chave);
    recarregarEstrutura(empresaId, relatorio).catch((err) => {
      pedidosEstrutura.current.delete(chave);
      console.error('Falha ao carregar estrutura:', err);
    });
  }

  function obterNosEstrutura(empresaId, relatorio) {
    if (FLAGS.ESTRUTURA) {
      garantirEstruturaCarregada(empresaId, relatorio);
      return estruturasApi[empresaId]?.[relatorio] ?? [];
    }
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
    if (FLAGS.ESTRUTURA) {
      const codigo = codigoDaEmpresa(empresaId);
      if (!codigo) return;
      apiPost('/contabil/estrutura', { params: { empresa: codigo }, body: { relatorio, nome, parentId, sinal } })
        .then(() => recarregarEstrutura(empresaId, relatorio))
        .catch((err) => console.error('Falha ao adicionar nó da estrutura:', err));
      return;
    }
    atualizarNosRelatorio(empresaId, relatorio, (nos) => {
      const ordem = nos.filter((n) => n.parentId === parentId).length;
      return [...nos, { id: proximoIdNo(), nome, parentId, ordem, sinal }];
    });
  }

  function renomearNoEstrutura(empresaId, relatorio, nodeId, novoNome) {
    if (FLAGS.ESTRUTURA) {
      const codigo = codigoDaEmpresa(empresaId);
      if (!codigo) return;
      apiPut(`/contabil/estrutura/${nodeId}`, { params: { empresa: codigo, relatorio }, body: { nome: novoNome } })
        .then(() => recarregarEstrutura(empresaId, relatorio))
        .catch((err) => console.error('Falha ao renomear nó da estrutura:', err));
      return;
    }
    atualizarNosRelatorio(empresaId, relatorio, (nos) => nos.map((n) => (n.id === nodeId ? { ...n, nome: novoNome } : n)));
  }

  const PROXIMO_SINAL = { '+': '-', '-': '=', '=': '+' };

  function alterarSinalNoEstrutura(empresaId, relatorio, nodeId, sinal) {
    if (FLAGS.ESTRUTURA) {
      const codigo = codigoDaEmpresa(empresaId);
      if (!codigo) return;
      const atual = estruturasApi[empresaId]?.[relatorio]?.find((n) => n.id === nodeId);
      const novoSinal = sinal ?? PROXIMO_SINAL[atual?.sinal] ?? '+';
      apiPut(`/contabil/estrutura/${nodeId}`, { params: { empresa: codigo, relatorio }, body: { sinal: novoSinal } })
        .then(() => recarregarEstrutura(empresaId, relatorio))
        .catch((err) => console.error('Falha ao alterar sinal do nó:', err));
      return;
    }
    atualizarNosRelatorio(empresaId, relatorio, (nos) =>
      nos.map((n) => (n.id === nodeId ? { ...n, sinal: sinal ?? PROXIMO_SINAL[n.sinal] ?? '+' } : n))
    );
  }

  function moverNoEstrutura(empresaId, relatorio, nodeId, direcao) {
    if (FLAGS.ESTRUTURA) {
      const codigo = codigoDaEmpresa(empresaId);
      if (!codigo) return;
      apiPost(`/contabil/estrutura/${nodeId}/mover`, { params: { empresa: codigo, relatorio }, body: { direcao } })
        .then(() => recarregarEstrutura(empresaId, relatorio))
        .catch((err) => console.error('Falha ao mover nó da estrutura:', err));
      return;
    }
    atualizarNosRelatorio(empresaId, relatorio, (nos) => moverNoLista(nos, nodeId, direcao));
  }

  function removerNoEstrutura(empresaId, relatorio, nodeId) {
    if (FLAGS.ESTRUTURA) {
      const codigo = codigoDaEmpresa(empresaId);
      if (!codigo) return;
      apiDelete(`/contabil/estrutura/${nodeId}`, { params: { empresa: codigo, relatorio } })
        .then(() => Promise.all([recarregarEstrutura(empresaId, relatorio), recarregarContas(empresaId)]))
        .catch((err) => console.error('Falha ao remover nó da estrutura:', err));
      return;
    }
    atualizarNosRelatorio(empresaId, relatorio, (nos) => removerNoComDescendentes(nos, nodeId));
  }

  function copiarEstrutura(empresaOrigemId, empresaDestinoId) {
    if (FLAGS.ESTRUTURA) {
      const codigoOrigem = codigoDaEmpresa(empresaOrigemId);
      const codigoDestino = codigoDaEmpresa(empresaDestinoId);
      if (!codigoOrigem || !codigoDestino) return;
      apiPost('/contabil/contas/copiar', { body: { empresaOrigem: codigoOrigem, empresaDestino: codigoDestino } })
        .then(() =>
          Promise.all([
            ...RELATORIOS.map((r) => recarregarEstrutura(empresaDestinoId, r.chave)),
            recarregarContas(empresaDestinoId),
          ])
        )
        .catch((err) => console.error('Falha ao copiar estrutura:', err));
      return;
    }
    setEstruturas((prev) => {
      const origem = prev[empresaOrigemId] ?? estruturaVaziaPorRelatorio();
      const copia = Object.fromEntries(RELATORIOS.map((r) => [r.chave, clonarArvore(origem[r.chave] ?? [])]));
      return { ...prev, [empresaDestinoId]: copia };
    });
  }

  // Chamado pelo TenantContext ao cadastrar uma empresa nova.
  function inicializarEstruturaEmpresa(empresaId) {
    if (FLAGS.ESTRUTURA) return; // backend começa vazio — nada para semear no cliente.
    setEstruturas((prev) => ({ ...prev, [empresaId]: gerarEstruturaCompletaPadrao() }));
  }

  // Chamado pelo TenantContext ao remover uma empresa.
  function removerEstruturaEmpresa(empresaId) {
    if (FLAGS.ESTRUTURA) {
      setEstruturasApi((prev) => { const { [empresaId]: _r, ...resto } = prev; return resto; });
      setRegrasPorContaApi((prev) => { const { [empresaId]: _r, ...resto } = prev; return resto; });
      setContasApi((prev) => { const { [empresaId]: _r, ...resto } = prev; return resto; });
      return;
    }
    setEstruturas((prev) => {
      const { [empresaId]: _removida, ...resto } = prev;
      return resto;
    });
  }

  // -------------------- Tags de conta contábil --------------------
  // Cada conta pode apontar para um ou mais nós da estrutura (ex: "3.1.01.001"
  // marcada como DRE > Receita Bruta > Receita de Vendas). `centroCusto` e
  // `natureza` são opcionais: sem eles, a tag vale pra conta inteira; com
  // eles, só se aplica aos lançamentos daquele centro de custo e/ou natureza
  // (D/C). No backend isso é modelado como "regras" (conta + natureza +
  // centroCusto -> uma ou mais tags); aqui a leitura derruba as regras cruas
  // numa lista plana de tags (mesmo shape que o mock sempre devolveu).

  function obterTagsConta(empresaId, conta) {
    if (FLAGS.ESTRUTURA) {
      const regras = regrasPorContaApi[empresaId]?.[conta] ?? [];
      return regras.flatMap((r) =>
        r.tags.map((t) => ({
          relatorio: t.relatorio,
          nodeId: t.nodeId,
          centroCusto: r.centroCusto,
          natureza: r.natureza,
          _regraId: r.id,
        }))
      );
    }
    return tagsContas[empresaId]?.[conta] ?? [];
  }

  function adicionarTagConta(empresaId, conta, tag) {
    const centroCusto = tag.centroCusto?.trim() || null;
    const naturezaNormalizada = tag.natureza?.trim().toUpperCase();
    const natureza = naturezaNormalizada === 'D' || naturezaNormalizada === 'C' ? naturezaNormalizada : null;

    if (FLAGS.ESTRUTURA) {
      const codigo = codigoDaEmpresa(empresaId);
      if (!codigo) return;
      const regras = regrasPorContaApi[empresaId]?.[conta] ?? [];
      const regraExistente = regras.find((r) => r.natureza === natureza && r.centroCusto === centroCusto);
      const novaTag = { relatorio: tag.relatorio, nodeId: tag.nodeId };

      const requisicao = regraExistente
        ? apiPut(`/contabil/contas/${encodeURIComponent(conta)}/regras/${regraExistente.id}`, {
            params: { empresa: codigo },
            body: { natureza, centroCusto, tags: [...regraExistente.tags, novaTag] },
          })
        : apiPost(`/contabil/contas/${encodeURIComponent(conta)}/regras`, {
            params: { empresa: codigo },
            body: { natureza, centroCusto, tags: [novaTag] },
          });

      requisicao.then(() => recarregarContas(empresaId)).catch((err) => console.error('Falha ao adicionar tag da conta:', err));
      return;
    }

    setTagsContas((prev) => {
      const doEmpresa = prev[empresaId] ?? {};
      const atuais = doEmpresa[conta] ?? [];
      const igual = (t) =>
        t.relatorio === tag.relatorio &&
        t.nodeId === tag.nodeId &&
        (t.centroCusto ?? null) === centroCusto &&
        (t.natureza ?? null) === natureza;
      if (atuais.some(igual)) return prev;
      return { ...prev, [empresaId]: { ...doEmpresa, [conta]: [...atuais, { ...tag, centroCusto, natureza }] } };
    });
  }

  function removerTagConta(empresaId, conta, indice) {
    if (FLAGS.ESTRUTURA) {
      const codigo = codigoDaEmpresa(empresaId);
      if (!codigo) return;
      const alvo = obterTagsConta(empresaId, conta)[indice];
      if (!alvo) return;
      const regra = (regrasPorContaApi[empresaId]?.[conta] ?? []).find((r) => r.id === alvo._regraId);
      if (!regra) return;

      const requisicao =
        regra.tags.length === 1
          ? apiDelete(`/contabil/contas/${encodeURIComponent(conta)}/regras/${regra.id}`, { params: { empresa: codigo } })
          : apiPut(`/contabil/contas/${encodeURIComponent(conta)}/regras/${regra.id}`, {
              params: { empresa: codigo },
              body: {
                natureza: regra.natureza,
                centroCusto: regra.centroCusto,
                tags: regra.tags.filter((t) => !(t.relatorio === alvo.relatorio && t.nodeId === alvo.nodeId)),
              },
            });

      requisicao.then(() => recarregarContas(empresaId)).catch((err) => console.error('Falha ao remover tag da conta:', err));
      return;
    }

    setTagsContas((prev) => {
      const doEmpresa = prev[empresaId] ?? {};
      const atuais = doEmpresa[conta] ?? [];
      return { ...prev, [empresaId]: { ...doEmpresa, [conta]: atuais.filter((_, i) => i !== indice) } };
    });
  }

  // -------------------- Importação de contas --------------------
  // Plano de contas por empresa: só existe depois de "importado". Com o
  // flag ligado, "importar" é buscar as contas únicas no backend (GET
  // /contabil/contas, que em MOCK_MODE devolve as fixtures do PHP); sem o
  // flag, continua 100% simulado no cliente (ver README).

  function recarregarContas(empresaId) {
    const codigo = codigoDaEmpresa(empresaId);
    if (!codigo) return Promise.resolve();
    pedidosContas.current.add(empresaId);
    return apiGet('/contabil/contas', { params: { empresa: codigo } }).then((contas) => {
      const regrasPorConta = {};
      contas.forEach((c) => { regrasPorConta[c.conta] = c.regras; });
      setRegrasPorContaApi((prev) => ({ ...prev, [empresaId]: regrasPorConta }));
      setContasApi((prev) => ({
        ...prev,
        [empresaId]: {
          contas: contas.map((c) => ({ conta: c.conta, descricao: c.descricaoConta })),
          importadoEm: new Date().toISOString(),
        },
      }));
    });
  }

  function garantirContasCarregadas(empresaId) {
    if (!empresaId) return;
    if (pedidosContas.current.has(empresaId)) return;
    pedidosContas.current.add(empresaId);
    recarregarContas(empresaId).catch((err) => {
      pedidosContas.current.delete(empresaId);
      console.error('Falha ao carregar contas:', err);
    });
  }

  function obterImportacaoContas(empresaId) {
    if (FLAGS.ESTRUTURA) {
      garantirContasCarregadas(empresaId);
      const api = contasApi[empresaId] ?? { contas: [], importadoEm: null };
      const manuais = contasManuaisPorEmpresa[empresaId] ?? [];
      const codigosManuais = new Set(manuais.map((c) => c.conta));
      const importadas = api.contas.filter((c) => !codigosManuais.has(c.conta)).map((c) => ({ ...c, origem: 'importado' }));
      return { contas: [...manuais, ...importadas], importadoEm: api.importadoEm };
    }
    return contasPorEmpresa[empresaId] ?? { contas: [], importadoEm: null };
  }

  function importarContasEmpresa(empresaId) {
    if (FLAGS.ESTRUTURA) {
      recarregarContas(empresaId).catch((err) => console.error('Falha ao importar contas:', err));
      return;
    }
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
    if (FLAGS.ESTRUTURA) {
      const contasAtuais = obterImportacaoContas(empresaId).contas;
      if (contasAtuais.some((c) => c.conta === conta)) return { duplicada: true };
      setContasManuaisPorEmpresa((prev) => ({
        ...prev,
        [empresaId]: [...(prev[empresaId] ?? []), { conta, descricao, origem: 'manual' }],
      }));
      return { duplicada: false };
    }

    const contasAtuais = contasPorEmpresa[empresaId]?.contas ?? [];
    if (contasAtuais.some((c) => c.conta === conta)) return { duplicada: true };
    setContasPorEmpresa((prev) => {
      const atual = prev[empresaId] ?? { contas: [], importadoEm: null };
      return { ...prev, [empresaId]: { ...atual, contas: [...atual.contas, { conta, descricao, origem: 'manual' }] } };
    });
    return { duplicada: false };
  }

  function removerContaManual(empresaId, conta) {
    if (FLAGS.ESTRUTURA) {
      setContasManuaisPorEmpresa((prev) => ({
        ...prev,
        [empresaId]: (prev[empresaId] ?? []).filter((c) => c.conta !== conta),
      }));
      return;
    }
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
