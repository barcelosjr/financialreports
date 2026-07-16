const COR_STATUS = {
  bom: 'bg-gain-500',
  atencao: 'bg-amber-500',
  ruim: 'bg-loss-500',
};

// Barra "bullet graph": valor atual vs. limite/meta numa escala 0..max.
// Usada para covenants (valor vs. limite) e margens/indicadores vs. meta.
export default function BulletBar({
  valor, limite, max, status = 'bom', rotulo, formatarValor = (v) => v, invertido = false,
}) {
  const escala = max ?? (Math.max(valor, limite) * 1.25 || 1);
  const pctValor = Math.min(100, Math.max(0, (valor / escala) * 100));
  const pctLimite = Math.min(100, Math.max(0, (limite / escala) * 100));

  return (
    <div className="space-y-1">
      {rotulo && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-sand-600 dark:text-sand-300">{rotulo}</span>
          <span className="tabular-nums text-sand-500 dark:text-sand-400">
            {formatarValor(valor)} <span className="text-sand-400 dark:text-sand-500">/ {formatarValor(limite)}</span>
          </span>
        </div>
      )}
      <div className="relative h-3 rounded-full bg-sand-150 dark:bg-sand-800 overflow-hidden">
        <div className={`absolute inset-y-0 left-0 rounded-full ${COR_STATUS[status] ?? COR_STATUS.bom}`} style={{ width: `${pctValor}%` }} />
        <div
          className="absolute inset-y-0 w-0.5 bg-sand-800 dark:bg-sand-100"
          style={{ left: `${pctLimite}%` }}
          title={`${invertido ? 'Mínimo' : 'Limite'}: ${formatarValor(limite)}`}
        />
      </div>
    </div>
  );
}
