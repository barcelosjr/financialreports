import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import RoleSwitcher from './RoleSwitcher';
import { useApp } from '../context/AppContext';

const TITULOS_POR_ROTA = [
  { prefixo: '/app/dashboard', titulo: 'Dashboard' },
  { prefixo: '/app/relatorios/dre', titulo: 'DRE' },
  { prefixo: '/app/relatorios/balanco', titulo: 'Balanço Patrimonial' },
  { prefixo: '/app/relatorios/fluxo-caixa', titulo: 'Fluxo de Caixa' },
  { prefixo: '/app/analises/indicadores', titulo: 'Indicadores' },
  { prefixo: '/app/analises/risco', titulo: 'Análise de Risco' },
  { prefixo: '/app/analises/previsao', titulo: 'Previsão' },
  { prefixo: '/app/analises/orcado-realizado', titulo: 'Orçado × Realizado' },
  { prefixo: '/app/admin/grupos-empresas', titulo: 'Grupos e Empresas' },
  { prefixo: '/app/admin/plano-contas', titulo: 'Plano de Contas' },
  { prefixo: '/app/admin/usuarios', titulo: 'Usuários e acessos' },
  { prefixo: '/app/admin/configuracoes', titulo: 'Configurações' },
  { prefixo: '/app/admin/uso', titulo: 'Uso por usuário' },
];

export default function AppShell() {
  const { autenticado } = useApp();
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const { pathname } = useLocation();
  const titulo = TITULOS_POR_ROTA.find((r) => pathname.startsWith(r.prefixo))?.titulo;

  if (!autenticado) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-sand-100 dark:bg-sand-950 overflow-hidden">
      <Sidebar aberta={sidebarAberta} onFechar={() => setSidebarAberta(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header titulo={titulo} onAbrirMenu={() => setSidebarAberta(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
      <RoleSwitcher />
    </div>
  );
}
