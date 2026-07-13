import { PERIODOS, labelPeriodo } from '../data/constants';

export default function PeriodRangeSelector({ inicio, fim, onChange, apenasFim = false }) {
  function mudarInicio(e) {
    const novoInicio = e.target.value;
    onChange({ inicio: novoInicio, fim: novoInicio > fim ? novoInicio : fim });
  }
  function mudarFim(e) {
    const novoFim = e.target.value;
    onChange({ inicio: novoFim < inicio ? novoFim : inicio, fim: novoFim });
  }

  if (apenasFim) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-sand-500 dark:text-sand-400">Data-base</span>
        <select className="input !w-auto !py-1.5 text-sm" value={fim} onChange={mudarFim}>
          {PERIODOS.map((p) => (
            <option key={p} value={p}>{labelPeriodo(p)}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-sand-500 dark:text-sand-400">De</span>
      <select className="input !w-auto !py-1.5 text-sm" value={inicio} onChange={mudarInicio}>
        {PERIODOS.map((p) => (
          <option key={p} value={p}>{labelPeriodo(p)}</option>
        ))}
      </select>
      <span className="text-xs text-sand-500 dark:text-sand-400">até</span>
      <select className="input !w-auto !py-1.5 text-sm" value={fim} onChange={mudarFim}>
        {PERIODOS.map((p) => (
          <option key={p} value={p}>{labelPeriodo(p)}</option>
        ))}
      </select>
    </div>
  );
}
