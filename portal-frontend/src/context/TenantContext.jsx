import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { gruposEconomicos as gruposIniciais } from '../data/empresas';
import { empresasVisiveis, slugify, gerarChaveContrato } from '../lib/tenant';
import { useSessao } from './SessaoContext';
import { useEstrutura } from './EstruturaContext';

// Grupos econômicos, empresas e o escopo (grupo/empresa) atualmente
// selecionado. Depende de useSessao() (para saber quem é o usuário logado e
// filtrar o que ele pode ver) e de useEstrutura() (para inicializar/limpar
// a estrutura de plano de contas ao cadastrar/remover uma empresa).
const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const { usuarioAtual, usuarioAtualId } = useSessao();
  const { inicializarEstruturaEmpresa, removerEstruturaEmpresa } = useEstrutura();

  const [escopo, setEscopo] = useState({ grupoId: null, empresaId: 'todas' });
  const [grupos, setGrupos] = useState(gruposIniciais);

  const gruposDoUsuario = useMemo(() => empresasVisiveis(usuarioAtual, grupos), [usuarioAtual, grupos]);

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
    inicializarEstruturaEmpresa(novaEmpresa.id);
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
