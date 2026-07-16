import { useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, AlertCircle, Info as InfoIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  calcularAltmanZ, calcularCovenants, calcularBreakEven, calcularConcentracao, calcularAlertas,
} from '../../data/risco';
import { calcularDRE, porId } from '../../data/financeiro';
import { detectarRupturaCaixa } from '../../data/previsao';
import { PERIODO_ATUAL, labelPeriodo } from '../../data/constants';
import { usuarioPodeVerRelatorio } from '../../data/usuarios';
import { formatarMoeda, formatarPercentual, formatarMultiplo } from '../../lib/format';
import { useChartTheme } from '../../lib/chartTheme';
import RequireAcesso from '../../components/RequireAcesso';
import PeriodRangeSelector from '../../components/PeriodRangeSelector';
import Gauge from '../../components/ui/Gauge';
import BulletBar from '../../components/ui/BulletBar';

const CORES_DONUT = ['#D97757', '#5C87AC', '#2E8365', '#B08128', '#B5503A', '#8B8371'];

const SEVERIDADE_CFG = {
  alta: { Icon: AlertTriangle, className: 'text-loss-500 dark:text-loss-400', bg: 'bg-loss-50 dark:bg-loss-700/10' },
  media: { Icon: AlertCircle, className: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-400/10' },
  baixa: { Icon: InfoIcon, className: 'text-info-500 dark:text-info-400', bg: 'bg-info-50 dark:bg-info-600/10' },
};

function ListaAlertas({ alertas }) {
  if (alertas.length === 0) {
    return <p className="text-sm text-sand-500 dark:text-sand-400">Nenhum alerta de risco no período selecionado.</p>;
  }
  return (
    <div className="space-y-2">
      {alertas.map((a, i) => {
        const cfg = SEVERIDADE_CFG[a.severidade] ?? SEVERIDADE_CFG.baixa;
        return (
          <div key={i} className={`flex items-start gap-2.5 rounded-lg p-3 ${cfg.bg}`}>
            <cfg.Icon size={16} className={`shrink-0 mt-0.5 ${cfg.className}`} />
            <div>
              <p className="text-sm font-medium text-sand-800 dark:text-sand-100">{a.titulo}</p>
              <p className="text-xs text-sand-500 dark:text-sand-400 mt-0.5">{a.detalhe}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BreakEvenChart({ breakEven }) {
  const { corGrade, corEixo, corCursor } = useChartTheme();
  const { receita, custosFixos, custosVariaveis, pontoEquilibrio } = breakEven;
  const custoVariavelUnitario = receita !== 0 ? custosVariaveis / receita : 0;
  const receitaMax = Math.max(receita, pontoEquilibrio ?? 0) * 1.4 || 1;

  const dados = Array.from({ length: 11 }, (_, i) => {
    const x = (receitaMax / 10) * i;
    return { receita: x, Receita: x, Custos: custosFixos + custoVariavelUnitario * x };
  });

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dados} margin={{ left: -12, right: 8, top: 4 }}>
          <CartesianGrid vertical={false} stroke={corGrade} strokeDasharray="3 3" />
          <XAxis dataKey="receita" tickFormatter={(v) => formatarMoeda(v, { compacto: true })} tick={{ fontSize: 11, fill: corEixo }} axisLine={{ stroke: corGrade }} tickLine={false} />
          <YAxis tickFormatter={(v) => formatarMoeda(v, { compacto: true })} tick={{ fontSize: 11, fill: corEixo }} axisLine={false} tickLine={false} width={56} />
          <Tooltip
            cursor={{ stroke: corCursor }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="surface rounded-lg px-3 py-2 text-xs">
                  <p className="text-sand-500 dark:text-sand-400 mb-1">Receita: {formatarMoeda(label, { compacto: true })}</p>
                  {payload.map((p) => <p key={p.dataKey} style={{ color: p.color }} className="tabular-nums">{p.name}: {formatarMoeda(p.value, { compacto: true })}</p>)}
                </div>
              );
            }}
          />
          <Line type="monotone" dataKey="Receita" stroke="#2E8365" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Custos" stroke="#B5503A" strokeWidth={2} dot={false} />
          {pontoEquilibrio != null && (
            <ReferenceDot x={pontoEquilibrio} y={custosFixos + custoVariavelUnitario * pontoEquilibrio} r={5} fill="#D97757" stroke="white" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SimuladorWhatIf({ empresaIdsEscopo, periodo }) {
  const [deltaReceita, setDeltaReceita] = useState(0);
  const [deltaCusto, setDeltaCusto] = useState(0);

  const simulacao = useMemo(() => {
    const dre = calcularDRE(empresaIdsEscopo, periodo);
    const receitaBase = porId(dre, 'subtotal-receita-liquida').valor;
    const custosBase = -(porId(dre, 'cmv').valor + porId(dre, 'despesas-operacionais').valor);
    const ebitBase = porId(dre, 'subtotal-ebit').valor;
    const ebitdaBase = porId(dre, 'subtotal-ebitda').valor;
    const resultadoFinanceiro = porId(dre, 'resultado-financeiro').valor;
    const lairBase = porId(dre, 'subtotal-lair').valor;
    const impostos = -porId(dre, 'impostos-lucro').valor;
    const taxaEfetiva = lairBase > 0 ? impostos / lairBase : 0.34;
    const daConstante = ebitdaBase - ebitBase;
    const despesasFinanceiras = -(porId(dre, 'resultado-financeiro').contas?.find((c) => c.id === 'despesas-financeiras')?.valor ?? 0);

    const receita = receitaBase * (1 + deltaReceita / 100);
    const custos = custosBase * (1 + deltaCusto / 100);
    const ebit = receita - custos;
    const lair = ebit + resultadoFinanceiro;
    const lucro = lair * (1 - taxaEfetiva);
    const ebitda = ebit + daConstante;
    const margem = receita !== 0 ? lucro / receita : 0;
    const margemBase = receitaBase !== 0 ? porId(dre, 'total-lucro-liquido').valor / receitaBase : 0;
    const coberturaJuros = despesasFinanceiras > 0 ? ebit / despesasFinanceiras : null;

    return {
      lucro, lucroBase: porId(dre, 'total-lucro-liquido').valor,
      margem, margemBase,
      ebitda, ebitdaBase,
      coberturaJuros,
    };
  }, [empresaIdsEscopo, periodo, deltaReceita, deltaCusto]);

  const deltaLucro = simulacao.lucroBase !== 0 ? (simulacao.lucro - simulacao.lucroBase) / Math.abs(simulacao.lucroBase) : null;

  return (
    <div className="surface rounded-xl p-5">
      <h3 className="text-sm font-semibold text-sand-700 dark:text-sand-200 mb-1">Simulador what-if</h3>
      <p className="text-xs text-sand-500 dark:text-sand-400 mb-4">Ajuste os sliders para ver o impacto imediato no resultado — não altera dados reais.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-sand-600 dark:text-sand-300">Receita</span>
            <span className="tabular-nums font-medium text-sand-800 dark:text-sand-100">{deltaReceita > 0 ? '+' : ''}{deltaReceita}%</span>
          </div>
          <input type="range" min={-30} max={30} value={deltaReceita} onChange={(e) => setDeltaReceita(Number(e.target.value))} className="w-full accent-clay-500" />
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-sand-600 dark:text-sand-300">Custos (CMV + Desp. Operacionais)</span>
            <span className="tabular-nums font-medium text-sand-800 dark:text-sand-100">{deltaCusto > 0 ? '+' : ''}{deltaCusto}%</span>
          </div>
          <input type="range" min={-30} max={30} value={deltaCusto} onChange={(e) => setDeltaCusto(Number(e.target.value))} className="w-full accent-clay-500" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-sand-200 dark:border-sand-700 p-3">
          <p className="text-[11px] text-sand-500 dark:text-sand-400">Lucro Líquido simulado</p>
          <p className="text-base font-semibold tabular-nums text-sand-900 dark:text-sand-50">{formatarMoeda(simulacao.lucro, { compacto: true })}</p>
          {deltaLucro !== null && <p className={`text-[11px] tabular-nums ${deltaLucro >= 0 ? 'text-gain-600 dark:text-gain-400' : 'text-loss-500 dark:text-loss-400'}`}>{formatarPercentual(deltaLucro)} vs. real</p>}
        </div>
        <div className="rounded-lg border border-sand-200 dark:border-sand-700 p-3">
          <p className="text-[11px] text-sand-500 dark:text-sand-400">Margem Líquida simulada</p>
          <p className="text-base font-semibold tabular-nums text-sand-900 dark:text-sand-50">{formatarPercentual(simulacao.margem, { comSinal: false })}</p>
        </div>
        <div className="rounded-lg border border-sand-200 dark:border-sand-700 p-3">
          <p className="text-[11px] text-sand-500 dark:text-sand-400">EBITDA simulado</p>
          <p className="text-base font-semibold tabular-nums text-sand-900 dark:text-sand-50">{formatarMoeda(simulacao.ebitda, { compacto: true })}</p>
        </div>
        <div className="rounded-lg border border-sand-200 dark:border-sand-700 p-3">
          <p className="text-[11px] text-sand-500 dark:text-sand-400">Cobertura de Juros simulada</p>
          <p className="text-base font-semibold tabular-nums text-sand-900 dark:text-sand-50">{simulacao.coberturaJuros != null ? formatarMultiplo(simulacao.coberturaJuros) : '—'}</p>
        </div>
      </div>
    </div>
  );
}

export default function AnaliseRisco() {
  const { usuarioAtual, empresaIdsEscopo, escopo, grupoAtual } = useApp();
  const [periodo, setPeriodo] = useState(PERIODO_ATUAL);
  const permitido = usuarioPodeVerRelatorio(usuarioAtual, 'dre') && usuarioPodeVerRelatorio(usuarioAtual, 'balanco');

  const z = useMemo(() => calcularAltmanZ(empresaIdsEscopo, periodo), [empresaIdsEscopo, periodo]);
  const covenants = useMemo(() => calcularCovenants(empresaIdsEscopo, periodo), [empresaIdsEscopo, periodo]);
  const breakEven = useMemo(() => calcularBreakEven(empresaIdsEscopo, periodo), [empresaIdsEscopo, periodo]);
  const concentracao = useMemo(
    () => (grupoAtual && grupoAtual.empresas.length > 1 ? calcularConcentracao(grupoAtual.empresas, periodo) : null),
    [grupoAtual, periodo]
  );
  const alertas = useMemo(() => {
    const base = calcularAlertas(empresaIdsEscopo, periodo);
    const ruptura = detectarRupturaCaixa(empresaIdsEscopo, { horizonte: 6 });
    if (!ruptura) return base;
    return [
      { severidade: ruptura.mesesAteRuptura <= 3 ? 'alta' : 'media', titulo: 'Ruptura de caixa projetada', detalhe: `Projeção aponta saldo negativo em ${labelPeriodo(ruptura.periodo)} (${formatarMoeda(ruptura.saldoProjetado, { compacto: true })}).` },
      ...base,
    ];
  }, [empresaIdsEscopo, periodo]);

  const empresaAtual = grupoAtual?.empresas.find((e) => e.id === escopo.empresaId);
  const subtitulo = `${escopo.empresaId === 'todas' ? 'Todas as empresas' : empresaAtual?.nome} · ${labelPeriodo(periodo)}`;

  return (
    <RequireAcesso permitido={permitido}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-serif font-semibold text-sand-900 dark:text-sand-50">Análise de Risco</h2>
            <p className="text-sm text-sand-500 dark:text-sand-400">{subtitulo}</p>
          </div>
          <PeriodRangeSelector fim={periodo} inicio={periodo} apenasFim onChange={({ fim }) => setPeriodo(fim)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="surface rounded-xl p-5 flex flex-col items-center">
            <h3 className="text-sm font-semibold text-sand-700 dark:text-sand-200 mb-3 self-start">Altman Z''-Score</h3>
            <Gauge
              valor={z.valor}
              min={-2}
              max={8}
              zonas={[{ ate: 1.1, status: 'ruim' }, { ate: 2.6, status: 'atencao' }, { ate: 8, status: 'bom' }]}
              formatarValor={(v) => v.toFixed(2)}
              rotulo={z.zona === 'seguro' ? 'Zona segura' : z.zona === 'cinza' ? 'Zona cinza (atenção)' : 'Zona de perigo'}
            />
          </div>

          <div className="surface rounded-xl p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-sand-700 dark:text-sand-200 mb-4">Monitores de Covenant</h3>
            <div className="space-y-4">
              {covenants.map((c) => (
                <BulletBar
                  key={c.chave}
                  rotulo={c.nome}
                  valor={c.valor ?? 0}
                  limite={c.limite}
                  status={c.status}
                  formatarValor={(v) => formatarMultiplo(v)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="surface rounded-xl p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-sand-700 dark:text-sand-200 mb-1">Ponto de Equilíbrio</h3>
            <p className="text-xs text-sand-500 dark:text-sand-400 mb-3">
              Margem de segurança: <span className="font-medium text-sand-700 dark:text-sand-200">{breakEven.margemSeguranca != null ? formatarPercentual(breakEven.margemSeguranca, { comSinal: false }) : '—'}</span>
              {' · '}GAO {breakEven.gao != null ? formatarMultiplo(breakEven.gao) : '—'} · GAF {breakEven.gaf != null ? formatarMultiplo(breakEven.gaf) : '—'} · GAC {breakEven.gac != null ? formatarMultiplo(breakEven.gac) : '—'}
            </p>
            <BreakEvenChart breakEven={breakEven} />
          </div>

          <div className="surface rounded-xl p-5">
            <h3 className="text-sm font-semibold text-sand-700 dark:text-sand-200 mb-4">Alertas</h3>
            <ListaAlertas alertas={alertas} />
          </div>
        </div>

        {concentracao && (
          <div className="surface rounded-xl p-5">
            <h3 className="text-sm font-semibold text-sand-700 dark:text-sand-200 mb-1">Concentração no Grupo</h3>
            <p className="text-xs text-sand-500 dark:text-sand-400 mb-3">
              HHI de receita: <span className="font-medium text-sand-700 dark:text-sand-200">{concentracao.hhiReceita.toFixed(0)}</span>
              {concentracao.hhiReceita > 2500 ? ' — alta concentração' : concentracao.hhiReceita > 1500 ? ' — concentração moderada' : ' — pouco concentrado'}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="h-52 w-52 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={concentracao.itens} dataKey="shareReceita" nameKey="nome" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {concentracao.itens.map((item, i) => <Cell key={item.empresaId} fill={CORES_DONUT[i % CORES_DONUT.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatarPercentual(v, { comSinal: false })} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 w-full space-y-1.5">
                {concentracao.itens.map((item, i) => (
                  <div key={item.empresaId} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-sand-600 dark:text-sand-300">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CORES_DONUT[i % CORES_DONUT.length] }} />
                      {item.nome}
                    </span>
                    <span className="tabular-nums text-sand-500 dark:text-sand-400">{formatarPercentual(item.shareReceita, { comSinal: false })}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <SimuladorWhatIf empresaIdsEscopo={empresaIdsEscopo} periodo={periodo} />
      </div>
    </RequireAcesso>
  );
}
