import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usuarios } from '../data/usuarios';

// Autenticação (fake, ver README), usuário logado e tema — o que muda pouco
// e é lido por quase toda a árvore (Header, Sidebar, AppShell). Separado do
// Tenant/Estrutura para que trocar de tema não re-renderize telas de
// grupos/empresas/plano de contas.
const SessaoContext = createContext(null);

export function SessaoProvider({ children }) {
  const [autenticado, setAutenticado] = useState(false);
  const [usuarioAtualId, setUsuarioAtualId] = useState(usuarios[0].id);
  const [tema, setTema] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('fr-tema') || 'light';
  });

  const usuarioAtual = useMemo(
    () => usuarios.find((u) => u.id === usuarioAtualId) ?? usuarios[0],
    [usuarioAtualId]
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'dark');
    localStorage.setItem('fr-tema', tema);
  }, [tema]);

  const value = {
    autenticado,
    login: () => setAutenticado(true),
    logout: () => setAutenticado(false),
    usuarioAtual,
    usuarioAtualId,
    setUsuarioAtualId,
    usuarios,
    tema,
    toggleTema: () => setTema((t) => (t === 'light' ? 'dark' : 'light')),
    setTema,
  };

  return <SessaoContext.Provider value={value}>{children}</SessaoContext.Provider>;
}

export function useSessao() {
  const ctx = useContext(SessaoContext);
  if (!ctx) throw new Error('useSessao precisa estar dentro de <SessaoProvider>');
  return ctx;
}
