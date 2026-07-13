import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { calcularDREIntervalo } from '../../data/financeiro';
import { PERIODO_ATUAL, PERIODOS, labelPeriodo } from '../../data/constants';
import { usuarioPodeVerRelatorio } from '../../data/usuarios';
import ReportPageHeader from '../../components/ReportPageHeader';
import ReportTree from '../../components/ReportTree';
import RequireAcesso from '../../components/RequireAcesso';

export default function RelatorioDRE() {
  const { usuarioAtual, grupoAtual, empresaIdsEscopo, escopo } = useApp();
  const [periodo, setPeriodo] = useState({ inicio: PERIODOS[Math.max(0, PERIODOS.length - 3)], fim: PERIODO_ATUAL });

  const linhas = useMemo(
    () => calcularDREIntervalo(empresaIdsEscopo, periodo.inicio, periodo.fim),
    [empresaIdsEscopo, periodo]
  );

  const empresaAtual = grupoAtual?.empresas.find((e) => e.id === escopo.empresaId);
  const subtitulo = `${escopo.empresaId === 'todas' ? 'Todas as empresas' : empresaAtual?.nome} · ${labelPeriodo(periodo.inicio)} – ${labelPeriodo(periodo.fim)}`;

  return (
    <RequireAcesso permitido={usuarioPodeVerRelatorio(usuarioAtual, 'dre')}>
    <div className="space-y-5">
      <ReportPageHeader
        titulo="DRE — Demonstrativo do Resultado do Exercício"
        subtitulo={subtitulo}
        periodo={periodo}
        onChangePeriodo={setPeriodo}
      />
      <ReportTree linhas={linhas} />
    </div>
    </RequireAcesso>
  );
}
