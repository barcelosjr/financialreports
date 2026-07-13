import { useState } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PapelBadge } from '../../components/Badge';

function Secao({ titulo, descricao, children }) {
  return (
    <div className="surface rounded-xl p-5">
      <h3 className="text-sm font-semibold text-sand-800 dark:text-sand-100">{titulo}</h3>
      {descricao && <p className="text-sm text-sand-500 dark:text-sand-400 mt-0.5 mb-4">{descricao}</p>}
      {!descricao && <div className="mb-4" />}
      {children}
    </div>
  );
}

function ToggleLinha({ label, descricao, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2.5 cursor-pointer">
      <div>
        <p className="text-sm font-medium text-sand-800 dark:text-sand-100">{label}</p>
        {descricao && <p className="text-xs text-sand-500 dark:text-sand-400">{descricao}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-clay-500' : 'bg-sand-300 dark:bg-sand-700'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
    </label>
  );
}

export default function Configuracoes() {
  const { usuarioAtual, tema, setTema, grupoPorId } = useApp();
  const grupo = grupoPorId(usuarioAtual.grupoId);
  const [notifFechamento, setNotifFechamento] = useState(true);
  const [notifAcesso, setNotifAcesso] = useState(false);

  const temas = [
    { valor: 'light', label: 'Claro', icon: Sun },
    { valor: 'dark', label: 'Escuro', icon: Moon },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-xl font-serif font-semibold text-sand-900 dark:text-sand-50">Configurações</h2>
        <p className="text-sm text-sand-500 dark:text-sand-400">Preferências da sua conta e da plataforma.</p>
      </div>

      <Secao titulo="Perfil">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-clay-500 text-white font-semibold flex items-center justify-center">
            {usuarioAtual.nome.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-sand-800 dark:text-sand-100">{usuarioAtual.nome}</p>
            <p className="text-xs text-sand-400">{usuarioAtual.email}</p>
          </div>
          <div className="ml-auto"><PapelBadge papel={usuarioAtual.papel} /></div>
        </div>
      </Secao>

      {grupo && (
        <Secao titulo="Conta / Contrato">
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-sand-500 dark:text-sand-400">Grupo econômico</dt>
            <dd className="text-sand-800 dark:text-sand-100 font-medium">{grupo.nome}</dd>
            <dt className="text-sand-500 dark:text-sand-400">Contrato</dt>
            <dd className="text-sand-800 dark:text-sand-100 font-medium">{grupo.contrato}</dd>
            <dt className="text-sand-500 dark:text-sand-400">Plano</dt>
            <dd className="text-sand-800 dark:text-sand-100 font-medium">{grupo.plano}</dd>
            <dt className="text-sand-500 dark:text-sand-400">Empresas cadastradas</dt>
            <dd className="text-sand-800 dark:text-sand-100 font-medium">{grupo.empresas.length}</dd>
          </dl>
        </Secao>
      )}

      <Secao titulo="Aparência" descricao="Escolha como o Financial Reports aparece para você.">
        <div className="grid grid-cols-2 gap-2">
          {temas.map(({ valor, label, icon: Icon }) => (
            <button
              key={valor}
              onClick={() => setTema(valor)}
              className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-3 transition-colors ${
                tema === valor ? 'border-clay-400 bg-clay-50 dark:bg-clay-700/10' : 'border-sand-200 dark:border-sand-700 hover:bg-sand-50 dark:hover:bg-sand-800'
              }`}
            >
              <Icon size={17} className={tema === valor ? 'text-clay-600 dark:text-clay-400' : 'text-sand-500'} />
              <span className="text-sm font-medium text-sand-700 dark:text-sand-200 flex-1 text-left">{label}</span>
              {tema === valor && <Check size={15} className="text-clay-600 dark:text-clay-400" />}
            </button>
          ))}
        </div>
      </Secao>

      <Secao titulo="Notificações">
        <div className="divide-y divide-sand-150 dark:divide-sand-800">
          <ToggleLinha
            label="Resumo mensal por e-mail"
            descricao="Receba o fechamento de DRE assim que o período estiver disponível."
            checked={notifFechamento}
            onChange={setNotifFechamento}
          />
          <ToggleLinha
            label="Alertas de novo acesso"
            descricao="Avisar quando um usuário do seu grupo acessar pela primeira vez."
            checked={notifAcesso}
            onChange={setNotifAcesso}
          />
        </div>
      </Secao>

      <Secao titulo="Segurança">
        <div className="space-y-3">
          <div>
            <label className="label">Senha atual</label>
            <input type="password" className="input" placeholder="••••••••" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nova senha</label>
              <input type="password" className="input" placeholder="••••••••" />
            </div>
            <div>
              <label className="label">Confirmar nova senha</label>
              <input type="password" className="input" placeholder="••••••••" />
            </div>
          </div>
          <button className="btn-primary">Atualizar senha</button>
        </div>
      </Secao>
    </div>
  );
}
