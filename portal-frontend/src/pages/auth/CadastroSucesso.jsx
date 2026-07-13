import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MailCheck, CheckCircle2 } from 'lucide-react';
import AuthLayout from './AuthLayout';

export default function CadastroSucesso() {
  const location = useLocation();
  const email = location.state?.email || 'voce@empresa.com.br';
  const [reenviado, setReenviado] = useState(false);

  return (
    <AuthLayout frase="Falta pouco: confirme seu e-mail para ativar o acesso aos relatórios.">
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-gain-50 dark:bg-gain-700/20 flex items-center justify-center mb-5">
          <CheckCircle2 size={28} className="text-gain-500" />
        </div>

        <h1 className="text-2xl font-serif font-semibold text-sand-900 dark:text-sand-50">
          Cadastro realizado com sucesso
        </h1>

        <div className="mt-6 w-full surface rounded-xl p-5">
          <div className="flex items-center justify-center gap-2 text-sand-700 dark:text-sand-200 mb-1.5">
            <MailCheck size={18} className="text-clay-500" />
            <span className="font-medium text-sm">Acesse seu e-mail para confirmar</span>
          </div>
          <p className="text-sm text-sand-500 dark:text-sand-400">
            Enviamos um link de confirmação para{' '}
            <span className="font-medium text-sand-700 dark:text-sand-200">{email}</span>.
            Clique nele para ativar seu acesso.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary mt-4 w-full"
          onClick={() => setReenviado(true)}
          disabled={reenviado}
        >
          {reenviado ? 'E-mail reenviado' : 'Reenviar e-mail'}
        </button>

        <Link to="/login" className="mt-6 text-sm font-medium text-clay-600 hover:text-clay-700 dark:text-clay-400">
          Voltar para o login
        </Link>
      </div>
    </AuthLayout>
  );
}
