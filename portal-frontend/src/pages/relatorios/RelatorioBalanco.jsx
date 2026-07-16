import { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { calcularBalanco, construirTabelaPeriodos, periodosFechamentoAnual, porId } from '../../data/financeiro';
import { todosIndicadores } from '../../data/indicadores';
import { usuarioPodeVerRelatorio } from '../../data/usuarios';
import { formatarMoeda, formatarMultiplo, formatarPercentual } from '../../lib/format';
import ReportPageHeader from '../../components/ReportPageHeader';
import ReportTree from '../../components/ReportTree';
import FiltroPeriodoRelatorio from '../../components/FiltroPeriodoRelatorio';
import RequireAcesso from '../../components/RequireAcesso';

// Balanço abre por padrão só no ano atual (último fechamento disponível);
// o usuário pode adicionar outros anos para comparar no filtro.
const FECHAMENTOS = periodosFechamentoAnual();
const ANO_ATUAL = FECHAMENTOS[FECHAMENTOS.length - 1];
const PERIODOS_INICIAIS = [ANO_ATUAL.periodo];
const ROTULOS_INICIAIS = [ANO_ATUAL.ano];

export default function RelatorioBalanco() {
  const { usuarioAtual, grupoAtual, empresaIdsEscopo, escopo } = useApp();
  const [periodos, setPeriodos] = useState(PERIODOS_INICIAIS);
  const [rotulos, setRotulos] = useState(ROTULOS_INICIAIS);
  // Balanço não oferece Análise Vertical (só a DRE tem, sobre a Receita Líquida).
  const [opcoes, setOpcoes] = useState({ media: false, ah: false, av: false });
  const opcoesBalanco = { ...opcoes, av: false, ahVsColunaAnterior: true };

  const ativo = useMemo(
    () => construirTabelaPeriodos((ids, p) => calcularBalanco(ids, p).ativo, empresaIdsEscopo, periodos, opcoesBalanco),
    [empresaIdsEscopo, periodos, opcoes]
  );
  const passivoPl = useMemo(
    () => construirTabelaPeriodos((ids, p) => calcularBalanco(ids, p).passivoPl, empresaIdsEscopo, periodos, opcoesBalanco),
    [empresaIdsEscopo, periodos, opcoes]
  );

  const ultimoIdx = periodos.length - 1;
  const ativoTotalUltimo = porId(ativo, 'total-ativo').valoresPorPeriodo?.[ultimoIdx] ?? 0;
  const passivoPlTotalUltimo = porId(passivoPl, 'total-passivo-pl').valoresPorPeriodo?.[ultimoIdx] ?? 0;
  const fechado = Math.abs(ativoTotalUltimo - passivoPlTotalUltimo) < 1;
  const anoUltimo = rotulos[ultimoIdx];

  const empresaAtual = grupoAtual?.empresas.find((e) => e.id === escopo.empresaId);
  const escopoTxt = escopo.empresaId === 'todas' ? 'Todas as empresas' : empresaAtual?.nome;
  const subtitulo = periodos.length > 1 ? `${escopoTxt} · comparativo anual (${rotulos.join(', ')})` : `${escopoTxt} · posição em ${rotulos[0]}`;

  const indicadoresBalanco = useMemo(() => {
    const inds = todosIndicadores(empresaIdsEscopo, periodos[ultimoIdx]);
    const de = (chave) => inds.find((i) => i.chave === chave);
    const liquidez = de('liquidezCorrente');
    const endividamento = de('endividamentoGeral');
    const plAtivo = de('plAtivo');
    return [
      liquidez && { label: liquidez.nome, valor: formatarMultiplo(liquidez.valor), status: liquidez.status },
      endividamento && { label: endividamento.nome, valor: formatarPercentual(endividamento.valor, { comSinal: false }), status: endividamento.status },
      plAtivo && { label: plAtivo.nome, valor: formatarPercentual(plAtivo.valor, { comSinal: false }), status: plAtivo.status },
    ].filter(Boolean);
  }, [empresaIdsEscopo, periodos, ultimoIdx]);

  // Com mais de uma coluna (vários anos ou AH ligado), cada tabela precisa de
  // largura — lado a lado ficaria apertado e rolaria na horizontal. Nesse
  // caso empilhamos Ativo e Passivo+PL em largura total; com uma coluna só,
  // mantemos lado a lado (mais compacto).
  const empilhado = periodos.length > 1 || opcoes.ah;

  function aplicar(novosPeriodos, novosRotulos) {
    setPeriodos(novosPeriodos);
    setRotulos(novosRotulos ?? novosPeriodos);
  }

  return (
    <RequireAcesso permitido={usuarioPodeVerRelatorio(usuarioAtual, 'balanco')}>
      <div className="space-y-5">
        <ReportPageHeader titulo="Balanço Patrimonial" subtitulo={subtitulo} indicadores={indicadoresBalanco} />
        <FiltroPeriodoRelatorio
          modo="anualComparativo"
          permitirAV={false}
          periodosIniciais={PERIODOS_INICIAIS}
          opcoes={opcoes}
          onOpcoesChange={setOpcoes}
          onAplicar={aplicar}
        />

        <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 w-fit ${fechado ? 'bg-gain-50 text-gain-700 dark:bg-gain-700/15 dark:text-gain-400' : 'bg-amber-50 text-amber-600'}`}>
          <CheckCircle2 size={14} />
          {fechado
            ? `Balanço fechado em ${anoUltimo} — Ativo Total = ${formatarMoeda(ativoTotalUltimo, { compacto: true })}`
            : `Diferença entre Ativo e Passivo + PL detectada em ${anoUltimo}.`}
        </div>

        <div className={empilhado ? 'space-y-5' : 'grid grid-cols-1 lg:grid-cols-2 gap-5'}>
          <div>
            <h3 className="text-sm font-semibold text-sand-600 dark:text-sand-300 mb-2 px-1">Ativo</h3>
            <ReportTree linhas={ativo} periodos={periodos} rotulos={rotulos} opcoes={opcoesBalanco} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-sand-600 dark:text-sand-300 mb-2 px-1">Passivo + Patrimônio Líquido</h3>
            <ReportTree linhas={passivoPl} periodos={periodos} rotulos={rotulos} opcoes={opcoesBalanco} />
          </div>
        </div>
      </div>
    </RequireAcesso>
  );
}
