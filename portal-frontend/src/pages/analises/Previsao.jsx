import { useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { serieMensal, calcularEBITDA, calcularFluxoCaixa } from '../../data/financeiro';
import { projetarSerie, detectarRupturaCaixa } from '../../data/previsao';
import { PERIODOS, labelPeriodo } from '../../data/constants';
import { usuarioPodeVerRelatorio } from '../../data/usuarios';
import { formatarMoeda } from '../../lib/format';
import { useChartTheme } from '../../lib/chartTheme';
import RequireAcesso from '../../components/RequireAcesso';

const METRICAS = [
  { chave: 'receita', nome: 'Receita Líquida', cor: '#D97757', serie: (ids) => serieMensal(ids, 'dre', 'subtotal-receita-liquida') },
  { chave: 'ebitda', nome: 'EBITDA', cor: '#446E8F', serie: (ids) => PERIODOS.map((periodo) => ({ periodo, valor: calcularEBITDA(ids, periodo) })) },
  { chave: 'lucroLiquido', nome: 'Lucro Líquido', cor: '#2E8365', serie: (ids) => serieMensal(ids, 'dre', 'total-lucro-liquido') },
  { chave: 'saldoCaixa', nome: 'Saldo de Caixa', cor: '#B08128', serie: (ids) => PERIODOS.map((periodo) => ({ periodo, valor: calcularFluxoCaixa(ids, periodo).saldoFinal })) },
];

const METODOS = [
  { chave: 'linear', nome: 'Regressão Linear' },
  { chave: 'mediaMovel', nome: 'Média Móvel (3m)' },
  { chave: 'cagr', nome: 'CAGR' },
];

function montarDados(historico, projecao) {
  const historicoAjustado = historico.map((p, i) => ({
    periodo: labelPeriodo(p.periodo),
    real: p.valor,
    projetado: i === historico.length - 1 ? p.valor : null,
    bandaBase: null,
    bandaAltura: null,
  }));
  const projecaoAjustada = projecao.map((p) => ({
    periodo: labelPeriodo(p.periodo),
    real: null,
    projetado: p.valor,
    bandaBase: p.min,
    bandaAltura: Math.max(0, p.max - p.min),
  }));
  return [...historicoAjustado, ...projecaoAjustada];
}

export default function Previsao() {
  const { usuarioAtual, empresaIdsEscopo, escopo, grupoAtual } = useApp();
  const permitido = usuarioPodeVerRelatorio(usuarioAtual, 'dre') && usuarioPodeVerRelatorio(usuarioAtual, 'fluxoCaixa');
  const { corGrade, corEixo, corCursor } = useChartTheme();

  const [metrica, setMetrica] = useState('receita');
  const [metodo, setMetodo] = useState('linear');
  const [horizonte, setHorizonte] = useState(6);

  const metricaAtual = METRICAS.find((m) => m.chave === metrica);

  const { historico, projecao } = useMemo(() => {
    const serieHistorica = metricaAtual.serie(empresaIdsEscopo);
    const { projecao: p } = projetarSerie(serieHistorica, { metodo, horizonte });
    return { historico: serieHistorica, projecao: p };
  }, [metricaAtual, empresaIdsEscopo, metodo, horizonte]);

  const dados = useMemo(() => montarDados(historico, projecao), [historico, projecao]);

  const ruptura = useMemo(() => detectarRupturaCaixa(empresaIdsEscopo, { metodo, horizonte }), [empresaIdsEscopo, metodo, horizonte]);

  const empresaAtual = grupoAtual?.empresas.find((e) => e.id === escopo.empresaId);
  const subtitulo = `${escopo.empresaId === 'todas' ? 'Todas as empresas' : empresaAtual?.nome} · projeção de ${horizonte} meses`;

  return (
    <RequireAcesso permitido={permitido}>
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-serif font-semibold text-sand-900 dark:text-sand-50">Previsão</h2>
          <p className="text-sm text-sand-500 dark:text-sand-400">{subtitulo}</p>
        </div>

        {ruptura && (
          <div className="flex items-start gap-2.5 rounded-lg p-3.5 bg-loss-50 dark:bg-loss-700/10">
            <AlertTriangle size={17} className="shrink-0 mt-0.5 text-loss-500 dark:text-loss-400" />
            <div>
              <p className="text-sm font-medium text-sand-800 dark:text-sand-100">Ruptura de caixa projetada</p>
              <p className="text-xs text-sand-500 dark:text-sand-400 mt-0.5">
                No método/horizonte selecionados, o saldo de caixa cruza zero em {labelPeriodo(ruptura.periodo)}, projetado em {formatarMoeda(ruptura.saldoProjetado, { compacto: true })}.
              </p>
            </div>
          </div>
        )}

        <div className="surface rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {METRICAS.map((m) => (
              <button
                key={m.chave}
                onClick={() => setMetrica(m.chave)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  metrica === m.chave
                    ? 'border-clay-400 bg-clay-50 text-clay-700 dark:bg-clay-700/15 dark:text-clay-300'
                    : 'border-sand-300 dark:border-sand-700 text-sand-600 dark:text-sand-300 hover:bg-sand-50 dark:hover:bg-sand-800'
                }`}
              >
                {m.nome}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-sand-150 dark:border-sand-800">
            <div>
              <label className="label !mb-1 !text-xs">Método</label>
              <select className="input !w-auto !py-2 text-sm" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                {METODOS.map((m) => <option key={m.chave} value={m.chave}>{m.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label !mb-1 !text-xs">Horizonte</label>
              <select className="input !w-auto !py-2 text-sm" value={horizonte} onChange={(e) => setHorizonte(Number(e.target.value))}>
                <option value={3}>3 meses</option>
                <option value={6}>6 meses</option>
                <option value={12}>12 meses</option>
              </select>
            </div>
          </div>
        </div>

        <div className="surface rounded-xl p-5">
          <h3 className="text-sm font-semibold text-sand-700 dark:text-sand-200 mb-4">{metricaAtual.nome} — histórico e projeção</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dados} margin={{ left: -12, right: 8, top: 4 }}>
                <CartesianGrid vertical={false} stroke={corGrade} strokeDasharray="3 3" />
                <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: corEixo }} axisLine={{ stroke: corGrade }} tickLine={false} />
                <YAxis tickFormatter={(v) => formatarMoeda(v, { compacto: true })} tick={{ fontSize: 11, fill: corEixo }} axisLine={false} tickLine={false} width={60} />
                <Tooltip
                  cursor={{ stroke: corCursor }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const real = payload.find((p) => p.dataKey === 'real')?.value;
                    const projetado = payload.find((p) => p.dataKey === 'projetado')?.value;
                    return (
                      <div className="surface rounded-lg px-3 py-2 text-xs">
                        <p className="font-medium text-sand-700 dark:text-sand-200 mb-1">{label}</p>
                        {real != null && <p className="tabular-nums text-sand-600 dark:text-sand-300">Realizado: {formatarMoeda(real, { compacto: true })}</p>}
                        {projetado != null && <p className="tabular-nums" style={{ color: metricaAtual.cor }}>Projetado: {formatarMoeda(projetado, { compacto: true })}</p>}
                      </div>
                    );
                  }}
                />
                <Area type="monotone" dataKey="bandaBase" stackId="banda" stroke="none" fill="transparent" isAnimationActive={false} />
                <Area type="monotone" dataKey="bandaAltura" stackId="banda" stroke="none" fill={metricaAtual.cor} fillOpacity={0.15} isAnimationActive={false} />
                <Line type="monotone" dataKey="real" stroke={metricaAtual.cor} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="projetado" stroke={metricaAtual.cor} strokeWidth={2.5} strokeDasharray="5 4" dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </RequireAcesso>
  );
}
