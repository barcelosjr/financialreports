import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';
import AuthLayout from './AuthLayout';

function ForcaSenha({ senha }) {
  const criterios = [
    { label: 'Mínimo de 8 caracteres', ok: senha.length >= 8 },
    { label: 'Uma letra maiúscula', ok: /[A-Z]/.test(senha) },
    { label: 'Um número', ok: /[0-9]/.test(senha) },
  ];
  if (!senha) return null;
  return (
    <ul className="mt-2 space-y-1">
      {criterios.map((c) => (
        <li key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-gain-600 dark:text-gain-400' : 'text-sand-400'}`}>
          <Check size={13} className={c.ok ? 'opacity-100' : 'opacity-30'} />
          {c.label}
        </li>
      ))}
    </ul>
  );
}

export default function Cadastro() {
  const navigate = useNavigate();
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmarSenha: '' });

  function set(campo) {
    return (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome || !form.email || !form.senha) {
      setErro('Preencha todos os campos.');
      return;
    }
    if (form.senha.length < 8) {
      setErro('A senha precisa ter no mínimo 8 caracteres.');
      return;
    }
    if (form.senha !== form.confirmarSenha) {
      setErro('As senhas não conferem.');
      return;
    }
    setErro('');
    setCarregando(true);
    setTimeout(() => {
      navigate('/cadastro/sucesso', { state: { email: form.email } });
    }, 600);
  }

  return (
    <AuthLayout frase="Cadastre seu usuário e comece a acompanhar os resultados em poucos minutos.">
      <h1 className="text-2xl font-serif font-semibold text-sand-900 dark:text-sand-50">Criar cadastro</h1>
      <p className="mt-1.5 text-sm text-sand-500 dark:text-sand-400">
        Já recebeu um convite? Use o mesmo e-mail para vincular ao seu grupo.
      </p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        {erro && (
          <div className="rounded-lg bg-loss-50 dark:bg-loss-700/20 text-loss-600 dark:text-loss-400 text-sm px-3.5 py-2.5">
            {erro}
          </div>
        )}

        <div>
          <label className="label" htmlFor="nome">Usuário (nome completo)</label>
          <input id="nome" type="text" className="input" placeholder="Seu nome" autoComplete="name" value={form.nome} onChange={set('nome')} />
        </div>

        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" type="email" className="input" placeholder="voce@empresa.com.br" autoComplete="email" value={form.email} onChange={set('email')} />
        </div>

        <div>
          <label className="label" htmlFor="senha">Senha</label>
          <div className="relative">
            <input
              id="senha"
              type={mostrarSenha ? 'text' : 'password'}
              className="input pr-10"
              placeholder="••••••••"
              autoComplete="new-password"
              value={form.senha}
              onChange={set('senha')}
            />
            <button type="button" onClick={() => setMostrarSenha((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-400 hover:text-sand-600 dark:hover:text-sand-300" tabIndex={-1}>
              {mostrarSenha ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <ForcaSenha senha={form.senha} />
        </div>

        <div>
          <label className="label" htmlFor="confirmarSenha">Confirmar senha</label>
          <input
            id="confirmarSenha"
            type={mostrarSenha ? 'text' : 'password'}
            className="input"
            placeholder="••••••••"
            autoComplete="new-password"
            value={form.confirmarSenha}
            onChange={set('confirmarSenha')}
          />
        </div>

        <button type="submit" className="btn-primary w-full mt-2" disabled={carregando}>
          {carregando && <Loader2 size={16} className="animate-spin" />}
          Criar cadastro
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-sand-500 dark:text-sand-400">
        Já tem conta?{' '}
        <Link to="/login" className="font-medium text-clay-600 hover:text-clay-700 dark:text-clay-400">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
