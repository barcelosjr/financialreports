import { useState } from 'react';
import { Plus, X, Search, Download, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RELATORIOS, PERIODOS, labelPeriodo } from '../../data/constants';
import { formatarDataHora } from '../../lib/format';
import { caminhosPorNo, opcoesOrdenadas } from '../../lib/estrutura';

function FormularioTag({ empresaId, conta, onFechar }) {
  const { obterNosEstrutura, adicionarTagConta } = useApp();
  const [relatorio, setRelatorio] = useState(RELATORIOS[0].chave);
  const [nodeId, setNodeId] = useState('');

  const opcoes = opcoesOrdenadas(obterNosEstrutura(empresaId, relatorio));

  function confirmar() {
    if (!nodeId) return;
    adicionarTagConta(empresaId, conta, { relatorio, nodeId });
    onFechar();
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2 bg-sand-100 dark:bg-sand-800 rounded-lg p-2">
      <select
        className="input !py-1.5 !w-auto text-xs"
        value={relatorio}
        onChange={(e) => { setRelatorio(e.target.value); setNodeId(''); }}
      >
        {RELATORIOS.map((r) => <option key={r.chave} value={r.chave}>{r.label}</option>)}
      </select>
      <select className="input !py-1.5 text-xs flex-1 min-w-[200px]" value={nodeId} onChange={(e) => setNodeId(e.target.value)}>
        <option value="">— selecione o grupo —</option>
        {opcoes.map((o) => <option key={o.id} value={o.id}>{o.caminho}</option>)}
      </select>
      <button className="btn-secondary !px-2.5 !py-1.5 text-xs" onClick={confirmar} disabled={!nodeId}>Adicionar</button>
      <button className="btn-ghost !p-1.5" onClick={onFechar} title="Cancelar">
        <X size={13} />
      </button>
      {opcoes.length === 0 && (
        <p className="text-xs text-amber-500 w-full">
          Nenhum grupo criado ainda em {RELATORIOS.find((r) => r.chave === relatorio)?.label} para esta empresa.
        </p>
      )}
    </div>
  );
}

