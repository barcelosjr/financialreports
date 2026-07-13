import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Cell,
} from 'recharts';
import { DollarSign, TrendingUp, Percent, Wallet } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { calcularKpis, serieMensal, resultadoPorEmpresa } from '../../data/financeiro';
import { PERIODO_ATUAL, labelPeriodo, PERIODOS } from '../../data/constants';
import { formatarMoeda, formatarPercentual } from '../../lib/format';
import StatCard from '../../components/StatCard';
import PeriodRangeSelector from '../../components/PeriodRangeSelector';

function TooltipCard({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const dados = payload[0].payload;
  const receita = dados['Receita Líquida'];
  const lucro = dados['Lucro Líquido'];
  const margem = receita ? (lucro / receita) * 100 : null;
  return (
    <div className="surface rounded-lg px-3 py-2 text-xs">
      <p className="font-medium text-sand-700 dark:text-sand-200 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="tabular-nums">
          {p.name}: {formatarMoeda(p.value)}
        </p>
      ))}
      {margem !== null && (
        <p className="tabular-nums text-sand-500 dark:text-sand-400 mt-1 pt-1 border-t border-sand-150 dark:border-sand-800">
          Lucro sobre Receita: {margem.toFixed(1)}%
        </p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { grupoAtual, empresaIdsEscopo, escopo, tema } = useApp();
  const [periodo, setPeriodo] = useState(PERIODO_ATUAL);

  const isDark = tema === 'dark';
  const corGrade = isDark ? '#3B3730' : '#E5E1D6';
  const corEixo = isDark ? '#B0A891' : '#8B8371';
  const corCursor = isDark ? '#262421' : '#F4F3EE';

  const kpis = useMemo(() => calcularKpis(empresaIdsEscopo, periodo), [empresaIdsEscopo, periodo]);

  const serieReceita = useMemo(() => serieMensal(empresaIdsEscopo, 'dre', 'subtotal-receita-liquida'), [empresaIdsEscopo]);
  const serieLucro = useMemo(() => serieMensal(empresaIdsEscopo, 'dre', 'total-lucro-liquido'), [empresaIdsEscopo]);

  const dadosEvolucao = PERIODOS.map((p, i) => ({
    periodo: labelPeriodo(p),
    'Receita Líquida': Math.round(serieReceita[i].valor),
    'Lucro Líquido': Math.round(serieLucro[i].valor),
  }));

  const comparativoEmpresas = useMemo(
    () => (grupoAtual ? resultadoPorEmpresa(grupoAtual.empresas, periodo) : []),
    [grupoAtual, periodo]
  );

  const mostrarComparativo = grupoAtual && grupoAtual.empresas.length > 1;
  const empresaSelecionada = grupoAtual?.empresas.find((e) => e.id === escopo.empresaId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-serif font-semibold text-sand-900 dark:text-sand-50">Visão Geral</h2>
          <p className="text-sm text-sand-500 dark:text-sand-400">
            {escopo.empresaId === 'todas' && grupoAtual ? `Consolidado · ${grupoAtual.empresas.length} empresas` : empresaSelecionada?.nome}
          </p>
        </div>
        <PeriodRangeSelector fim={periodo} inicio={periodo} apenasFim onChange={({ fim }) => setPeriodo(fim)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Receita Líquida" valor={formatarMoeda(kpis.receitaLiquida, { compacto: true })} variacao={kpis.variacao.receitaLiquida} icon={DollarSign} destaque />
        <StatCard label="Lucro Líquido" valor={formatarMoeda(kpis.lucroLiquido, { compacto: true })} variacao={kpis.variacao.lucroLiquido} icon={TrendingUp} />
        <StatCard
          label="Margem Líquida"
          valor={formatarPercentual(kpis.margem, { comSinal: false })}
          variacao={kpis.variacao.margem}
          formatoVariacao="pontos"
          icon={Percent}
        />
        <StatCard label="Saldo em Caixa" valor={formatarMoeda(kpis.saldoCaixa, { compacto: true })} variacao={kpis.variacao.saldoCaixa} icon={Wallet} />
      </div>

      <div className={`grid grid-cols-1 ${mostrarComparativo ? 'xl:grid-cols-3' : ''} gap-4`}>
        <div className={`surface rounded-xl p-5 ${mostrarComparativo ? 'xl:col-span-2' : ''}`}>
          <h3 className="text-sm font-semibold text-sand-700 dark:text-sand-200 mb-4">Evolução de Receita e Lucro</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dadosEvolucao} margin={{ left: -12, right: 8, top: 4 }}>
                <CartesianGrid vertical={false} stroke={corGrade} strokeDasharray="3 3" />
                <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: corEixo }} axisLine={{ stroke: corGrade }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: corEixo }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatarMoeda(v, { compacto: true })}
                  width={64}
                />
                <Tooltip content={<TooltipCard />} cursor={{ fill: corCursor }} />
                <Bar dataKey="Receita Líquida" fill="#E9A47F" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line dataKey="Lucro Líquido" stroke="#2E8365" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {mostrarComparativo && (
          <div className="surface rounded-xl p-5">
            <h3 className="text-sm font-semibold text-sand-700 dark:text-sand-200 mb-4">Resultado por Empresa</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparativoEmpresas} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={110}
                    tick={{ fontSize: 11, fill: corEixo }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v.length > 16 ? `${v.slice(0, 16)}…` : v)}
                  />
                  <Tooltip content={<TooltipCard />} cursor={{ fill: corCursor }} />
                  <Bar dataKey="lucroLiquido" name="Lucro Líquido" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {comparativoEmpresas.map((e) => (
                      <Cell key={e.empresaId} fill={e.lucroLiquido >= 0 ? '#2E8365' : '#B5503A'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
