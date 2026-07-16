// Blocos de carregamento on-brand — substituem o "piscar sem feedback"
// durante o setTimeout simulado do FiltroPeriodoRelatorio e cargas futuras.
export function SkeletonLine({ largura = 'w-full', altura = 'h-4', className = '' }) {
  return <div className={`${largura} ${altura} rounded bg-sand-150 dark:bg-sand-800 animate-pulse ${className}`} />;
}

export function SkeletonBlock({ altura = 'h-24', className = '' }) {
  return <div className={`w-full ${altura} rounded-xl bg-sand-150 dark:bg-sand-800 animate-pulse ${className}`} />;
}

export function SkeletonCard({ linhas = 3 }) {
  return (
    <div className="surface rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonLine largura="w-24" altura="h-3" />
        <SkeletonLine largura="w-4" altura="h-4" />
      </div>
      <SkeletonLine largura="w-32" altura="h-6" />
      {Array.from({ length: Math.max(0, linhas - 1) }).map((_, i) => (
        <SkeletonLine key={i} largura="w-full" altura="h-3" />
      ))}
    </div>
  );
}

export function SkeletonTable({ linhas = 6, colunas = 4 }) {
  return (
    <div className="surface rounded-xl p-4 space-y-2.5">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonLine largura="w-1/3" altura="h-3.5" />
          {Array.from({ length: colunas }).map((_, j) => (
            <SkeletonLine key={j} largura="flex-1" altura="h-3.5" />
          ))}
        </div>
      ))}
    </div>
  );
}
