import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Scale, ArrowLeftRight, Users, Settings, Activity, Building2, X,
} from 'lucide-react';
import Logo from './Logo';
import { useApp } from '../context/AppContext';
import { usuarioPodeVerRelatorio } from '../data/usuarios';
import { PAPEIS } from '../data/constants';

function NavItem({ to, icon: Icon, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-clay-500/10 text-clay-700 dark:text-clay-300'
            : 'text-sand-600 hover:bg-sand-200/60 dark:text-sand-300 dark:hover:bg-sand-800'
        }`
      }
    >
      <Icon size={17} strokeWidth={2} />
      {children}
    </NavLink>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="px-3 pt-5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-sand-400 dark:text-sand-500">
      {children}
    </div>
  );
}

export default function Sidebar({ aberta, onFechar }) {
  const { usuarioAtual } = useApp();
  const ehSuperAdmin = usuarioAtual.papel === PAPEIS.SUPER_ADMIN;
  const podeAdministrarUsuarios = ehSuperAdmin || usuarioAtual.papel === PAPEIS.ADMIN_GRUPO;

  const conteudo = (
    <>
      <div className="flex items-center justify-between px-3 pt-1 pb-2">
        <Logo size="sm" />
        <button className="lg:hidden text-sand-400 hover:text-sand-600" onClick={onFechar}>
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto pb-4">
        <SectionLabel>Visão Geral</SectionLabel>
        <div className="space-y-0.5">
          <NavItem to="/app/dashboard" icon={LayoutDashboard} onClick={onFechar}>Dashboard</NavItem>
        </div>

        <SectionLabel>Relatórios</SectionLabel>
        <div className="space-y-0.5">
          {usuarioPodeVerRelatorio(usuarioAtual, 'dre') && (
            <NavItem to="/app/relatorios/dre" icon={FileText} onClick={onFechar}>DRE</NavItem>
          )}
          {usuarioPodeVerRelatorio(usuarioAtual, 'balanco') && (
            <NavItem to="/app/relatorios/balanco" icon={Scale} onClick={onFechar}>Balanço Patrimonial</NavItem>
          )}
          {usuarioPodeVerRelatorio(usuarioAtual, 'fluxoCaixa') && (
            <NavItem to="/app/relatorios/fluxo-caixa" icon={ArrowLeftRight} onClick={onFechar}>Fluxo de Caixa</NavItem>
          )}
        </div>

        <SectionLabel>Administração</SectionLabel>
        <div className="space-y-0.5">
          {ehSuperAdmin && (
            <NavItem to="/app/admin/grupos-empresas" icon={Building2} onClick={onFechar}>Grupos e Empresas</NavItem>
          )}
          {podeAdministrarUsuarios && (
            <NavItem to="/app/admin/usuarios" icon={Users} onClick={onFechar}>Usuários e acessos</NavItem>
          )}
          <NavItem to="/app/admin/configuracoes" icon={Settings} onClick={onFechar}>Configurações</NavItem>
          {podeAdministrarUsuarios && (
            <NavItem to="/app/admin/uso" icon={Activity} onClick={onFechar}>Uso por usuário</NavItem>
          )}
        </div>
      </nav>
    </>
  );

  return (
    <>
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-sand-200 dark:border-sand-800 bg-sand-50 dark:bg-sand-900/60 px-3 py-4">
        {conteudo}
      </aside>

      {aberta && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/30" onClick={onFechar} />
          <aside className="relative z-10 flex flex-col w-64 bg-sand-50 dark:bg-sand-900 px-3 py-4 h-full">
            {conteudo}
          </aside>
        </div>
      )}
    </>
  );
}