function BlocoImportar({ empresa, importadoEm, totalContasAtual, onImportado }) {
  const { importarContasEmpresa } = useApp();
  const [importando, setImportando] = useState(false);
  const conectado = empresa.conexao?.status === 'conectado';
  const periodo = `${labelPeriodo(PERIODOS[0])} a ${labelPeriodo(PERIODOS[PERIODOS.length - 1])}`;

  function handleImportar() {
    if (importadoEm) {
      const confirmado = window.confirm(
        `Isso vai sobrescrever o plano de contas atual (${totalContasAtual} conta${totalContasAtual === 1 ? '' : 's'} importada${totalContasAtual === 1 ? '' : 's'}) desta empresa. As tags de contas que não vierem na nova importação ficam órfãs. Contas adicionadas manualmente não são afetadas. Continuar?`
      );
      if (!confirmado) return;
    }
    setImportando(true);
    setTimeout(() => {
      importarContasEmpresa(empresa.id);
      setImportando(false);
      onImportado?.();
    }, 1100);
  }

  return (
    <div className="surface rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-sand-800 dark:text-sand-100">Importar plano de contas dos lançamentos</p>
        <p className="text-xs text-sand-500 dark:text-sand-400 mt-0.5">
          Traz as contas únicas e a descrição de cada uma, a partir dos lançamentos contábeis do período de {periodo}.
        </p>
        {!conectado ? (
          <p className="text-xs text-amber-500 mt-1">
            Configure e teste a conexão Power BI desta empresa em "Grupos e Empresas" antes de importar.
          </p>
        ) : importadoEm ? (
          <p className="text-xs text-gain-600 dark:text-gain-400 mt-1 flex items-center gap-1">
            <CheckCircle2 size={12} /> Última importação: {formatarDataHora(importadoEm)}
          </p>
        ) : null}
      </div>
      <button className="btn-primary shrink-0" onClick={handleImportar} disabled={!conectado || importando}>
        {importando ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        {importando ? 'Importando...' : importadoEm ? 'Reimportar' : 'Importar plano de contas'}
      </button>
    </div>
  );
}

function FormularioNovaConta({ empresaId, onFechar }) {
  const { adicionarContaManual } = useApp();
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState('');

  function confirmar() {
    const codigoLimpo = codigo.trim();
    const descricaoLimpa = descricao.trim();
    if (!codigoLimpo || !descricaoLimpa) {
      setErro('Preencha código e descrição.');
      return;
    }
    const { duplicada } = adicionarContaManual(empresaId, { conta: codigoLimpo, descricao: descricaoLimpa });
    if (duplicada) {
      setErro(`Já existe uma conta com o código "${codigoLimpo}".`);
      return;
    }
    setCodigo('');
    setDescricao('');
    setErro('');
    onFechar();
  }

  return (
    <div className="p-4 border-b border-sand-150 dark:border-sand-800 bg-sand-50/60 dark:bg-sand-900/40">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-40">
          <label className="label !mb-1 !text-xs">Código</label>
          <input
            className="input !py-1.5 text-sm font-mono"
            placeholder="Ex: 5.1.01.001"
            value={codigo}
            onChange={(e) => { setCodigo(e.target.value); setErro(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') confirmar(); }}
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="label !mb-1 !text-xs">Descrição</label>
          <input
            className="input !py-1.5 text-sm"
            placeholder="Ex: Despesas com Marketing"
            value={descricao}
            onChange={(e) => { setDescricao(e.target.value); setErro(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') confirmar(); }}
          />
        </div>
        <button className="btn-primary !py-1.5" onClick={confirmar}>Adicionar</button>
        <button className="btn-ghost !py-1.5" onClick={onFechar}>Cancelar</button>
      </div>
      {erro && <p className="text-xs text-loss-500 dark:text-loss-400 mt-1.5">{erro}</p>}
    </div>
  );
}

function BadgeOrigem({ origem }) {
  const manual = origem === 'manual';
  return (
    <span
      className={`badge text-[10px] shrink-0 ${
        manual
          ? 'bg-clay-100 text-clay-700 dark:bg-clay-700/20 dark:text-clay-300'
          : 'bg-info-50 text-info-600 dark:bg-info-600/15 dark:text-info-400'
      }`}
    >
      {manual ? 'Manual' : 'Importado'}
    </span>
  );
}

export default function AbaContas({ empresa }) {
  const empresaId = empresa.id;
  const { obterNosEstrutura, obterTagsConta, removerTagConta, obterImportacaoContas, removerContaManual } = useApp();
  const [busca, setBusca] = useState('');
  const [contaAbertaTag, setContaAbertaTag] = useState(null);
  const [mostrarNovaConta, setMostrarNovaConta] = useState(false);

  const { contas, importadoEm } = obterImportacaoContas(empresaId);

  const caminhosPorRelatorio = Object.fromEntries(
    RELATORIOS.map((r) => [r.chave, caminhosPorNo(obterNosEstrutura(empresaId, r.chave))])
  );

  const termo = busca.trim().toLowerCase();
  const contasFiltradas = contas.filter(
    (c) => !termo || c.conta.toLowerCase().includes(termo) || c.descricao.toLowerCase().includes(termo)
  );

  return (
    <div className="space-y-4">
      <BlocoImportar empresa={empresa} importadoEm={importadoEm} totalContasAtual={contas.length} onImportado={() => setBusca('')} />

      <div className="surface rounded-xl overflow-hidden">
        <div className="p-4 border-b border-sand-150 dark:border-sand-800 flex flex-wrap items-center justify-between gap-3">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-sand-400" />
            <input
              className="input !pl-9 text-sm"
              placeholder="Buscar conta ou descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button className="btn-secondary !py-1.5 text-xs" onClick={() => setMostrarNovaConta((v) => !v)}>
              <Plus size={13} /> Nova conta
            </button>
            <span className="text-xs text-sand-400">{contasFiltradas.length} conta(s)</span>
          </div>
        </div>

        {mostrarNovaConta && (
          <FormularioNovaConta empresaId={empresaId} onFechar={() => setMostrarNovaConta(false)} />
        )}

        {contas.length === 0 ? (
          <div className="p-10 text-center text-sm text-sand-400">
            Nenhuma conta cadastrada ainda para esta empresa. Importe do Power BI acima ou adicione manualmente.
          </div>
        ) : (
          <div className="divide-y divide-sand-100 dark:divide-sand-800 max-h-[60vh] overflow-y-auto">
            {contasFiltradas.map((c) => {
              const tags = obterTagsConta(empresaId, c.conta);
              const abertaAqui = contaAbertaTag === c.conta;
              return (
                <div key={c.conta} className="p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono text-sand-500 dark:text-sand-400">{c.conta}</span>
                      <span className="text-sm font-medium text-sand-800 dark:text-sand-100">{c.descricao}</span>
                      <BadgeOrigem origem={c.origem} />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        className="btn-ghost !px-2 !py-1 text-xs"
                        onClick={() => setContaAbertaTag(abertaAqui ? null : c.conta)}
                      >
                        <Plus size={13} /> Tag
                      </button>
                      {c.origem === 'manual' && (
                        <button
                          className="btn-ghost !p-1.5 text-loss-600 dark:text-loss-400"
                          title="Remover conta"
                          onClick={() => {
                            if (window.confirm(`Remover a conta "${c.conta}"? As tags associadas a ela deixam de aparecer.`)) {
                              removerContaManual(empresaId, c.conta);
                            }
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tags.map((tag, i) => (
                        <span
                          key={`${tag.relatorio}-${tag.nodeId}`}
                          className="badge bg-info-50 text-info-600 dark:bg-info-600/15 dark:text-info-400 gap-1.5"
                        >
                          <span className="font-semibold">{RELATORIOS.find((r) => r.chave === tag.relatorio)?.label}:</span>
                          {caminhosPorRelatorio[tag.relatorio]?.get(tag.nodeId) ?? '(grupo removido)'}
                          <button onClick={() => removerTagConta(empresaId, c.conta, i)} className="hover:text-loss-600 dark:hover:text-loss-400" title="Remover tag">
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {abertaAqui && (
                    <FormularioTag empresaId={empresaId} conta={c.conta} onFechar={() => setContaAbertaTag(null)} />
                  )}
                </div>
              );
            })}

            {contasFiltradas.length === 0 && (
              <div className="p-8 text-center text-sm text-sand-400">Nenhuma conta encontrada.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
