import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usuarios, usuarioPodeVerEmpresa } from '../data/usuarios';
import { gruposEconomicos as gruposIniciais } from '../data/empresas';
import { PAPEIS, RELATORIOS } from '../data/constants';
import { gerarEstruturaPadrao } from '../data/estruturaPadrao';
import { CONTAS_FICTICIAS } from '../data/contasFicticias';
import { seededRandom } from '../lib/random';

const AppContext = createContext(null);

function empresasVisiveis(usuario, grupos) {
  if (usuario.papel === PAPEIS.SUPER_ADMIN) return grupos;
  const grupo = grupos.find((g) => g.id === usuario.grupoId);
  if (!grupo) return [];
  const empresas = grupo.empresas.filter((e) => usuarioPodeVerEmpresa(usuario, e.id));
  return [{ ...grupo, empresas }];
}

function slugify(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const PALAVRAS_IGNORADAS_PREFIXO = new Set(['de', 'da', 'do', 'e']);

// Chave de contrato gerada automaticamente (sem edição manual na tela de
// cadastro) assim que o grupo tiver ao menos uma empresa — hoje é só um
// identificador; no futuro deve disparar a geração do contrato empresarial
// em PDF e o envio por e-mail para o sócio/administrador de cada empresa
// assinar (ver README, seção "Próximos passos").
function gerarChaveContrato(nomeGrupo, chavesExistentes) {
  const palavras = nomeGrupo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/\s+/)
    .filter((p) => p && !PALAVRAS_IGNORADAS_PREFIXO.has(p.toLowerCase()));
  const prefixo = ((palavras[0]?.[0] || 'G') + (palavras[1]?.[0] || palavras[0]?.[1] || 'X')).toUpperCase();
  const ano = new Date().getFullYear();

  let chave;
  do {
    const sequencial = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    chave = `${prefixo}-${ano}-${sequencial}`;
  } while (chavesExistentes.has(chave));

  return chave;
}

let contadorNo = 0;
function proximoIdNo() {
  contadorNo += 1;
  return `no-${Date.now()}-${contadorNo}`;
}

function estruturaVaziaPorRelatorio() {
  return Object.fromEntries(RELATORIOS.map((r) => [r.chave, []]));
}

function gerarEstruturaCompletaPadrao() {
  return Object.fromEntries(RELATORIOS.map((r) => [r.chave, gerarEstruturaPadrao(r.chave)]));
}

function moverNoLista(nos, nodeId, direcao) {
  const alvo = nos.find((n) => n.id === nodeId);
  if (!alvo) return nos;
  const irmaos = nos.filter((n) => n.parentId === alvo.parentId).sort((a, b) => a.ordem - b.ordem);
  const idx = irmaos.findIndex((n) => n.id === nodeId);
  const idxTroca = direcao === 'up' ? idx - 1 : idx + 1;
  if (idxTroca < 0 || idxTroca >= irmaos.length) return nos;
  const outro = irmaos[idxTroca];
  return nos.map((n) => {
    if (n.id === alvo.id) return { ...n, ordem: outro.ordem };
    if (n.id === outro.id) return { ...n, ordem: alvo.ordem };
    return n;
  });
}

function removerNoComDescendentes(nos, nodeId) {
  const idsRemover = new Set([nodeId]);
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const n of nos) {
      if (n.parentId && idsRemover.has(n.parentId) && !idsRemover.has(n.id)) {
        idsRemover.add(n.id);
        mudou = true;
      }
    }
  }
  return nos.filter((n) => !idsRemover.has(n.id));
}

