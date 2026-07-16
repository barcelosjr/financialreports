import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Cadastro from './pages/auth/Cadastro';
import CadastroSucesso from './pages/auth/CadastroSucesso';
import RecuperarSenha from './pages/auth/RecuperarSenha';
import AppShell from './components/AppShell';
import Dashboard from './pages/dashboard/Dashboard';
import RelatorioDRE from './pages/relatorios/RelatorioDRE';
import RelatorioBalanco from './pages/relatorios/RelatorioBalanco';
import RelatorioFluxoCaixa from './pages/relatorios/RelatorioFluxoCaixa';
import Indicadores from './pages/analises/Indicadores';
import AnaliseRisco from './pages/analises/AnaliseRisco';
import Previsao from './pages/analises/Previsao';
import OrcadoRealizado from './pages/analises/OrcadoRealizado';
import GruposEmpresas from './pages/admin/GruposEmpresas';
import PlanoContas from './pages/admin/PlanoContas';
import Usuarios from './pages/admin/Usuarios';
import Configuracoes from './pages/admin/Configuracoes';
import Uso from './pages/admin/Uso';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/cadastro/sucesso" element={<CadastroSucesso />} />
      <Route path="/recuperar-senha" element={<RecuperarSenha />} />

      <Route path="/app" element={<AppShell />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="relatorios/dre" element={<RelatorioDRE />} />
        <Route path="relatorios/balanco" element={<RelatorioBalanco />} />
        <Route path="relatorios/fluxo-caixa" element={<RelatorioFluxoCaixa />} />
        <Route path="analises/indicadores" element={<Indicadores />} />
        <Route path="analises/risco" element={<AnaliseRisco />} />
        <Route path="analises/previsao" element={<Previsao />} />
        <Route path="analises/orcado-realizado" element={<OrcadoRealizado />} />
        <Route path="admin/grupos-empresas" element={<GruposEmpresas />} />
        <Route path="admin/plano-contas" element={<PlanoContas />} />
        <Route path="admin/usuarios" element={<Usuarios />} />
        <Route path="admin/configuracoes" element={<Configuracoes />} />
        <Route path="admin/uso" element={<Uso />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
