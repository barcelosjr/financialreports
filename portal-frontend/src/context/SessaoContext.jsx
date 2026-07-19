import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usuarios as usuariosMock } from '../data/usuarios';
import { usePersistedState } from '../lib/usePersistedState';
import { apiGet, apiPost, setSessionToken } from '../data/api';
import { FLAGS } from '../data/flags';

// Autenticação, usuário logado e tema — o que muda pouco e é lido por quase
// toda a árvore (Header, Sidebar, AppShell). Separado do Tenant/Estrutura
// para que trocar de tema não re-renderize telas de grupos/empresas/plano
// de contas.
//
// Atrás do flag VITE_USE_BACKEND_SESSAO (ver data/flags.js): desligado,
// login() só liga um booleano (mock, como sempre foi); ligado, login/logout
// falam com o backend de verdade (JWT persistido em localStorage via
// usePersistedState) e api.js passa a mandar Authorization: Bearer em vez
// de X-API-KEY em toda chamada (ver data/api.js:setSessionToken).
const SessaoContext = createContext(null);

export function SessaoProvider({ children }) {
  // ---- Modo mock (flag desligado) ----
  const [autenticadoMock, setAutenticadoMock] = useState(false);
  const [usuarioAtualId, setUsuarioAtualId] = useState(usuariosMock[0].id);

  // ---- Modo backend (flag ligado) ----
  const [token, setToken] = usePersistedState('fr-sessao-token', null);
  const [usuarioApi, setUsuarioApi] = useState(null);
  const [carregandoSessao, setCarregandoSessao] = useState(FLAGS.SESSAO);
  const [erroLogin, setErroLogin] = useState('');
  const validouTokenInicial = useRef(false);

  const [tema, setTema] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('fr-tema') || 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'dark');
    localStorage.setItem('fr-tema', tema);
  }, [tema]);

  // Mantém api.js sincronizado com o token atual (login/logout e também a
  // hidratação inicial a partir do localStorage).
  useEffect(() => {
    if (FLAGS.SESSAO) setSessionToken(token);
  }, [token]);

  // Ao carregar a página com um token já persistido, confirma que ainda é
  // válido e busca os dados atuais do usuário (permissões podem ter mudado
  // desde o último login).
  useEffect(() => {
    if (!FLAGS.SESSAO || validouTokenInicial.current) return;
    validouTokenInicial.current = true;
    if (!token) {
      setCarregandoSessao(false);
      return;
    }
    apiGet('/auth/me')
      .then(({ usuario }) => setUsuarioApi(usuario))
      .catch(() => {
        setToken(null);
        setUsuarioApi(null);
      })
      .finally(() => setCarregandoSessao(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email, senha) {
    if (!FLAGS.SESSAO) {
      setAutenticadoMock(true);
      return { ok: true };
    }
    setErroLogin('');
    try {
      const resposta = await apiPost('/auth/login', { body: { email, senha } });
      setSessionToken(resposta.token);
      setToken(resposta.token);
      setUsuarioApi(resposta.usuario);
      return { ok: true };
    } catch (err) {
      setErroLogin(err.message);
      return { ok: false, erro: err.message };
    }
  }

  function logout() {
    if (!FLAGS.SESSAO) {
      setAutenticadoMock(false);
      return;
    }
    setSessionToken(null);
    setToken(null);
    setUsuarioApi(null);
  }

  const usuarioAtualMock = useMemo(
    () => usuariosMock.find((u) => u.id === usuarioAtualId) ?? usuariosMock[0],
    [usuarioAtualId]
  );

  const value = {
    autenticado: FLAGS.SESSAO ? Boolean(token && usuarioApi) : autenticadoMock,
    carregandoSessao: FLAGS.SESSAO ? carregandoSessao : false,
    erroLogin,
    login,
    logout,
    usuarioAtual: FLAGS.SESSAO ? usuarioApi : usuarioAtualMock,
    usuarioAtualId,
    setUsuarioAtualId,
    usuarios: usuariosMock,
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