function clonarArvore(nos) {
  const mapaIds = new Map(nos.map((n) => [n.id, proximoIdNo()]));
  return nos.map((n) => ({
    id: mapaIds.get(n.id),
    nome: n.nome,
    parentId: n.parentId ? mapaIds.get(n.parentId) : null,
    ordem: n.ordem,
    sinal: n.sinal,
  }));
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

export function AppProvider({ children }) {
  const [autenticado, setAutenticado] = useState(false);
  const [usuarioAtualId, setUsuarioAtualId] = useState(usuarios[0].id);
  const [tema, setTema] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('fr-tema') || 'light';
  });
  const [escopo, setEscopo] = useState({ grupoId: null, empresaId: 'todas' });
  const [grupos, setGrupos] = useState(gruposIniciais);
  const [estruturas, setEstruturas] = useState(estruturasIniciais);
  const [tagsContas, setTagsContas] = useState({});
  const [contasPorEmpresa, setContasPorEmpresa] = useState({});

  const usuarioAtual = useMemo(
    () => usuarios.find((u) => u.id === usuarioAtualId) ?? usuarios[0],
    [usuarioAtualId]
  );

  const gruposDoUsuario = useMemo(() => empresasVisiveis(usuarioAtual, grupos), [usuarioAtual, grupos]);

  useEffect(() => {
    const grupoValido = gruposDoUsuario.some((g) => g.id === escopo.grupoId);
    if (!grupoValido) {
      setEscopo({ grupoId: gruposDoUsuario[0]?.id ?? null, empresaId: 'todas' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioAtualId, grupos]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'dark');
    localStorage.setItem('fr-tema', tema);
  }, [tema]);

  const grupoAtual = gruposDoUsuario.find((g) => g.id === escopo.grupoId) ?? gruposDoUsuario[0] ?? null;

  const empresaIdsEscopo = useMemo(() => {
    if (!grupoAtual) return [];
    if (escopo.empresaId === 'todas') return grupoAtual.empresas.map((e) => e.id);
    return [escopo.empresaId];
  }, [grupoAtual, escopo.empresaId]);

  function grupoPorId(grupoId) {
    return grupos.find((g) => g.id === grupoId) ?? null;
  }

  function adicionarGrupo({ nome, plano }) {
    // contrato começa vazio: só é gerado quando a primeira empresa é cadastrada.
    const novoGrupo = { id: `grupo-${slugify(nome)}-${Date.now()}`, nome, contrato: null, plano, empresas: [] };
    setGrupos((prev) => [...prev, novoGrupo]);
    return novoGrupo;
  }

  function atualizarGrupo(grupoId, dados) {
    setGrupos((prev) => prev.map((g) => (g.id === grupoId ? { ...g, ...dados } : g)));
  }

  function removerGrupo(grupoId) {
    setGrupos((prev) => prev.filter((g) => g.id !== grupoId));
  }

  function adicionarEmpresa(grupoId, { codigo, nome, cnpj, conexao }) {
    const novaEmpresa = { id: `empresa-${slugify(nome)}-${Date.now()}`, codigo, nome, cnpj, conexao: conexao ?? null };
    setGrupos((prev) =>
      prev.map((g) => {
        if (g.id !== grupoId) return g;
        const chavesExistentes = new Set(prev.map((p) => p.contrato).filter(Boolean));
        const contrato = g.contrato ?? gerarChaveContrato(g.nome, chavesExistentes);
        return { ...g, contrato, empresas: [...g.empresas, novaEmpresa] };
      })
    );
    setEstruturas((prev) => ({ ...prev, [novaEmpresa.id]: gerarEstruturaCompletaPadrao() }));
    return novaEmpresa;
  }

  function atualizarEmpresa(grupoId, empresaId, dados) {
    setGrupos((prev) =>
      prev.map((g) =>
        g.id === grupoId
          ? { ...g, empresas: g.empresas.map((e) => (e.id === empresaId ? { ...e, ...dados } : e)) }
          : g
      )
    );
  }

  function removerEmpresa(grupoId, empresaId) {
    setGrupos((prev) =>
      prev.map((g) => (g.id === grupoId ? { ...g, empresas: g.empresas.filter((e) => e.id !== empresaId) } : g))
    );
    setEstruturas((prev) => {
      const { [empresaId]: _removida, ...resto } = prev;
      return resto;
    });
  }

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
    autenticado,
    login: () => setAutenticado(true),
    logout: () => setAutenticado(false),
    usuarioAtual,
    setUsuarioAtualId,
    usuarios,
    tema,
    toggleTema: () => setTema((t) => (t === 'light' ? 'dark' : 'light')),
    setTema,
    grupos,
    grupoPorId,
    adicionarGrupo,
    atualizarGrupo,
    removerGrupo,
    adicionarEmpresa,
    atualizarEmpresa,
    removerEmpresa,
    obterNosEstrutura,
    adicionarNoEstrutura,
    renomearNoEstrutura,
    alterarSinalNoEstrutura,
    moverNoEstrutura,
    removerNoEstrutura,
    copiarEstrutura,
    obterTagsConta,
    adicionarTagConta,
    removerTagConta,
    obterImportacaoContas,
    importarContasEmpresa,
    adicionarContaManual,
    removerContaManual,
    gruposDoUsuario,
    grupoAtual,
    escopo,
    setEscopo,
    empresaIdsEscopo,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp precisa estar dentro de <AppProvider>');
  return ctx;
}
