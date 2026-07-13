import { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { calcularBalanco, porId } from '../../data/financeiro';
import { PERIODO_ATUAL, labelPeriodo } from '../../data/constants';
import { usuarioPodeVerRelatorio } from '../../data/usuarios';
import { formatarMoeda } from '../../lib/format';
import ReportPageHeader from '../../components/ReportPageHeader';
import ReportTree from '../../components/ReportTree';
import RequireAcesso from '../../components/RequireAcesso';

export default function RelatorioBalanco() {
  const { usuarioAtual, grupoAtual, empresaIdsEscopo, escopo } = useApp();
  const [periodo, setPeriodo] = useState({ inicio: PERIODO_ATUAL, fim: PERIODO_ATUAL });

  const { ativo, passivoPl } = useMemo(
    () => calcularBalanco(empresaIdsEscopo, periodo.fim),
    [empresaIdsEscopo, periodo.fim]
  );

  const ativoTotal = porId(ativo, 'total-ativo').valor;
  const passivoPlTotal = porId(passivoPl, 'total-passivo-pl').valor;
  const fechado = Math.abs(ativoTotal - passivoPlTotal) < 1;

  const empresaAtual = grupoAtual?.empresas.find((e) => e.id === escopo.empresaId);
  const subtitulo = `${escopo.empresaId === 'todas' ? 'Todas as empresas' : empresaAtual?.nome} · posição em ${labelPeriodo(periodo.fim)}`;

  return (
    <RequireAcesso permitido={usuarioPodeVerRelatorio(usuarioAtual, 'balanco')}>
    <div className="space-y-5">
      <ReportPageHeader
        titulo="Balanço Patrimonial"
        subtitulo={subtitulo}
        periodo={periodo}
        onChangePeriodo={setPeriodo}
        apenasFim
      />

      <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 w-fit ${fechado ? 'bg-gain-50 text-gain-700 dark:bg-gain-700/15 dark:text-gain-400' : 'bg-amber-50 text-amber-600'}`}>
        <CheckCircle2 size={14} />
        {fechado
          ? `Balanço fechado — Ativo Total = ${formatarMoeda(ativoTotal, { compacto: true })}`
          : 'Diferença entre Ativo e Passivo + PL detectada.'}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <h3 className="text-sm font-semibold text-sand-600 dark:text-sand-300 mb-2 px-1">Ativo</h3>
          <ReportTree linhas={ativo} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-sand-600 dark:text-sand-300 mb-2 px-1">Passivo + Patrimônio Líquido</h3>
          <ReportTree linhas={passivoPl} />
        </div>
      </div>
    </div>
    </RequireAcesso>
  );
}
