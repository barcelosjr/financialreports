import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { calcularIndicadores, serieIndicador } from '../../data/indicadores';
import { PERIODO_ATUAL, labelPeriodo } from '../../data/constants';
import { usuarioPodeVerRelatorio } from '../../data/usuarios';
import { formatarIndice, formatarMultiplo, formatarDias, formatarPercentual, formatarMoeda } from '../../lib/format';
import RequireAcesso from '../../components/RequireAcesso';
import PeriodRangeSelector from '../../components/PeriodRangeSelector';
import Sparkline from '../../components/ui/Sparkline';
import BulletBar from '../../components/ui/BulletBar';

const UNIDADE_FORMATADOR = {
  x: formatarMultiplo,
  '%': (v) => formatarPercentual(v, { comSinal: false }),
  dias: formatarDias,
  'R$': (v) => formatarMoeda(v, { compacto: true }),
};

const STATUS_COR = {
  bom: 'text-gain-600 dark:text-gain-400',
  atencao: 'text-amber-600 dark:text-amber-400',
  ruim: 'text-loss-500 dark:text-loss-400',
  neutro: 'text-sand-800 dark:text-sand-100',
};

function IndicadorCard({ indicador, serie }) {
  const formatar = UNIDADE_FORMATADOR[indicador.unidade] ?? formatarIndice;
  const faixa = indicador.faixaSaudavel;

  return (
    <div className="surface rounded-xl p-4 group relative">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-sand-500 dark:text-sand-400">{indicador.nome}</span>
        <Info size={13} className="text-sand-300 dark:text-sand-600 shrink-0" />
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <span className={`text-xl font-semibold tabular-nums ${STATUS_COR[indicador.status]}`}>{formatar(indicador.valor)}</span>
        <Sparkline valores={serie} status={indicador.status} />
      </div>
      {faixa && (
        <div className="mt-2.5">
          <BulletBar
            valor={Math.abs(indicador.valor ?? 0)}
            limite={faixa.bom}
            max={Math.max(Math.abs(indicador.valor ?? 0), faixa.bom, faixa.atencao) * 1.3 || 1}
            status={indicador.status}
            formatarValor={formatar}
          />
        </div>
      )}
      <div className="absolute z-20 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity top-full left-0 mt-1 w-64 surface rounded-lg p-3 text-xs shadow-[var(--shadow-popover)]">
        <p className="font-medium text-sand-700 dark:text-sand-200 mb-1">{indicador.formula}</p>
        <p className="text-sand-500 dark:text-sand-400">{indicador.interpretacao}</p>
      </div>
    </div>
  );
}

function DuPontDiagrama({ grupo }) {
  if (!grupo) return null;
  const margem = grupo.indicadores.find((i) => i.nome === 'Margem Líquida (DuPont)');
  const giro = grupo.indicadores.find((i) => i.nome === 'Giro do Ativo (DuPont)');
  const multiplicador = grupo.indicadores.find((i) => i.nome === 'Multiplicador de PL (DuPont)');
  const roe = grupo.indicadores.find((i) => i.nome === 'ROE Decomposto');
  const fatores = [
    { ind: margem, formatar: (v) => formatarPercentual(v, { comSinal: false }) },
    { ind: giro, formatar: formatarMultiplo },
    { ind: multiplicador, formatar: formatarMultiplo },
  ];

  return (
    <div className="surface rounded-xl p-5">
      <h3 className="text-sm font-semibold text-sand-700 dark:text-sand-200 mb-1">Decomposição DuPont</h3>
      <p className="text-xs text-sand-500 dark:text-sand-400 mb-4">De onde vem o ROE — margem, eficiência no uso do ativo e alavancagem.</p>
      <div className="flex flex-wrap items-center gap-3">
        {fatores.map(({ ind, formatar }, i) => (
          <div key={ind.chave} className="flex items-center gap-3">
            <div className="rounded-lg border border-sand-200 dark:border-sand-700 px-4 py-3 text-center min-w-[120px]">
              <p className="text-[11px] text-sand-500 dark:text-sand-400">{ind.nome.replace(' (DuPont)', '')}</p>
              <p className="text-lg font-semibold tabular-nums text-sand-900 dark:text-sand-50">{formatar(ind.valor)}</p>
            </div>
            {i < fatores.length - 1 && <span className="text-sand-400 text-lg shrink-0">×</span>}
          </div>
        ))}
        <span className="text-sand-400 text-lg shrink-0">=</span>
        <div className="rounded-lg bg-clay-50 dark:bg-clay-700/15 border border-clay-300/60 dark:border-clay-700/60 px-4 py-3 text-center min-w-[120px]">
          <p className="text-[11px] text-clay-600 dark:text-clay-400">ROE</p>
          <p className="text-lg font-semibold tabular-nums text-clay-700 dark:text-clay-300">{formatarPercentual(roe.valor, { comSinal: false })}</p>
        </div>
      </div>
    </div>
  );
}

export default function Indicadores() {
  const { usuarioAtual, empresaIdsEscopo, escopo, grupoAtual } = useApp();
  const [periodo, setPeriodo] = useState(PERIODO_ATUAL);
  const permitido = usuarioPodeVerRelatorio(usuarioAtual, 'dre') && usuarioPodeVerRelatorio(usuarioAtual, 'balanco');

  const grupos = useMemo(() => calcularIndicadores(empresaIdsEscopo, periodo), [empresaIdsEscopo, periodo]);
  const series = useMemo(() => {
    const mapa = new Map();
    for (const grupo of grupos) {
      for (const ind of grupo.indicadores) {
        if (!mapa.has(ind.chave)) mapa.set(ind.chave, serieIndicador(empresaIdsEscopo, ind.chave).map((p) => p.valor));
      }
    }
    return mapa;
  }, [grupos, empresaIdsEscopo]);

  const empresaAtual = grupoAtual?.empresas.find((e) => e.id === escopo.empresaId);
  const subtitulo = `${escopo.empresaId === 'todas' ? 'Todas as empresas' : empresaAtual?.nome} · ${labelPeriodo(periodo)}`;

  return (
    <RequireAcesso permitido={permitido}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-serif font-semibold text-sand-900 dark:text-sand-50">Indicadores Financeiros</h2>
            <p className="text-sm text-sand-500 dark:text-sand-400">{subtitulo}</p>
          </div>
          <PeriodRangeSelector fim={periodo} inicio={periodo} apenasFim onChange={({ fim }) => setPeriodo(fim)} />
        </div>

        {grupos.filter((g) => g.chave !== 'dupont').map((grupo) => (
          <div key={grupo.chave}>
            <h3 className="text-sm font-semibold text-sand-700 dark:text-sand-200 mb-3">{grupo.nome}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {grupo.indicadores.map((ind) => (
                <IndicadorCard key={ind.chave} indicador={ind} serie={series.get(ind.chave)} />
              ))}
            </div>
          </div>
        ))}

        <DuPontDiagrama grupo={grupos.find((g) => g.chave === 'dupont')} />
      </div>
    </RequireAcesso>
  );
}
