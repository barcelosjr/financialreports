import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck, ArrowLeft } from 'lucide-react';
import AuthLayout from './AuthLayout';

export default function RecuperarSenha() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!email) return;
    setEnviado(true);
  }

  if (enviado) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-clay-50 dark:bg-clay-700/20 flex items-center justify-center mb-5">
            <MailCheck size={28} className="text-clay-500" />
          </div>
          <h1 className="text-2xl font-serif font-semibold text-sand-900 dark:text-sand-50">Verifique seu e-mail</h1>
          <p className="mt-2 text-sm text-sand-500 dark:text-sand-400">
            Se <span className="font-medium text-sand-700 dark:text-sand-200">{email}</span> estiver cadastrado,
            enviamos um link para redefinir sua senha.
          </p>
          <Link to="/login" className="mt-6 text-sm font-medium text-clay-600 hover:text-clay-700 dark:text-clay-400 flex items-center gap-1.5">
            <ArrowLeft size={15} /> Voltar para o login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-serif font-semibold text-sand-900 dark:text-sand-50">Recuperar senha</h1>
      <p className="mt-1.5 text-sm text-sand-500 dark:text-sand-400">
        Informe seu e-mail e enviaremos um link para redefinir sua senha.
      </p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
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

        <button type="submit" className="btn-primary w-full mt-2">Enviar link de recuperação</button>
      </form>

      <Link to="/login" className="mt-6 text-sm font-medium text-clay-600 hover:text-clay-700 dark:text-clay-400 flex items-center justify-center gap-1.5">
        <ArrowLeft size={15} /> Voltar para o login
      </Link>
    </AuthLayout>
  );
}
