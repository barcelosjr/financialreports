import { useEffect, useMemo, useState } from 'react';
import { Info, Copy } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PAPEIS, RELATORIOS } from '../../data/constants';
import RequireAcesso from '../../components/RequireAcesso';
import { SinalBadge } from '../../components/Badge';
import NoArvoreEstrutura from './NoArvoreEstrutura';
import AbaContas from './AbaContas';

const ABA_CONTAS = 'contas';
const ABAS = [...RELATORIOS, { chave: ABA_CONTAS, label: 'Plano de Contas' }];

export default function PlanoContas() {
  const {
    usuarioAtual, grupos, obterNosEstrutura,
    adicionarNoEstrutura, renomearNoEstrutura, alterarSinalNoEstrutura, moverNoEstrutura, removerNoEstrutura, copiarEstrutura,
  } = useApp();
  const ehSuperAdmin = usuarioAtual.papel === PAPEIS.SUPER_ADMIN;
  const podeAcessar = ehSuperAdmin || usuarioAtual.papel === PAPEIS.ADMIN_GRUPO;

  const gruposDisponiveis = ehSuperAdmin ? grupos : grupos.filter((g) => g.id === usuarioAtual.grupoId);

  const [grupoId, setGrupoId] = useState(gruposDisponiveis[0]?.id ?? '');
  const grupoSelecionado = grupos.find((g) => g.id === grupoId) ?? null;

  const [empresaId, setEmpresaId] = useState(grupoSelecionado?.empresas[0]?.id ?? '');
  const [relatorio, setRelatorio] = useState('dre');
  const [novoNomeRaiz, setNovoNomeRaiz] = useState('');
  const [empresaOrigemCopia, setEmpresaOrigemCopia] = useState('');

  useEffect(() => {
    if (!grupoSelecionado) return;
    if (!grupoSelecionado.empresas.some((e) => e.id === empresaId)) {
      setEmpresaId(grupoSelecionado.empresas[0]?.id ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupoId, grupoSelecionado]);

  const empresaSelecionada = grupoSelecionado?.empresas.find((e) => e.id === empresaId) ?? null;
  const nos = obterNosEstrutura(empresaId, relatorio);

  const porPai = useMemo(() => {
    const mapa = new Map();
    for (const no of nos) {
      const chave = no.parentId;
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave).push(no);
    }
    return mapa;
  }, [nos]);

  const raizes = (porPai.get(null) || []).slice().sort((a, b) => a.ordem - b.ordem);

  const acoes = {
    adicionar: (nome, parentId) => adicionarNoEstrutura(empresaId, relatorio, nome, parentId),
    renomear: (nodeId, novoNome) => renomearNoEstrutura(empresaId, relatorio, nodeId, novoNome),
    alterarSinal: (nodeId) => alterarSinalNoEstrutura(empresaId, relatorio, nodeId),
    mover: (nodeId, direcao) => moverNoEstrutura(empresaId, relatorio, nodeId, direcao),
    remover: (nodeId) => removerNoEstrutura(empresaId, relatorio, nodeId),
  };

  function adicionarRaiz() {
    const nome = novoNomeRaiz.trim();
    if (!nome) return;
    acoes.adicionar(nome, null);
    setNovoNomeRaiz('');
  }

  function handleCopiar() {
    if (!empresaOrigemCopia || empresaOrigemCopia === empresaId) return;
    const nomeOrigem = grupoSelecionado.empresas.find((e) => e.id === empresaOrigemCopia)?.nome;
    if (window.confirm(`Isso vai sobrescrever, em "${empresaSelecionada?.nome}", toda a estrutura de DRE/Balanço/Fluxo de Caixa que existir em "${nomeOrigem}". Continuar?`)) {
      copiarEstrutura(empresaOrigemCopia, empresaId);
    }
  }

  return (
    <RequireAcesso permitido={podeAcessar}>
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-serif font-semibold text-sand-900 dark:text-sand-50">Plano de Contas</h2>
          <p className="text-sm text-sand-500 dark:text-sand-400">
            Personalize os grupos e subgrupos de DRE, Balanço e Fluxo de Caixa de cada empresa.
          </p>
        </div>

        <div className="flex items-start gap-2.5 rounded-lg bg-info-50 dark:bg-info-600/10 text-info-600 dark:text-info-400 px-3.5 py-3 text-sm">
          <Info size={16} className="shrink-0 mt-0.5" />
          <span>
            Esta estrutura ainda é só a organização do plano de contas — os valores exibidos nas telas de DRE, Balanço e
            Fluxo de Caixa usam um modelo fixo por enquanto. Conectar cada conta contábil real (do ERP) a estes grupos é
            um passo futuro, quando o backend estiver integrado.
          </span>
        </div>

        <div className="surface rounded-xl p-4 flex flex-wrap items-end gap-3">
          {ehSuperAdmin && (
            <div>
              <label className="label !mb-1 !text-xs">Grupo econômico</label>
              <select className="input !w-auto !py-2 text-sm" value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
                {gruposDisponiveis.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label !mb-1 !text-xs">Empresa</label>
            <select className="input !w-auto !py-2 text-sm" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
              {grupoSelecionado?.empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              {grupoSelecionado?.empresas.length === 0 && <option value="">Nenhuma empresa neste grupo</option>}
            </select>
          </div>
        </div>

        {!empresaSelecionada ? (
          <div className="surface rounded-xl p-10 text-center text-sm text-sand-400">
            Cadastre ao menos uma empresa neste grupo em "Grupos e Empresas" para configurar o plano de contas.
          </div>
        ) : (
          <>
            <div className="flex gap-1.5 border-b border-sand-200 dark:border-sand-800">
              {ABAS.map((r) => (
                <button
                  key={r.chave}
                  onClick={() => setRelatorio(r.chave)}
                  className={`px-3.5 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    relatorio === r.chave
                      ? 'border-clay-500 text-clay-700 dark:text-clay-300'
                      : 'border-transparent text-sand-500 hover:text-sand-700 dark:hover:text-sand-300'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {relatorio === ABA_CONTAS ? (
              <AbaContas empresa={empresaSelecionada} />
            ) : (
              <>
            {grupoSelecionado.empresas.length > 1 && (
              <div className="surface rounded-xl p-4 flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[220px]">
                  <label className="label !mb-1 !text-xs">Copiar estrutura completa de</label>
                  <select className="input !py-2 text-sm" value={empresaOrigemCopia} onChange={(e) => setEmpresaOrigemCopia(e.target.value)}>
                    <option value="">— selecione a empresa de origem —</option>
                    {grupoSelecionado.empresas.filter((e) => e.id !== empresaId).map((e) => (
                      <option key={e.id} value={e.id}>{e.nome}</option>
                    ))}
                  </select>
                </div>
                <button className="btn-secondary" onClick={handleCopiar} disabled={!empresaOrigemCopia}>
                  <Copy size={15} /> Copiar para {empresaSelecionada.nome}
                </button>
              </div>
            )}

            <div className="surface rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-1.5 flex-1 min-w-[240px]">
                  <input
                    className="input !py-2 text-sm flex-1"
                    placeholder="Nome do novo grupo raiz..."
                    value={novoNomeRaiz}
                    onChange={(e) => setNovoNomeRaiz(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') adicionarRaiz(); }}
                  />
                  <button className="btn-secondary" onClick={adicionarRaiz}>+ Novo grupo raiz</button>
                </div>
                <div className="flex items-center gap-3 text-xs text-sand-500 dark:text-sand-400 shrink-0">
                  <span className="flex items-center gap-1"><SinalBadge sinal="+" /> soma</span>
                  <span className="flex items-center gap-1"><SinalBadge sinal="-" /> diminui</span>
                  <span className="flex items-center gap-1"><SinalBadge sinal="=" /> subtotal</span>
                  <span className="text-sand-400">(clique no sinal pra alternar)</span>
                </div>
              </div>

              {raizes.length === 0 ? (
                <div className="rounded-lg bg-sand-100 dark:bg-sand-800 text-sm text-sand-400 text-center py-8">
                  Nenhum grupo criado ainda para {RELATORIOS.find((r) => r.chave === relatorio)?.label}.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {raizes.map((no) => (
                    <NoArvoreEstrutura key={no.id} no={no} porPai={porPai} podeEditar={podeAcessar} acoes={acoes} />
                  ))}
                </ul>
              )}
            </div>
              </>
            )}
          </>
        )}
      </div>
    </RequireAcesso>
  );
}
