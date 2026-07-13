import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Sun, Moon, ChevronDown, Settings, LogOut } from 'lucide-react';
import EmpresaSelector from './EmpresaSelector';
import { PapelBadge } from './Badge';
import { useApp } from '../context/AppContext';

function Avatar({ nome }) {
  const iniciais = nome.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-clay-500 text-white text-xs font-semibold flex items-center justify-center shrink-0">
      {iniciais}
    </div>
  );
}

export default function Header({ titulo, onAbrirMenu }) {
  const navigate = useNavigate();
  const { usuarioAtual, tema, toggleTema, logout } = useApp();
  const [menuAberto, setMenuAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickFora(e) {
      if (ref.current && !ref.current.contains(e.target)) setMenuAberto(false);
    }
    document.addEventListener('mousedown', onClickFora);
    return () => document.removeEventListener('mousedown', onClickFora);
  }, []);

  return (
    <header className="h-16 shrink-0 border-b border-sand-200 dark:border-sand-800 bg-sand-50/80 dark:bg-sand-900/50 backdrop-blur px-4 lg:px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button className="lg:hidden text-sand-500" onClick={onAbrirMenu}>
          <Menu size={20} />
        </button>
        {titulo && <h1 className="text-base font-semibold text-sand-900 dark:text-sand-50 truncate">{titulo}</h1>}
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <EmpresaSelector />

        <button
          onClick={toggleTema}
          className="btn-ghost !p-2"
          aria-label="Alternar tema claro/escuro"
          title="Alternar tema"
        >
          {tema === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>

        <div className="relative" ref={ref}>
          <button onClick={() => setMenuAberto((v) => !v)} className="flex items-center gap-2 rounded-lg pl-1 pr-2 py-1 hover:bg-sand-200/60 dark:hover:bg-sand-800 transition-colors">
            <Avatar nome={usuarioAtual.nome} />
            <ChevronDown size={14} className="text-sand-400 hidden sm:block" />
          </button>

          {menuAberto && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl surface p-2 z-30">
              <div className="px-2.5 py-2">
                <p className="text-sm font-medium text-sand-800 dark:text-sand-100 truncate">{usuarioAtual.nome}</p>
                <p className="text-xs text-sand-400 truncate">{usuarioAtual.email}</p>
                <div className="mt-1.5"><PapelBadge papel={usuarioAtual.papel} /></div>
              </div>
              <div className="h-px bg-sand-150 dark:bg-sand-800 my-1.5" />
              <button
                onClick={() => { setMenuAberto(false); navigate('/app/admin/configuracoes'); }}
                className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sand-700 dark:text-sand-200 hover:bg-sand-100 dark:hover:bg-sand-800"
              >
                <Settings size={16} /> Configurações
              </button>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-loss-600 dark:text-loss-400 hover:bg-loss-50 dark:hover:bg-loss-700/10"
              >
                <LogOut size={16} /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
