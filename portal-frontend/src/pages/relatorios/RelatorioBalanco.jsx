import { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { calcularBalanco, construirTabelaPeriodos, porId } from '../../data/financeiro';
import { PERIODO_ATUAL, labelPeriodo } from '../../data/constants';
import { usuarioPodeVerRelatorio } from '../../data/usuarios';
import { formatarMoeda } from '../../lib/format';
import ReportPageHeader from '../../components/ReportPageHeader';
import ReportTree from '../../components/ReportTree';
import FiltroPeriodoRelatorio from '../../components/FiltroPeriodoRelatorio';
import RequireAcesso from '../../components/RequireAcesso';

const PERIODOS_INICIAIS = [PERIODO_ATUAL];

export default function RelatorioBalanco() {
  const { usuarioAtual, grupoAtual, empresaIdsEscopo, escopo } = useApp();
  const [periodos, setPeriodos] = useState(PERIODOS_INICIAIS);
  const [opcoes, setOpcoes] = useState({ media: false, ah: false, av: false });

  const ativo = useMemo(
    () => construirTabelaPeriodos((ids, p) => calcularBalanco(ids, p).ativo, empresaIdsEscopo, periodos, { ...opcoes, baseAVId: 'total-ativo' }),
    [empresaIdsEscopo, periodos, opcoes]
  );
  const passivoPl = useMemo(
    () => construirTabelaPeriodos((ids, p) => calcularBalanco(ids, p).passivoPl, empresaIdsEscopo, periodos, { ...opcoes, baseAVId: 'total-passivo-pl' }),
    [empresaIdsEscopo, periodos, opcoes]
  );

  const ultimoIdx = periodos.length - 1;
  const ativoTotalUltimo = porId(ativo, 'total-ativo').valoresPorPeriodo?.[ultimoIdx] ?? 0;
  const passivoPlTotalUltimo = porId(passivoPl, 'total-passivo-pl').valoresPorPeriodo?.[ultimoIdx] ?? 0;
  const fechado = Math.abs(ativoTotalUltimo - passivoPlTotalUltimo) < 1;

  const empresaAtual = grupoAtual?.empresas.find((e) => e.id === escopo.empresaId);
  const subtitulo = `${escopo.empresaId === 'todas' ? 'Todas as empresas' : empresaAtual?.nome} · posição em ${labelPeriodo(periodos[ultimoIdx])}`;

  return (
    <RequireAcesso permitido={usuarioPodeVerRelatorio(usuarioAtual, 'balanco')}>
      <div className="space-y-5">
        <ReportPageHeader titulo="Balanço Patrimonial" subtitulo={subtitulo} />
        <FiltroPeriodoRelatorio
          periodosIniciais={PERIODOS_INICIAIS}
          opcoes={opcoes}
          onOpcoesChange={setOpcoes}
          onAplicar={setPeriodos}
        />

        <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 w-fit ${fechado ? 'bg-gain-50 text-gain-700 dark:bg-gain-700/15 dark:text-gain-400' : 'bg-amber-50 text-amber-600'}`}>
          <CheckCircle2 size={14} />
          {fechado
            ? `Balanço fechado em ${labelPeriodo(periodos[ultimoIdx])} — Ativo Total = ${formatarMoeda(ativoTotalUltimo, { compacto: true })}`
            : `Diferença entre Ativo e Passivo + PL detectada em ${labelPeriodo(periodos[ultimoIdx])}.`}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <h3 className="text-sm font-semibold text-sand-600 dark:text-sand-300 mb-2 px-1">Ativo</h3>
            <ReportTree linhas={ativo} periodos={periodos} opcoes={opcoes} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-sand-600 dark:text-sand-300 mb-2 px-1">Passivo + Patrimônio Líquido</h3>
            <ReportTree linhas={passivoPl} periodos={periodos} opcoes={opcoes} />
          </div>
        </div>
      </div>
    </RequireAcesso>
  );
}
