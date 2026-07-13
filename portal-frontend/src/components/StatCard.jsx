import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatarPercentual, formatarPontosPercentuais } from '../lib/format';

export default function StatCard({
  label, valor, variacao, variacaoInvertida = false, formatoVariacao = 'percentual', icon: Icon, destaque = false,
}) {
  const temVariacao = variacao !== null && variacao !== undefined;
  const positiva = temVariacao && (variacaoInvertida ? variacao < 0 : variacao > 0);
  const negativa = temVariacao && (variacaoInvertida ? variacao > 0 : variacao < 0);
  const formatar = formatoVariacao === 'pontos' ? formatarPontosPercentuais : formatarPercentual;

  return (
    <div className={`surface rounded-xl p-4 ${destaque ? 'ring-1 ring-clay-300/60 dark:ring-clay-700/60' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-sand-500 dark:text-sand-400">{label}</span>
        {Icon && <Icon size={16} className="text-sand-400" />}
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-2xl font-semibold tabular-nums text-sand-900 dark:text-sand-50">{valor}</span>
        {temVariacao && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium whitespace-nowrap ${
              positiva ? 'text-gain-600 dark:text-gain-400' : negativa ? 'text-loss-500 dark:text-loss-400' : 'text-sand-400'
            }`}
          >
            {positiva && <TrendingUp size={13} />}
            {negativa && <TrendingDown size={13} />}
            {formatar(variacao)}
          </span>
        )}
      </div>
      {temVariacao && (
        <p className="mt-1 text-[10px] text-sand-400 dark:text-sand-500">vs. mês anterior</p>
      )}
    </div>
  );
}
