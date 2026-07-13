import { useEffect, useRef, useState } from 'react';
import { Building2, ChevronDown, Check, Layers } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PAPEIS } from '../data/constants';

export default function EmpresaSelector() {
  const { usuarioAtual, gruposDoUsuario, grupoAtual, escopo, setEscopo } = useApp();
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const podeTrocarGrupo = usuarioAtual.papel === PAPEIS.SUPER_ADMIN;

  useEffect(() => {
    function onClickFora(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener('mousedown', onClickFora);
    return () => document.removeEventListener('mousedown', onClickFora);
  }, []);

  if (!grupoAtual) return null;

  const empresaAtual = grupoAtual.empresas.find((e) => e.id === escopo.empresaId);
  const label = escopo.empresaId === 'todas' ? 'Todas as empresas' : empresaAtual?.nome ?? '—';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-sand-300 dark:border-sand-700 bg-white dark:bg-sand-900 pl-3 pr-2.5 py-2 text-sm hover:bg-sand-50 dark:hover:bg-sand-800 transition-colors max-w-[280px]"
      >
        <Building2 size={16} className="text-clay-500 shrink-0" />
        <span className="flex flex-col items-start leading-tight min-w-0">
          <span className="text-[11px] text-sand-400">{grupoAtual.nome}</span>
          <span className="text-sm font-medium text-sand-800 dark:text-sand-100 truncate max-w-[200px]">{label}</span>
        </span>
        <ChevronDown size={15} className="text-sand-400 shrink-0" />
      </button>

      {aberto && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl surface p-2 z-30">
          {podeTrocarGrupo && gruposDoUsuario.length > 1 && (
            <div className="mb-2 pb-2 border-b border-sand-150 dark:border-sand-800">
              <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sand-400">
                Grupo econômico
              </div>
              {gruposDoUsuario.map((grupo) => (
                <button
                  key={grupo.id}
                  onClick={() => setEscopo({ grupoId: grupo.id, empresaId: 'todas' })}
                  className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm text-left hover:bg-sand-100 dark:hover:bg-sand-800 ${
                    grupo.id === grupoAtual.id ? 'text-clay-700 dark:text-clay-300 font-medium' : 'text-sand-700 dark:text-sand-200'
                  }`}
                >
                  <span className="truncate">{grupo.nome}</span>
                  {grupo.id === grupoAtual.id && <Check size={14} />}
                </button>
              ))}
            </div>
          )}

          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sand-400">
            Empresa
          </div>
          <button
            onClick={() => { setEscopo({ ...escopo, empresaId: 'todas' }); setAberto(false); }}
            className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-left hover:bg-sand-100 dark:hover:bg-sand-800 ${
              escopo.empresaId === 'todas' ? 'text-clay-700 dark:text-clay-300 font-medium' : 'text-sand-700 dark:text-sand-200'
            }`}
          >
            <Layers size={15} className="shrink-0" />
            <span className="flex-1">Todas as empresas do grupo</span>
            {escopo.empresaId === 'todas' && <Check size={14} />}
          </button>
          {grupoAtual.empresas.map((empresa) => (
            <button
              key={empresa.id}
              onClick={() => { setEscopo({ ...escopo, empresaId: empresa.id }); setAberto(false); }}
              className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm text-left hover:bg-sand-100 dark:hover:bg-sand-800 ${
                escopo.empresaId === empresa.id ? 'text-clay-700 dark:text-clay-300 font-medium' : 'text-sand-700 dark:text-sand-200'
              }`}
            >
              <span className="truncate">{empresa.nome}</span>
              {escopo.empresaId === empresa.id && <Check size={14} className="shrink-0" />}
            </button>
          ))}
          {grupoAtual.empresas.length === 0 && (
            <div className="px-2.5 py-2 text-sm text-sand-400">Nenhuma empresa liberada para este usuário.</div>
          )}
        </div>
      )}
    </div>
  );
}
