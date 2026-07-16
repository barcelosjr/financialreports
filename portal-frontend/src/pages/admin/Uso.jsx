import { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Activity, Users as UsersIcon, Eye } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { usuarios } from '../../data/usuarios';
import { PAPEIS } from '../../data/constants';
import { formatarDataRelativa } from '../../lib/format';
import { useChartTheme } from '../../lib/chartTheme';
import { PapelBadge, StatusBadge } from '../../components/Badge';
import RequireAcesso from '../../components/RequireAcesso';

function TooltipCard({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="surface rounded-lg px-3 py-2 text-xs">
      <p className="font-medium text-sand-700 dark:text-sand-200 mb-1">{label}</p>
      <p className="text-sand-600 dark:text-sand-300">{payload[0].value} acessos no mês</p>
    </div>
  );
}

export default function Uso() {
  const { usuarioAtual, grupos, grupoPorId } = useApp();
  const ehSuperAdmin = usuarioAtual.papel === PAPEIS.SUPER_ADMIN;
  const podeAdministrar = usuarioAtual.papel !== PAPEIS.USUARIO;
  const [filtroGrupo, setFiltroGrupo] = useState('todos');

  const { corGrade, corEixo, corCursor } = useChartTheme();

  const base = ehSuperAdmin ? usuarios : usuarios.filter((u) => u.grupoId === usuarioAtual.grupoId);
  const lista = ehSuperAdmin && filtroGrupo !== 'todos' ? base.filter((u) => u.grupoId === filtroGrupo) : base;

  const totalAcessos = lista.reduce((acc, u) => acc + u.acessosMes, 0);
  const usuariosAtivos = lista.filter((u) => u.status === 'ativo' && u.acessosMes > 0).length;
  const totalRelatoriosVistos = lista.reduce((acc, u) => acc + u.relatoriosVisualizadosMes, 0);

  const dadosGrafico = useMemo(
    () =>
      [...lista]
        .sort((a, b) => b.acessosMes - a.acessosMes)
        .slice(0, 8)
        .map((u) => ({ nome: u.nome.split(' ')[0], acessos: u.acessosMes })),
    [lista]
  );

  return (
    <RequireAcesso permitido={podeAdministrar}>
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-serif font-semibold text-sand-900 dark:text-sand-50">Uso por usuário</h2>
          <p className="text-sm text-sand-500 dark:text-sand-400">Atividade dos usuários no mês corrente.</p>
        </div>
        {ehSuperAdmin && (
          <select className="input !w-auto !py-2 text-sm" value={filtroGrupo} onChange={(e) => setFiltroGrupo(e.target.value)}>
            <option value="todos">Todos os grupos</option>
            {grupos.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="surface rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-clay-50 dark:bg-clay-700/15 flex items-center justify-center text-clay-600 dark:text-clay-400"><Activity size={17} /></div>
          <div>
            <p className="text-xs text-sand-500 dark:text-sand-400">Acessos no mês</p>
            <p className="text-lg font-semibold text-sand-900 dark:text-sand-50">{totalAcessos}</p>
          </div>
        </div>
        <div className="surface rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gain-50 dark:bg-gain-700/15 flex items-center justify-center text-gain-600 dark:text-gain-400"><UsersIcon size={17} /></div>
          <div>
            <p className="text-xs text-sand-500 dark:text-sand-400">Usuários ativos</p>
            <p className="text-lg font-semibold text-sand-900 dark:text-sand-50">{usuariosAtivos} <span className="text-sm font-normal text-sand-400">/ {lista.length}</span></p>
          </div>
        </div>
        <div className="surface rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-info-50 dark:bg-info-600/15 flex items-center justify-center text-info-500 dark:text-info-400"><Eye size={17} /></div>
          <div>
            <p className="text-xs text-sand-500 dark:text-sand-400">Relatórios visualizados</p>
            <p className="text-lg font-semibold text-sand-900 dark:text-sand-50">{totalRelatoriosVistos}</p>
          </div>
        </div>
      </div>

      <div className="surface rounded-xl p-5">
        <h3 className="text-sm font-semibold text-sand-700 dark:text-sand-200 mb-4">Acessos por usuário (top 8)</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGrafico} margin={{ left: -20, right: 8, top: 4 }}>
              <CartesianGrid vertical={false} stroke={corGrade} strokeDasharray="3 3" />
              <XAxis dataKey="nome" tick={{ fontSize: 11, fill: corEixo }} axisLine={{ stroke: corGrade }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: corEixo }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
              <Tooltip content={<TooltipCard />} cursor={{ fill: corCursor }} />
              <Bar dataKey="acessos" fill="#D97757" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="surface rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-sand-150 dark:border-sand-800">
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pl-4 pr-2">Usuário</th>
              {ehSuperAdmin && <th className="text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pr-2">Grupo</th>}
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pr-2">Nível</th>
              <th className="text-right text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pr-2">Acessos/mês</th>
              <th className="text-right text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pr-2">Relatórios vistos</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pr-2">Último acesso</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {[...lista].sort((a, b) => b.acessosMes - a.acessosMes).map((u) => (
              <tr key={u.id} className="border-b border-sand-100 dark:border-sand-800/60 last:border-0 hover:bg-sand-50/60 dark:hover:bg-sand-800/30">
                <td className="py-3 pl-4 pr-2">
                  <p className="text-sm font-medium text-sand-800 dark:text-sand-100">{u.nome}</p>
                  <p className="text-xs text-sand-400">{u.email}</p>
                </td>
                {ehSuperAdmin && <td className="py-3 pr-2 text-sm text-sand-600 dark:text-sand-300">{grupoPorId(u.grupoId)?.nome ?? '—'}</td>}
                <td className="py-3 pr-2"><PapelBadge papel={u.papel} /></td>
                <td className="py-3 pr-2 text-right text-sm tabular-nums text-sand-700 dark:text-sand-200">{u.acessosMes}</td>
                <td className="py-3 pr-2 text-right text-sm tabular-nums text-sand-700 dark:text-sand-200">{u.relatoriosVisualizadosMes}</td>
                <td className="py-3 pr-2 text-sm text-sand-500 dark:text-sand-400">{formatarDataRelativa(u.ultimoAcesso)}</td>
                <td className="py-3 pr-4"><StatusBadge status={u.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </RequireAcesso>
  );
}
