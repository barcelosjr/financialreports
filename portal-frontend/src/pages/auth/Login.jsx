import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { useApp } from '../../context/AppContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!email || !senha) {
      setErro('Informe e-mail e senha.');
      return;
    }
    setErro('');
    setCarregando(true);
    setTimeout(() => {
      login();
      navigate('/app/dashboard');
    }, 500);
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-serif font-semibold text-sand-900 dark:text-sand-50">Entrar</h1>
      <p className="mt-1.5 text-sm text-sand-500 dark:text-sand-400">
        Acesse os resultados financeiros da sua empresa.
      </p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        {erro && (
          <div className="rounded-lg bg-loss-50 dark:bg-loss-700/20 text-loss-600 dark:text-loss-400 text-sm px-3.5 py-2.5">
            {erro}
          </div>
        )}

        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            className="input"
            placeholder="voce@empresa.com.br"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label mb-0" htmlFor="senha">Senha</label>
            <Link to="/recuperar-senha" className="text-xs font-medium text-clay-600 hover:text-clay-700 dark:text-clay-400">
              Esqueci minha senha
            </Link>
          </div>
          <div className="relative">
            <input
              id="senha"
              type={mostrarSenha ? 'text' : 'password'}
              className="input pr-10"
              placeholder="••••••••"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-400 hover:text-sand-600 dark:hover:text-sand-300"
              tabIndex={-1}
            >
              {mostrarSenha ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full mt-2" disabled={carregando}>
          {carregando && <Loader2 size={16} className="animate-spin" />}
          Entrar
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-sand-500 dark:text-sand-400">
        Ainda não tem conta?{' '}
        <Link to="/cadastro" className="font-medium text-clay-600 hover:text-clay-700 dark:text-clay-400">
          Criar cadastro
        </Link>
      </p>
    </AuthLayout>
  );
}
