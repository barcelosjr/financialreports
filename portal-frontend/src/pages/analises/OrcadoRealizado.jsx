import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { compararOrcadoRealizado } from '../../data/orcamento';
import { PERIODO_ATUAL, labelPeriodo } from '../../data/constants';
import { usuarioPodeVerRelatorio } from '../../data/usuarios';
import { formatarMoeda, formatarPercentual } from '../../lib/format';
import RequireAcesso from '../../components/RequireAcesso';
import PeriodRangeSelector from '../../components/PeriodRangeSelector';
import BulletBar from '../../components/ui/BulletBar';

const BG_LINHA = {
  bloco: 'bg-white dark:bg-sand-900',
  conta: 'bg-sand-50 dark:bg-sand-900',
  subtotal: 'bg-sand-100 dark:bg-sand-800',
  total: 'bg-clay-50 dark:bg-clay-900/50',
};

function LinhaOV({ linha, expandido, onToggle }) {
  const temFilhos = linha.contas?.length > 0;
  const bg = BG_LINHA[linha.tipo] ?? BG_LINHA.conta;
  const favoravel = linha.status === 'favoravel';
  const corVariacao = favoravel ? 'text-gain-600 dark:text-gain-400' : 'text-loss-500 dark:text-loss-400';
  const destaque = linha.tipo === 'bloco' || linha.tipo === 'subtotal' || linha.tipo === 'total';

  return (
    <>
      <tr className={`border-t border-sand-150 dark:border-sand-800 ${temFilhos ? 'cursor-pointer' : ''}`} onClick={temFilhos ? onToggle : undefined}>
        <td className={`sticky left-0 z-10 py-2.5 pl-2 pr-3 ${bg}`}>
          <div className="flex items-center gap-1.5">
            {temFilhos ? (
              <ChevronRight size={14} className={`text-sand-400 shrink-0 transition-transform ${expandido ? 'rotate-90' : ''}`} />
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            <span className={`text-sm whitespace-nowrap ${destaque ? 'font-medium text-sand-800 dark:text-sand-100' : 'text-sand-500 dark:text-sand-400'}`}>{linha.nome}</span>
          </div>
        </td>
        <td className={`py-2.5 px-3 text-right text-sm tabular-nums whitespace-nowrap ${bg} text-sand-800 dark:text-sand-100`}>{formatarMoeda(linha.realizado)}</td>
        <td className={`py-2.5 px-3 text-right text-sm tabular-nums whitespace-nowrap ${bg} text-sand-500 dark:text-sand-400`}>{formatarMoeda(linha.orcado)}</td>
        <td className={`py-2.5 px-3 text-right text-sm tabular-nums whitespace-nowrap ${bg} ${corVariacao}`}>{formatarMoeda(linha.variacaoAbs)}</td>
        <td className={`py-2.5 px-3 text-right text-xs tabular-nums whitespace-nowrap ${bg} ${corVariacao}`}>
          {linha.variacaoPct != null ? formatarPercentual(linha.variacaoPct) : '—'}
        </td>
        <td className={`py-2.5 px-3 ${bg} min-w-[150px]`}>
          {linha.atingimento != null && (
            <BulletBar
              valor={Math.min(Math.abs(linha.atingimento), 1.6)}
              limite={1}
              max={1.6}
              status={favoravel ? 'bom' : 'ruim'}
              formatarValor={(v) => formatarPercentual(v, { comSinal: false })}
            />
          )}
        </td>
      </tr>
      {temFilhos && expandido && linha.contas.map((conta) => <LinhaOV key={conta.id} linha={conta} />)}
    </>
  );
}

function TabelaOrcadoRealizado({ linhas }) {
  const [expandidos, setExpandidos] = useState(() => new Set(linhas.filter((l) => l.contas?.length).map((l) => l.id)));

  function toggle(id) {
    setExpandidos((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  return (
    <div className="surface rounded-xl overflow-x-auto">
      <table className="w-full min-w-max">
        <thead>
          <tr>
            <th className="sticky left-0 z-20 bg-white dark:bg-sand-900 text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pl-2 pr-3">Conta</th>
            <th className="text-right text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 px-3">Realizado</th>
            <th className="text-right text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 px-3">Orçado</th>
            <th className="text-right text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 px-3">Variação R$</th>
            <th className="text-right text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 px-3">Variação %</th>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 px-3">Atingimento</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <LinhaOV key={linha.id} linha={linha} expandido={expandidos.has(linha.id)} onToggle={() => toggle(linha.id)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function OrcadoRealizado() {
  const { usuarioAtual, empresaIdsEscopo, escopo, grupoAtual } = useApp();
  const [periodo, setPeriodo] = useState(PERIODO_ATUAL);
  const permitido = usuarioPodeVerRelatorio(usuarioAtual, 'dre');

  const linhas = useMemo(() => compararOrcadoRealizado(empresaIdsEscopo, periodo), [empresaIdsEscopo, periodo]);

  const empresaAtual = grupoAtual?.empresas.find((e) => e.id === escopo.empresaId);
  const subtitulo = `${escopo.empresaId === 'todas' ? 'Todas as empresas' : empresaAtual?.nome} · ${labelPeriodo(periodo)}`;

  return (
    <RequireAcesso permitido={permitido}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-serif font-semibold text-sand-900 dark:text-sand-50">Orçado × Realizado</h2>
            <p className="text-sm text-sand-500 dark:text-sand-400">{subtitulo}</p>
          </div>
          <PeriodRangeSelector fim={periodo} inicio={periodo} apenasFim onChange={({ fim }) => setPeriodo(fim)} />
        </div>
        <TabelaOrcadoRealizado linhas={linhas} />
      </div>
    </RequireAcesso>
  );
}
