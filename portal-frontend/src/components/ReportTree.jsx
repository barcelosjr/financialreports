import { Fragment, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { formatarMoeda, formatarPercentual } from '../lib/format';
import { labelPeriodo } from '../data/constants';

// Fundo sólido por tipo de linha, aplicado em TODAS as células (inclusive na
// primeira, que é sticky). Manter o fundo nas células — e não no <tr> — é o
// que permite fixar a coluna de contas sem "vazar" o conteúdo por baixo ao
// rolar na horizontal.
const BG_LINHA = {
  bloco: 'bg-white dark:bg-sand-900',
  conta: 'bg-sand-50 dark:bg-sand-900',
  subtotal: 'bg-sand-100 dark:bg-sand-800',
  total: 'bg-clay-50 dark:bg-clay-900/50',
};

function corValor(valor, tipo) {
  if (tipo === 'total') return valor < 0 ? 'text-loss-600 dark:text-loss-400' : 'text-clay-700 dark:text-clay-300';
  if (valor < 0) return 'text-loss-500 dark:text-loss-400';
  return 'text-sand-800 dark:text-sand-100';
}

function celulasPorPeriodo({ valoresPorPeriodo, ahPorPeriodo, avPorPeriodo, media, tipo, opcoes, negrito, bg }) {
  const celulas = valoresPorPeriodo.flatMap((v, k) => {
    const grupo = [
      <td
        key={`v-${k}`}
        className={`py-2.5 pr-3 pl-3 text-right text-sm tabular-nums whitespace-nowrap ${bg} ${negrito ? 'font-medium' : ''} ${corValor(v, tipo)} ${
          k > 0 ? 'border-l border-sand-100 dark:border-sand-800/60' : ''
        }`}
      >
        {formatarMoeda(v)}
      </td>,
    ];
    if (opcoes.ah) {
      const ah = ahPorPeriodo?.[k];
      grupo.push(
        <td key={`ah-${k}`} className={`py-2.5 pr-3 text-right text-xs tabular-nums whitespace-nowrap text-sand-500 dark:text-sand-400 ${bg}`}>
          {ah === null || ah === undefined ? '—' : formatarPercentual(ah)}
        </td>
      );
    }
    if (opcoes.av) {
      const av = avPorPeriodo?.[k];
      grupo.push(
        <td key={`av-${k}`} className={`py-2.5 pr-3 text-right text-xs tabular-nums whitespace-nowrap text-sand-500 dark:text-sand-400 ${bg}`}>
          {av === null || av === undefined ? '—' : formatarPercentual(av, { comSinal: false })}
        </td>
      );
    }
    return grupo;
  });

  if (opcoes.media) {
    celulas.push(
      <td
        key="media"
        className={`py-2.5 pr-3 pl-3 text-right text-sm tabular-nums whitespace-nowrap ${bg} ${negrito ? 'font-medium' : ''} border-l-2 border-sand-200 dark:border-sand-700 ${corValor(media, tipo)}`}
      >
        {formatarMoeda(media)}
      </td>
    );
  }

  return celulas;
}

function LinhaBloco({ linha, opcoes, expandido, onToggle }) {
  const temFilhos = linha.contas && linha.contas.length > 0;
  const bg = BG_LINHA.bloco;
  const bgConta = BG_LINHA.conta;
  return (
    <>
      <tr
        className={`border-t border-sand-150 dark:border-sand-800 ${temFilhos ? 'cursor-pointer' : ''}`}
        onClick={temFilhos ? onToggle : undefined}
      >
        <td className={`sticky left-0 z-10 py-2.5 pl-2 pr-3 ${bg}`}>
          <div className="flex items-center gap-1.5">
            {temFilhos ? (
              <ChevronRight size={14} className={`text-sand-400 shrink-0 transition-transform ${expandido ? 'rotate-90' : ''}`} />
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            <span className="text-sm font-medium text-sand-800 dark:text-sand-100 whitespace-nowrap">{linha.nome}</span>
          </div>
        </td>
        {celulasPorPeriodo({ ...linha, tipo: linha.tipo, opcoes, negrito: true, bg })}
      </tr>
      {temFilhos && expandido && linha.contas.map((conta) => (
        <tr key={conta.id}>
          <td className={`sticky left-0 z-10 py-2 pl-10 pr-3 text-sm text-sand-500 dark:text-sand-400 whitespace-nowrap ${bgConta}`}>{conta.nome}</td>
          {celulasPorPeriodo({ ...conta, tipo: 'conta', opcoes, negrito: false, bg: bgConta })}
        </tr>
      ))}
    </>
  );
}

function LinhaSubtotal({ linha, opcoes }) {
  const ehTotal = linha.tipo === 'total';
  const bg = ehTotal ? BG_LINHA.total : BG_LINHA.subtotal;
  return (
    <tr className={ehTotal ? 'border-y-2 border-clay-300/60 dark:border-clay-700/50' : 'border-t border-sand-200 dark:border-sand-700'}>
      <td className={`sticky left-0 z-10 py-2.5 pl-2 pr-3 ${bg}`}>
        <span className={`text-sm font-semibold whitespace-nowrap ${ehTotal ? 'text-clay-800 dark:text-clay-200' : 'text-sand-700 dark:text-sand-200'}`}>
          {linha.nome}
        </span>
      </td>
      {celulasPorPeriodo({ ...linha, opcoes, negrito: true, bg })}
    </tr>
  );
}

export default function ReportTree({ linhas, periodos, rotulos = null, opcoes = { media: false, ah: false, av: false }, colunaNome = 'Conta' }) {
  const [expandidos, setExpandidos] = useState(() => new Set(linhas.filter((l) => l.tipo === 'bloco').map((l) => l.id)));

  const rotuloDe = (k) => rotulos?.[k] ?? labelPeriodo(periodos[k]);

  function toggle(id) {
    setExpandidos((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const todosIds = linhas.filter((l) => l.tipo === 'bloco').map((l) => l.id);
  const tudoExpandido = todosIds.every((id) => expandidos.has(id));

  const subColsPorPeriodo = 1 + (opcoes.ah ? 1 : 0) + (opcoes.av ? 1 : 0);
  const precisaAgrupar = subColsPorPeriodo > 1;

  // Cabeçalho: primeira coluna também sticky, com fundo da superfície para
  // cobrir o conteúdo ao rolar na horizontal.
  const thConta = 'sticky left-0 z-20 bg-white dark:bg-sand-900';

  return (
    <div className="surface rounded-xl overflow-x-auto">
      <div className="flex items-center justify-end px-4 pt-3">
        <button
          className="text-xs font-medium text-clay-600 dark:text-clay-400 hover:text-clay-700"
          onClick={() => setExpandidos(tudoExpandido ? new Set() : new Set(todosIds))}
        >
          {tudoExpandido ? 'Recolher tudo' : 'Expandir tudo'}
        </button>
      </div>
      <table className="w-full min-w-max">
        <thead>
          {precisaAgrupar ? (
            <>
              <tr>
                <th rowSpan={2} className={`${thConta} text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pl-2 pr-3 align-bottom`}>
                  {colunaNome}
                </th>
                {periodos.map((p, k) => (
                  <th
                    key={p}
                    colSpan={subColsPorPeriodo}
                    className={`text-center text-xs font-semibold text-sand-500 dark:text-sand-400 py-2 ${k > 0 ? 'border-l border-sand-150 dark:border-sand-800' : ''}`}
                  >
                    {rotuloDe(k)}
                  </th>
                ))}
                {opcoes.media && <th rowSpan={2} className="text-right text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pr-3 align-bottom border-l-2 border-sand-200 dark:border-sand-700">Média</th>}
              </tr>
              <tr>
                {periodos.map((p) => (
                  <Fragment key={p}>
                    <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-sand-400 py-1.5 pr-3 border-l border-sand-100 dark:border-sand-800/60">Valor</th>
                    {opcoes.ah && <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-sand-400 py-1.5 pr-3">AH</th>}
                    {opcoes.av && <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-sand-400 py-1.5 pr-3">AV</th>}
                  </Fragment>
                ))}
              </tr>
            </>
          ) : (
            <tr>
              <th className={`${thConta} text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pl-2 pr-3`}>{colunaNome}</th>
              {periodos.map((p, k) => (
                <th
                  key={p}
                  className={`text-right text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pr-3 ${k > 0 ? 'border-l border-sand-100 dark:border-sand-800/60' : ''}`}
                >
                  {rotuloDe(k)}
                </th>
              ))}
              {opcoes.media && <th className="text-right text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pr-3 border-l-2 border-sand-200 dark:border-sand-700">Média</th>}
            </tr>
          )}
        </thead>
        <tbody>
          {linhas.map((linha) =>
            linha.tipo === 'bloco' ? (
              <LinhaBloco key={linha.id} linha={linha} opcoes={opcoes} expandido={expandidos.has(linha.id)} onToggle={() => toggle(linha.id)} />
            ) : (
              <LinhaSubtotal key={linha.id} linha={linha} opcoes={opcoes} />
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
