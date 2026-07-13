import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { formatarMoeda } from '../lib/format';

function corValor(valor, tipo) {
  if (tipo === 'total') return valor < 0 ? 'text-loss-600 dark:text-loss-400' : 'text-clay-700 dark:text-clay-300';
  if (valor < 0) return 'text-loss-500 dark:text-loss-400';
  return 'text-sand-800 dark:text-sand-100';
}

function LinhaBloco({ linha, expandido, onToggle }) {
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
        <td className={`py-2.5 pr-2 text-right text-sm tabular-nums font-medium ${corValor(linha.valor, linha.tipo)}`}>
          {formatarMoeda(linha.valor)}
        </td>
      </tr>
      {temFilhos && expandido && linha.contas.map((conta) => (
        <tr key={conta.id} className="bg-sand-50/60 dark:bg-sand-900/30">
          <td className="py-2 pl-10 pr-2 text-sm text-sand-500 dark:text-sand-400">{conta.nome}</td>
          <td className={`py-2 pr-2 text-right text-sm tabular-nums ${corValor(conta.valor, 'conta')}`}>
            {formatarMoeda(conta.valor)}
          </td>
        </tr>
      ))}
    </>
  );
}

function LinhaSubtotal({ linha }) {
  const ehTotal = linha.tipo === 'total';
  return (
    <tr className={ehTotal ? 'border-y-2 border-clay-300/60 dark:border-clay-700/50 bg-clay-50/60 dark:bg-clay-700/10' : 'border-t border-sand-200 dark:border-sand-700 bg-sand-100/70 dark:bg-sand-800/40'}>
      <td className="py-2.5 pl-2 pr-2">
        <span className={`text-sm font-semibold ${ehTotal ? 'text-clay-800 dark:text-clay-200' : 'text-sand-700 dark:text-sand-200'}`}>
          {linha.nome}
        </span>
      </td>
      <td className={`py-2.5 pr-2 text-right text-sm font-semibold tabular-nums ${corValor(linha.valor, linha.tipo)}`}>
        {formatarMoeda(linha.valor)}
      </td>
    </tr>
  );
}

export default function ReportTree({ linhas, colunaNome = 'Conta' }) {
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

  return (
    <div className="surface rounded-xl overflow-hidden">
      <div className="flex items-center justify-end px-4 pt-3">
        <button
          className="text-xs font-medium text-clay-600 dark:text-clay-400 hover:text-clay-700"
          onClick={() => setExpandidos(tudoExpandido ? new Set() : new Set(todosIds))}
        >
          {tudoExpandido ? 'Recolher tudo' : 'Expandir tudo'}
        </button>
      </div>
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pl-2 pr-2">{colunaNome}</th>
            <th className="text-right text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pr-2">Valor</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) =>
            linha.tipo === 'bloco' ? (
              <LinhaBloco key={linha.id} linha={linha} expandido={expandidos.has(linha.id)} onToggle={() => toggle(linha.id)} />
            ) : (
              <LinhaSubtotal key={linha.id} linha={linha} />
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
