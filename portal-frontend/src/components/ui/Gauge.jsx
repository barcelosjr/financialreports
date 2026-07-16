const COR_ZONA = {
  bom: '#2E8365',
  atencao: '#B08128',
  ruim: '#B5503A',
};

function polar(cx, cy, r, anguloDeg) {
  const rad = (anguloDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function arcoPath(cx, cy, r, anguloInicio, anguloFim) {
  const inicio = polar(cx, cy, r, anguloInicio);
  const fim = polar(cx, cy, r, anguloFim);
  const largeArc = Math.abs(anguloInicio - anguloFim) > 180 ? 1 : 0;
  return `M ${inicio.x} ${inicio.y} A ${r} ${r} 0 ${largeArc} 1 ${fim.x} ${fim.y}`;
}

// Gauge semicircular com zonas coloridas (bom/atenção/ruim) e ponteiro na
// posição do valor atual. `zonas`: [{ ate, status }] em ordem crescente de
// `ate` (limite superior da zona, na escala min..max); a última zona vai
// implicitamente até `max`.
export default function Gauge({ valor, min = 0, max = 100, zonas = [], tamanho = 140, rotulo, formatarValor }) {
  const largura = tamanho;
  const altura = tamanho * 0.62;
  const cx = largura / 2;
  const cy = altura - 4;
  const r = tamanho / 2 - 10;

  const escala = max - min || 1;
  const fracDe = (v) => Math.min(1, Math.max(0, (v - min) / escala));
  const anguloDe = (v) => 180 - fracDe(v) * 180;

  const limites = [min, ...zonas.map((z) => z.ate), max];
  const segmentos = zonas.map((zona, i) => ({
    inicio: limites[i],
    fim: limites[i + 1] ?? max,
    status: zona.status,
  }));

  const anguloValor = anguloDe(valor);
  const ponteiro = polar(cx, cy, r - 4, anguloValor);

  return (
    <div className="flex flex-col items-center" style={{ width: largura }}>
      <svg width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`}>
        {segmentos.map((seg, i) => (
          <path
            key={i}
            d={arcoPath(cx, cy, r, anguloDe(seg.inicio), anguloDe(seg.fim))}
            fill="none"
            stroke={COR_ZONA[seg.status] ?? '#B0A891'}
            strokeWidth={10}
            strokeLinecap="butt"
          />
        ))}
        <line x1={cx} y1={cy} x2={ponteiro.x} y2={ponteiro.y} stroke="currentColor" className="text-sand-800 dark:text-sand-100" strokeWidth={2} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={3.5} fill="currentColor" className="text-sand-800 dark:text-sand-100" />
      </svg>
      <span className="text-lg font-semibold tabular-nums text-sand-900 dark:text-sand-50 -mt-1">
        {formatarValor ? formatarValor(valor) : valor}
      </span>
      {rotulo && <span className="text-[11px] text-sand-500 dark:text-sand-400 text-center">{rotulo}</span>}
    </div>
  );
}
