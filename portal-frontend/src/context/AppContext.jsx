import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usuarios, usuarioPodeVerEmpresa } from '../data/usuarios';
import { gruposEconomicos as gruposIniciais } from '../data/empresas';
import { PAPEIS } from '../data/constants';

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

export function AppProvider({ children }) {
  const [autenticado, setAutenticado] = useState(false);
  const [usuarioAtualId, setUsuarioAtualId] = useState(usuarios[0].id);
  const [tema, setTema] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('fr-tema') || 'light';
  });
  const [escopo, setEscopo] = useState({ grupoId: null, empresaId: 'todas' });
  const [grupos, setGrupos] = useState(gruposIniciais);

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
