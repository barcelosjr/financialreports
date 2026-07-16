import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { calcularFluxoCaixa, calcularFluxoCaixaIntervalo, construirTabelaPeriodos } from '../../data/financeiro';
import { calcularRunway } from '../../data/risco';
import { PERIODOS, labelPeriodo } from '../../data/constants';
import { usuarioPodeVerRelatorio } from '../../data/usuarios';
import { formatarMoeda } from '../../lib/format';
import ReportPageHeader from '../../components/ReportPageHeader';
import ReportTree from '../../components/ReportTree';
import FiltroPeriodoRelatorio from '../../components/FiltroPeriodoRelatorio';
import RequireAcesso from '../../components/RequireAcesso';

const PERIODOS_INICIAIS = PERIODOS.slice(Math.max(0, PERIODOS.length - 3));

export default function RelatorioFluxoCaixa() {
  const { usuarioAtual, grupoAtual, empresaIdsEscopo, escopo } = useApp();
  const [periodos, setPeriodos] = useState(PERIODOS_INICIAIS);
  const [opcoes, setOpcoes] = useState({ media: false, ah: false, av: false });

  const resumo = useMemo(
    () => calcularFluxoCaixaIntervalo(empresaIdsEscopo, periodos[0], periodos[periodos.length - 1]),
    [empresaIdsEscopo, periodos]
  );

  const linhas = useMemo(
    () => construirTabelaPeriodos((ids, p) => calcularFluxoCaixa(ids, p).linhas, empresaIdsEscopo, periodos, opcoes),
    [empresaIdsEscopo, periodos, opcoes]
  );

  const empresaAtual = grupoAtual?.empresas.find((e) => e.id === escopo.empresaId);
  const rotuloPeriodo = periodos.length > 1 ? `${labelPeriodo(periodos[0])} – ${labelPeriodo(periodos[periodos.length - 1])}` : labelPeriodo(periodos[0]);
  const subtitulo = `${escopo.empresaId === 'todas' ? 'Todas as empresas' : empresaAtual?.nome} · ${rotuloPeriodo}`;

  const indicadoresFluxo = useMemo(() => {
    const runway = calcularRunway(empresaIdsEscopo, periodos[periodos.length - 1]);
    const geracaoCaixa = {
      label: 'Geração de Caixa Operacional',
      valor: formatarMoeda(runway.fco, { compacto: true }),
      status: runway.fco >= 0 ? 'bom' : 'ruim',
    };
    if (runway.fco >= 0) return [geracaoCaixa];
    return [
      geracaoCaixa,
      {
        label: 'Runway de Caixa',
        valor: `${runway.mesesRunway.toFixed(1)} meses`,
        status: runway.emRisco ? 'ruim' : 'atencao',
      },
    ];
  }, [empresaIdsEscopo, periodos]);

  return (
    <RequireAcesso permitido={usuarioPodeVerRelatorio(usuarioAtual, 'fluxoCaixa')}>
      <div className="space-y-5">
        <ReportPageHeader titulo="Fluxo de Caixa" subtitulo={subtitulo} indicadores={indicadoresFluxo} />
        <FiltroPeriodoRelatorio
          permitirAH={false}
          permitirAV={false}
          periodosIniciais={PERIODOS_INICIAIS}
          opcoes={opcoes}
          onOpcoesChange={setOpcoes}
          onAplicar={setPeriodos}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="surface rounded-xl p-4">
            <span className="text-sm text-sand-500 dark:text-sand-400">Saldo Inicial</span>
            <p className="mt-1 text-xl font-semibold tabular-nums text-sand-900 dark:text-sand-50">{formatarMoeda(resumo.saldoInicial, { compacto: true })}</p>
          </div>
          <div className="surface rounded-xl p-4">
            <span className="text-sm text-sand-500 dark:text-sand-400">Variação Líquida</span>
            <p className={`mt-1 text-xl font-semibold tabular-nums ${resumo.variacaoLiquida >= 0 ? 'text-gain-600 dark:text-gain-400' : 'text-loss-500 dark:text-loss-400'}`}>
              {formatarMoeda(resumo.variacaoLiquida, { compacto: true })}
            </p>
          </div>
          <div className="surface rounded-xl p-4 ring-1 ring-clay-300/60 dark:ring-clay-700/60">
            <span className="text-sm text-sand-500 dark:text-sand-400">Saldo Final</span>
            <p className="mt-1 text-xl font-semibold tabular-nums text-clay-700 dark:text-clay-300">{formatarMoeda(resumo.saldoFinal, { compacto: true })}</p>
          </div>
        </div>

        <ReportTree linhas={linhas} periodos={periodos} opcoes={opcoes} />
      </div>
    </RequireAcesso>
  );
}
