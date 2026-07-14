import { Fragment, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { formatarMoeda, formatarPercentual } from '../lib/format';
import { labelPeriodo } from '../data/constants';

function corValor(valor, tipo) {
  if (tipo === 'total') return valor < 0 ? 'text-loss-600 dark:text-loss-400' : 'text-clay-700 dark:text-clay-300';
  if (valor < 0) return 'text-loss-500 dark:text-loss-400';
  return 'text-sand-800 dark:text-sand-100';
}

function celulasPorPeriodo({ valoresPorPeriodo, ahPorPeriodo, avPorPeriodo, media, tipo, opcoes, negrito }) {
  const celulas = valoresPorPeriodo.flatMap((v, k) => {
    const grupo = [
      <td
        key={`v-${k}`}
        className={`py-2.5 pr-2 text-right text-sm tabular-nums ${negrito ? 'font-medium' : ''} ${corValor(v, tipo)} ${
          k > 0 ? 'border-l border-sand-100 dark:border-sand-800/60' : ''
        }`}
      >
        {formatarMoeda(v)}
      </td>,
    ];
    if (opcoes.ah) {
      const ah = ahPorPeriodo?.[k];
      grupo.push(
        <td key={`ah-${k}`} className="py-2.5 pr-2 text-right text-xs tabular-nums text-sand-500 dark:text-sand-400">
          {ah === null || ah === undefined ? '—' : formatarPercentual(ah)}
        </td>
      );
    }
    if (opcoes.av) {
      const av = avPorPeriodo?.[k];
      grupo.push(
        <td key={`av-${k}`} className="py-2.5 pr-2 text-right text-xs tabular-nums text-sand-500 dark:text-sand-400">
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
        className={`py-2.5 pr-2 text-right text-sm tabular-nums ${negrito ? 'font-medium' : ''} border-l-2 border-sand-200 dark:border-sand-700 ${corValor(media, tipo)}`}
      >
        {formatarMoeda(media)}
      </td>
    );
  }

  return celulas;
}

function LinhaBloco({ linha, opcoes, expandido, onToggle }) {
  const temFilhos = linha.contas && linha.contas.length > 0;
  return (
    <>
      <tr
        className={`border-t border-sand-150 dark:border-sand-800 ${temFilhos ? 'cursor-pointer hover:bg-sand-100/70 dark:hover:bg-sand-800/40' : ''}`}
        onClick={temFilhos ? onToggle : undefined}
      >
        <td className="py-2.5 pl-2 pr-2">
          <div className="flex items-center gap-1.5">
            {temFilhos ? (
              <ChevronRight size={14} className={`text-sand-400 shrink-0 transition-transform ${expandido ? 'rotate-90' : ''}`} />
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            <span className="text-sm font-medium text-sand-800 dark:text-sand-100">{linha.nome}</span>
          </div>
        </td>
        {celulasPorPeriodo({ ...linha, tipo: linha.tipo, opcoes, negrito: true })}
      </tr>
      {temFilhos && expandido && linha.contas.map((conta) => (
        <tr key={conta.id} className="bg-sand-50/60 dark:bg-sand-900/30">
          <td className="py-2 pl-10 pr-2 text-sm text-sand-500 dark:text-sand-400">{conta.nome}</td>
          {celulasPorPeriodo({ ...conta, tipo: 'conta', opcoes, negrito: false })}
        </tr>
      ))}
    </>
  );
}

function LinhaSubtotal({ linha, opcoes }) {
  const ehTotal = linha.tipo === 'total';
  return (
    <tr className={ehTotal ? 'border-y-2 border-clay-300/60 dark:border-clay-700/50 bg-clay-50/60 dark:bg-clay-700/10' : 'border-t border-sand-200 dark:border-sand-700 bg-sand-100/70 dark:bg-sand-800/40'}>
      <td className="py-2.5 pl-2 pr-2">
        <span className={`text-sm font-semibold ${ehTotal ? 'text-clay-800 dark:text-clay-200' : 'text-sand-700 dark:text-sand-200'}`}>
          {linha.nome}
        </span>
      </td>
      {celulasPorPeriodo({ ...linha, opcoes, negrito: true })}
    </tr>
  );
}

export default function ReportTree({ linhas, periodos, opcoes = { media: false, ah: false, av: false }, colunaNome = 'Conta' }) {
  const [expandidos, setExpandidos] = useState(() => new Set(linhas.filter((l) => l.tipo === 'bloco').map((l) => l.id)));

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
                <th rowSpan={2} className="text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pl-2 pr-2 align-bottom">
                  {colunaNome}
                </th>
                {periodos.map((p, k) => (
                  <th
                    key={p}
                    colSpan={subColsPorPeriodo}
                    className={`text-center text-xs font-semibold text-sand-500 dark:text-sand-400 py-2 ${k > 0 ? 'border-l border-sand-150 dark:border-sand-800' : ''}`}
                  >
                    {labelPeriodo(p)}
                  </th>
                ))}
                {opcoes.media && <th rowSpan={2} className="text-right text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pr-2 align-bottom border-l-2 border-sand-200 dark:border-sand-700">Média</th>}
              </tr>
              <tr>
                {periodos.map((p) => (
                  <Fragment key={p}>
                    <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-sand-400 py-1.5 pr-2 border-l border-sand-100 dark:border-sand-800/60">Valor</th>
                    {opcoes.ah && <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-sand-400 py-1.5 pr-2">AH</th>}
                    {opcoes.av && <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-sand-400 py-1.5 pr-2">AV</th>}
                  </Fragment>
                ))}
              </tr>
            </>
          ) : (
            <tr>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pl-2 pr-2">{colunaNome}</th>
              {periodos.map((p, k) => (
                <th
                  key={p}
                  className={`text-right text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pr-2 ${k > 0 ? 'border-l border-sand-100 dark:border-sand-800/60' : ''}`}
                >
                  {labelPeriodo(p)}
                </th>
              ))}
              {opcoes.media && <th className="text-right text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pr-2 border-l-2 border-sand-200 dark:border-sand-700">Média</th>}
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
