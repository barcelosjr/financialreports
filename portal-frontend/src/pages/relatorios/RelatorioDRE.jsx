import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { calcularDRE, construirTabelaPeriodos } from '../../data/financeiro';
import { todosIndicadores } from '../../data/indicadores';
import { PERIODOS, labelPeriodo } from '../../data/constants';
import { usuarioPodeVerRelatorio } from '../../data/usuarios';
import { formatarPercentual } from '../../lib/format';
import ReportPageHeader from '../../components/ReportPageHeader';
import ReportTree from '../../components/ReportTree';
import FiltroPeriodoRelatorio from '../../components/FiltroPeriodoRelatorio';
import RequireAcesso from '../../components/RequireAcesso';

const PERIODOS_INICIAIS = PERIODOS.slice(Math.max(0, PERIODOS.length - 3));

export default function RelatorioDRE() {
  const { usuarioAtual, grupoAtual, empresaIdsEscopo, escopo } = useApp();
  const [periodos, setPeriodos] = useState(PERIODOS_INICIAIS);
  const [opcoes, setOpcoes] = useState({ media: false, ah: false, av: false });

  const linhas = useMemo(
    () => construirTabelaPeriodos(calcularDRE, empresaIdsEscopo, periodos, { ...opcoes, baseAVId: 'subtotal-receita-liquida' }),
    [empresaIdsEscopo, periodos, opcoes]
  );

  const empresaAtual = grupoAtual?.empresas.find((e) => e.id === escopo.empresaId);
  const rotuloPeriodo = periodos.length > 1 ? `${labelPeriodo(periodos[0])} – ${labelPeriodo(periodos[periodos.length - 1])}` : labelPeriodo(periodos[0]);
  const subtitulo = `${escopo.empresaId === 'todas' ? 'Todas as empresas' : empresaAtual?.nome} · ${rotuloPeriodo}`;

  const indicadoresMargem = useMemo(() => {
    const ultimoPeriodo = periodos[periodos.length - 1];
    const inds = todosIndicadores(empresaIdsEscopo, ultimoPeriodo);
    const de = (chave) => inds.find((i) => i.chave === chave);
    return ['margemBruta', 'margemEbit', 'margemEbitda', 'margemLiquida']
      .map(de)
      .filter(Boolean)
      .map((ind) => ({ label: ind.nome, valor: formatarPercentual(ind.valor, { comSinal: false }), status: ind.status }));
  }, [empresaIdsEscopo, periodos]);

  return (
    <RequireAcesso permitido={usuarioPodeVerRelatorio(usuarioAtual, 'dre')}>
      <div className="space-y-5">
        <ReportPageHeader titulo="DRE — Demonstrativo do Resultado do Exercício" subtitulo={subtitulo} indicadores={indicadoresMargem} />
        <FiltroPeriodoRelatorio
          periodosIniciais={PERIODOS_INICIAIS}
          opcoes={opcoes}
          onOpcoesChange={setOpcoes}
          onAplicar={setPeriodos}
        />
        <ReportTree linhas={linhas} periodos={periodos} opcoes={opcoes} />
      </div>
    </RequireAcesso>
  );
}
