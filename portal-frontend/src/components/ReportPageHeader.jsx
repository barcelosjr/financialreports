import { FileDown, Sheet } from 'lucide-react';

const STATUS_COR = {
  bom: 'text-gain-600 dark:text-gain-400',
  atencao: 'text-amber-600 dark:text-amber-400',
  ruim: 'text-loss-500 dark:text-loss-400',
  neutro: 'text-sand-800 dark:text-sand-100',
};

// Faixa opcional de indicadores-resumo (ex: margens na DRE, liquidez no
// Balanço, geração de caixa no Fluxo) — cada item: { label, valor, status? }.
function FaixaIndicadores({ indicadores }) {
  if (!indicadores || indicadores.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-1">
      {indicadores.map((ind) => (
        <div key={ind.label} className="flex items-baseline gap-1.5">
          <span className="text-xs text-sand-500 dark:text-sand-400">{ind.label}</span>
          <span className={`text-sm font-semibold tabular-nums ${STATUS_COR[ind.status] ?? STATUS_COR.neutro}`}>{ind.valor}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportPageHeader({ titulo, subtitulo, indicadores }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-serif font-semibold text-sand-900 dark:text-sand-50">{titulo}</h2>
          <p className="text-sm text-sand-500 dark:text-sand-400">{subtitulo}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-secondary !px-3 !py-2" disabled title="Exportação será habilitada na integração final">
            <FileDown size={15} /> PDF
          </button>
          <button className="btn-secondary !px-3 !py-2" disabled title="Exportação será habilitada na integração final">
            <Sheet size={15} /> Excel
          </button>
        </div>
      </div>
      <FaixaIndicadores indicadores={indicadores} />
    </div>
  );
}
