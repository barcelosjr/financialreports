import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { calcularFluxoCaixaIntervalo } from '../../data/financeiro';
import { PERIODO_ATUAL, PERIODOS, labelPeriodo } from '../../data/constants';
import { usuarioPodeVerRelatorio } from '../../data/usuarios';
import { formatarMoeda } from '../../lib/format';
import ReportPageHeader from '../../components/ReportPageHeader';
import ReportTree from '../../components/ReportTree';
import RequireAcesso from '../../components/RequireAcesso';

export default function RelatorioFluxoCaixa() {
  const { usuarioAtual, grupoAtual, empresaIdsEscopo, escopo } = useApp();
  const [periodo, setPeriodo] = useState({ inicio: PERIODOS[Math.max(0, PERIODOS.length - 3)], fim: PERIODO_ATUAL });

  const resultado = useMemo(
    () => calcularFluxoCaixaIntervalo(empresaIdsEscopo, periodo.inicio, periodo.fim),
    [empresaIdsEscopo, periodo]
  );

  const empresaAtual = grupoAtual?.empresas.find((e) => e.id === escopo.empresaId);
  const subtitulo = `${escopo.empresaId === 'todas' ? 'Todas as empresas' : empresaAtual?.nome} · ${labelPeriodo(periodo.inicio)} – ${labelPeriodo(periodo.fim)}`;

  return (
    <RequireAcesso permitido={usuarioPodeVerRelatorio(usuarioAtual, 'fluxoCaixa')}>
    <div className="space-y-5">
      <ReportPageHeader
        titulo="Fluxo de Caixa"
        subtitulo={subtitulo}
        periodo={periodo}
        onChangePeriodo={setPeriodo}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="surface rounded-xl p-4">
          <span className="text-sm text-sand-500 dark:text-sand-400">Saldo Inicial</span>
          <p className="mt-1 text-xl font-semibold tabular-nums text-sand-900 dark:text-sand-50">{formatarMoeda(resultado.saldoInicial, { compacto: true })}</p>
        </div>
        <div className="surface rounded-xl p-4">
          <span className="text-sm text-sand-500 dark:text-sand-400">Variação Líquida</span>
          <p className={`mt-1 text-xl font-semibold tabular-nums ${resultado.variacaoLiquida >= 0 ? 'text-gain-600 dark:text-gain-400' : 'text-loss-500 dark:text-loss-400'}`}>
            {formatarMoeda(resultado.variacaoLiquida, { compacto: true })}
          </p>
        </div>
        <div className="surface rounded-xl p-4 ring-1 ring-clay-300/60 dark:ring-clay-700/60">
          <span className="text-sm text-sand-500 dark:text-sand-400">Saldo Final</span>
          <p className="mt-1 text-xl font-semibold tabular-nums text-clay-700 dark:text-clay-300">{formatarMoeda(resultado.saldoFinal, { compacto: true })}</p>
        </div>
      </div>

      <ReportTree linhas={resultado.linhas} />
    </div>
    </RequireAcesso>
  );
}
