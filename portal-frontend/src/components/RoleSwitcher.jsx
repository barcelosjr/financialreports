import { useEffect, useRef, useState } from 'react';
import { FlaskConical, ChevronUp, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PapelBadge } from './Badge';

// Ferramenta exclusiva do protótipo: troca o usuário logado para revisar como
// cada nível de acesso (Super Admin / Admin do Grupo / Usuário) enxerga o
// produto. Não faz parte do produto final.
export default function RoleSwitcher() {
  const { usuarios, usuarioAtual, setUsuarioAtualId, grupoPorId } = useApp();
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickFora(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener('mousedown', onClickFora);
    return () => document.removeEventListener('mousedown', onClickFora);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-40" ref={ref}>
      {aberto && (
        <div className="mb-2 w-80 rounded-xl border border-dashed border-info-400/60 bg-white dark:bg-sand-900 shadow-[var(--shadow-popover)] p-2 max-h-96 overflow-y-auto">
          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-info-500">
            Protótipo · ver como...
          </div>
          {usuarios.map((u) => {
            const grupo = grupoPorId(u.grupoId);
            return (
              <button
                key={u.id}
                onClick={() => { setUsuarioAtualId(u.id); setAberto(false); }}
                className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-sand-100 dark:hover:bg-sand-800 ${
                  u.id === usuarioAtual.id ? 'bg-sand-100 dark:bg-sand-800' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sand-800 dark:text-sand-100 truncate">{u.nome}</p>
                  <p className="text-xs text-sand-400 truncate">{grupo ? grupo.nome : 'Financial Reports (interno)'}</p>
                </div>
                <PapelBadge papel={u.papel} />
                {u.id === usuarioAtual.id && <Check size={14} className="text-info-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-dashed border-info-400/60 bg-white dark:bg-sand-900 pl-3 pr-3.5 py-2 text-xs font-medium text-info-600 dark:text-info-400 shadow-[var(--shadow-card)] hover:bg-info-50 dark:hover:bg-info-600/10"
      >
        <FlaskConical size={14} />
        Ver como: {usuarioAtual.nome.split(' ')[0]}
        <ChevronUp size={14} className={`transition-transform ${aberto ? '' : 'rotate-180'}`} />
      </button>
    </div>
  );
}
