import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { gruposEconomicos as gruposIniciais } from '../data/empresas';
import { empresasVisiveis, slugify, gerarChaveContrato } from '../lib/tenant';
import { useSessao } from './SessaoContext';
import { useEstrutura } from './EstruturaContext';
import { apiGet, apiPost, apiPut, apiDelete } from '../data/api';
import { FLAGS } from '../data/flags';
import { atualizarRegistroEmpresas } from '../lib/empresaRegistry';

// Grupos econômicos, empresas e o escopo (grupo/empresa) atualmente
// selecionado. Depende de useSessao() (para saber quem é o usuário logado e
// filtrar o que ele pode ver) e de useEstrutura() (para inicializar/limpar
// a estrutura de plano de contas ao cadastrar/remover uma empresa).
//
// Atrás do flag VITE_USE_BACKEND_TENANT: desligado, grupos vive em
// useState local (mock); ligado, vem do backend (GET /grupos, já filtrado
// por permissão pelo servidor) e cada mutação chama a API e recarrega.
const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const { usuarioAtual, usuarioAtualId, autenticado } = useSessao();
  const { inicializarEstruturaEmpresa, removerEstruturaEmpresa } = useEstrutura();

  const [escopo, setEscopo] = useState({ grupoId: null, empresaId: 'todas' });
  const [gruposMock, setGruposMock] = useState(gruposIniciais);
  const [gruposApi, setGruposApi] = useState([]);
  const carregouGrupos = useRef(false);

  function recarregarGrupos() {
    return apiGet('/grupos').then(setGruposApi);
  }

  // Busca os grupos assim que houver uma sessão real (evita chamar a API
  // deslogado, o que sempre daria 401) -- e limpa o cache ao deslogar, pra
  // não vazar dados do usuário anterior numa troca de sessão.
  useEffect(() => {
    if (!FLAGS.TENANT) return;
    if (!autenticado) {
      carregouGrupos.current = false;
      setGruposApi([]);
      return;
    }
    if (carregouGrupos.current) return;
    carregouGrupos.current = true;
    recarregarGrupos().catch((err) => {
      carregouGrupos.current = false;
      console.error('Falha ao carregar grupos:', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autenticado]);

  const grupos = FLAGS.TENANT ? gruposApi : gruposMock;

  // Mantém o registro empresaId->código (lib/empresaRegistry.js) em dia --
  // é como EstruturaContext resolve o código sem poder chamar useTenant()
  // (ele fica acima de TenantProvider na árvore).
  useEffect(() => {
    atualizarRegistroEmpresas(grupos);
  }, [grupos]);

  const gruposDoUsuario = useMemo(
    () => (usuarioAtual ? empresasVisiveis(usuarioAtual, grupos) : []),
    [usuarioAtual, grupos]
  );

  useEffect(() => {
    const grupoValido = gruposDoUsuario.some((g) => g.id === escopo.grupoId);
    if (!grupoValido) {
      setEscopo({ grupoId: gruposDoUsuario[0]?.id ?? null, empresaId: 'todas' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioAtualId, grupos]);

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
    if (FLAGS.TENANT) {
      apiPost('/grupos', { body: { nome, plano } })
        .then(recarregarGrupos)
        .catch((err) => console.error('Falha ao criar grupo:', err));
      return;
    }
    // contrato começa vazio: só é gerado quando a primeira empresa é cadastrada.
    const novoGrupo = { id: `grupo-${slugify(nome)}-${Date.now()}`, nome, contrato: null, plano, empresas: [] };
    setGruposMock((prev) => [...prev, novoGrupo]);
    return novoGrupo;
  }

  function atualizarGrupo(grupoId, dados) {
    if (FLAGS.TENANT) {
      apiPut(`/grupos/${grupoId}`, { body: dados })
        .then(recarregarGrupos)
        .catch((err) => console.error('Falha ao atualizar grupo:', err));
      return;
    }
    setGruposMock((prev) => prev.map((g) => (g.id === grupoId ? { ...g, ...dados } : g)));
  }

  function removerGrupo(grupoId) {
    if (FLAGS.TENANT) {
      apiDelete(`/grupos/${grupoId}`)
        .then(recarregarGrupos)
        .catch((err) => console.error('Falha ao remover grupo:', err));
      return;
    }
    setGruposMock((prev) => prev.filter((g) => g.id !== grupoId));
  }

  function adicionarEmpresa(grupoId, { codigo, nome, cnpj, conexao }) {
    if (FLAGS.TENANT) {
      apiPost(`/grupos/${grupoId}/empresas`, { body: { codigo, nome, cnpj, conexao: conexao ?? null } })
        .then((novaEmpresa) => {
          inicializarEstruturaEmpresa(novaEmpresa.id);
          return recarregarGrupos();
        })
        .catch((err) => console.error('Falha ao adicionar empresa:', err));
      return;
    }
    const novaEmpresa = { id: `empresa-${slugify(nome)}-${Date.now()}`, codigo, nome, cnpj, conexao: conexao ?? null };
    setGruposMock((prev) =>
      prev.map((g) => {
        if (g.id !== grupoId) return g;
        const chavesExistentes = new Set(prev.map((p) => p.contrato).filter(Boolean));
        const contrato = g.contrato ?? gerarChaveContrato(g.nome, chavesExistentes);
        return { ...g, contrato, empresas: [...g.empresas, novaEmpresa] };
      })
    );
    inicializarEstruturaEmpresa(novaEmpresa.id);
    return novaEmpresa;
  }

  function atualizarEmpresa(grupoId, empresaId, dados) {
    if (FLAGS.TENANT) {
      apiPut(`/empresas/${empresaId}`, { body: dados })
        .then(recarregarGrupos)
        .catch((err) => console.error('Falha ao atualizar empresa:', err));
      return;
    }
    setGruposMock((prev) =>
      prev.map((g) =>
        g.id === grupoId
          ? { ...g, empresas: g.empresas.map((e) => (e.id === empresaId ? { ...e, ...dados } : e)) }
          : g
      )
    );
  }

  function removerEmpresa(grupoId, empresaId) {
    if (FLAGS.TENANT) {
      apiDelete(`/empresas/${empresaId}`)
        .then(() => {
          removerEstruturaEmpresa(empresaId);
          return recarregarGrupos();
        })
        .catch((err) => console.error('Falha ao remover empresa:', err));
      return;
    }
    setGruposMock((prev) =>
      prev.map((g) => (g.id === grupoId ? { ...g, empresas: g.empresas.filter((e) => e.id !== empresaId) } : g))
    );
    removerEstruturaEmpresa(empresaId);
  }

  const value = {
    grupos,
    grupoPorId,
    adicionarGrupo,
    atualizarGrupo,
    removerGrupo,
    adicionarEmpresa,
    atualizarEmpresa,
    removerEmpresa,
    gruposDoUsuario,
    grupoAtual,
    escopo,
    setEscopo,
    empresaIdsEscopo,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant precisa estar dentro de <TenantProvider>');
  return ctx;
}
