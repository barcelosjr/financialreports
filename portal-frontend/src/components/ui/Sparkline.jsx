import { ResponsiveContainer, LineChart, Line } from 'recharts';

const COR_STATUS = {
  bom: '#2E8365',
  atencao: '#B08128',
  ruim: '#B5503A',
  neutro: '#8B8371',
};

// Mini-série de tendência para cards de indicador e linhas de tabela.
// `valores`: array de números (ordem cronológica).
export default function Sparkline({ valores, status = 'neutro', altura = 32, largura = 80 }) {
  if (!valores || valores.length < 2) return <div style={{ width: largura, height: altura }} />;
  const dados = valores.map((valor, i) => ({ i, valor }));
  const cor = COR_STATUS[status] ?? COR_STATUS.neutro;

  return (
    <div style={{ width: largura, height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dados} margin={{ top: 2, bottom: 2, left: 2, right: 2 }}>
          <Line type="monotone" dataKey="valor" stroke={cor} strokeWidth={1.75} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
