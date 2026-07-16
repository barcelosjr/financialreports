import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Cell,
} from 'recharts';
import { Link } from 'react-router-dom';
import { DollarSign, TrendingUp, Percent, Wallet, Layers, Scale, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { calcularKpis, serieMensal, resultadoPorEmpresa, calcularEBITDA } from '../../data/financeiro';
import { todosIndicadores } from '../../data/indicadores';
import { calcularAltmanZ, calcularAlertas } from '../../data/risco';
import { projetarSerie } from '../../data/previsao';
import { PERIODO_ATUAL, labelPeriodo, PERIODOS } from '../../data/constants';
import { formatarMoeda, formatarPercentual, formatarMultiplo } from '../../lib/format';
import { useChartTheme } from '../../lib/chartTheme';
import StatCard from '../../components/StatCard';
import PeriodRangeSelector from '../../components/PeriodRangeSelector';

function valorDe(lista, chave) {
  return lista?.find((i) => i.chave === chave)?.valor ?? null;
}

function pctVariacao(atual, anterior) {
  if (atual == null || anterior === null || anterior === undefined || anterior === 0) return null;
  return (atual - anterior) / Math.abs(anterior);
}

function pontosVariacao(atual, anterior) {
  if (atual == null || anterior === null || anterior === undefined) return null;
  return atual - anterior;
}

const ZONA_LABEL = { seguro: 'Zona segura', cinza: 'Zona de atenção', perigo: 'Zona de perigo' };
const ZONA_COR = {
  seguro: 'text-gain-600 dark:text-gain-400',
  cinza: 'text-amber-600 dark:text-amber-400',
  perigo: 'text-loss-500 dark:text-loss-400',
};

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
  const { grupoAtual, empresaIdsEscopo, escopo } = useApp();
  const [periodo, setPeriodo] = useState(PERIODO_ATUAL);

  const { corGrade, corEixo, corCursor } = useChartTheme();

  const kpis = useMemo(() => calcularKpis(empresaIdsEscopo, periodo), [empresaIdsEscopo, periodo]);

  const idxPeriodo = PERIODOS.indexOf(periodo);
  const periodoAnterior = idxPeriodo > 0 ? PERIODOS[idxPeriodo - 1] : null;

  const indicadoresAtual = useMemo(() => todosIndicadores(empresaIdsEscopo, periodo), [empresaIdsEscopo, periodo]);
  const indicadoresAnterior = useMemo(
    () => (periodoAnterior ? todosIndicadores(empresaIdsEscopo, periodoAnterior) : null),
    [empresaIdsEscopo, periodoAnterior]
  );

  const ebitdaAtual = useMemo(() => calcularEBITDA(empresaIdsEscopo, periodo), [empresaIdsEscopo, periodo]);
  const ebitdaAnterior = useMemo(
    () => (periodoAnterior ? calcularEBITDA(empresaIdsEscopo, periodoAnterior) : null),
    [empresaIdsEscopo, periodoAnterior]
  );

  const margemEbitda = valorDe(indicadoresAtual, 'margemEbitda');
  const liquidezCorrente = valorDe(indicadoresAtual, 'liquidezCorrente');
  const dividaLiquidaEbitda = valorDe(indicadoresAtual, 'dividaLiquidaEbitda');
  const roe = valorDe(indicadoresAtual, 'roe');

  const z = useMemo(() => calcularAltmanZ(empresaIdsEscopo, periodo), [empresaIdsEscopo, periodo]);
  const alertas = useMemo(() => calcularAlertas(empresaIdsEscopo, periodo), [empresaIdsEscopo, periodo]);

  const forecastReceita = useMemo(
    () => projetarSerie(serieMensal(empresaIdsEscopo, 'dre', 'subtotal-receita-liquida'), { metodo: 'linear', horizonte: 3 }),
    [empresaIdsEscopo]
  );
  const forecastLucro = useMemo(
    () => projetarSerie(serieMensal(empresaIdsEscopo, 'dre', 'total-lucro-liquido'), { metodo: 'linear', horizonte: 3 }),
    [empresaIdsEscopo]
  );

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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard label="EBITDA" valor={formatarMoeda(ebitdaAtual, { compacto: true })} variacao={pctVariacao(ebitdaAtual, ebitdaAnterior)} icon={Layers} />
        <StatCard
          label="Margem EBITDA"
          valor={formatarPercentual(margemEbitda, { comSinal: false })}
          variacao={pontosVariacao(margemEbitda, valorDe(indicadoresAnterior, 'margemEbitda'))}
          formatoVariacao="pontos"
          icon={Percent}
        />
        <StatCard
          label="Liquidez Corrente"
          valor={formatarMultiplo(liquidezCorrente)}
          variacao={pctVariacao(liquidezCorrente, valorDe(indicadoresAnterior, 'liquidezCorrente'))}
          icon={Scale}
        />
        <StatCard
          label="Dívida Líq. / EBITDA"
          valor={formatarMultiplo(dividaLiquidaEbitda)}
          variacao={pctVariacao(dividaLiquidaEbitda, valorDe(indicadoresAnterior, 'dividaLiquidaEbitda'))}
          variacaoInvertida
          icon={AlertTriangle}
        />
        <StatCard
          label="ROE"
          valor={formatarPercentual(roe, { comSinal: false })}
          variacao={pontosVariacao(roe, valorDe(indicadoresAnterior, 'roe'))}
          formatoVariacao="pontos"
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="surface rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-sand-500 dark:text-sand-400">Saúde & Risco</p>
              <p className={`text-base font-semibold ${ZONA_COR[z.zona]}`}>
                {ZONA_LABEL[z.zona]} <span className="text-sand-400 dark:text-sand-500 font-normal text-sm">(Z''={z.valor.toFixed(2)})</span>
              </p>
            </div>
            <div className="h-8 w-px bg-sand-200 dark:bg-sand-700" />
            <div>
              <p className="text-xs text-sand-500 dark:text-sand-400">Alertas ativos</p>
              <p className="text-base font-semibold text-sand-900 dark:text-sand-50">{alertas.length}</p>
            </div>
          </div>
          <Link to="/app/analises/risco" className="text-sm font-medium text-clay-600 hover:text-clay-700 dark:text-clay-400 whitespace-nowrap">
            Ver análise de risco →
          </Link>
        </div>

        <div className="surface rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-sand-700 dark:text-sand-200">Próximos 3 meses (projeção)</h3>
            <Link to="/app/analises/previsao" className="text-xs font-medium text-clay-600 hover:text-clay-700 dark:text-clay-400 whitespace-nowrap">
              Ver previsão →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {forecastReceita.projecao.map((p, i) => (
              <div key={p.periodo} className="text-center">
                <p className="text-[11px] text-sand-500 dark:text-sand-400">{labelPeriodo(p.periodo)}</p>
                <p className="text-sm font-medium tabular-nums text-sand-800 dark:text-sand-100">{formatarMoeda(p.valor, { compacto: true })}</p>
                <p className="text-[11px] tabular-nums text-sand-500 dark:text-sand-400">
                  Lucro: {formatarMoeda(forecastLucro.projecao[i].valor, { compacto: true })}
                </p>
              </div>
            ))}
          </div>
        </div>
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
