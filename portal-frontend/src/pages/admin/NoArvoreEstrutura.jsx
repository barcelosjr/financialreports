import { useState } from 'react';
import { Plus, Pencil, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { SinalBadge } from '../../components/Badge';

export default function NoArvoreEstrutura({ no, porPai, podeEditar, acoes }) {
  const [editando, setEditando] = useState(false);
  const [nomeEdicao, setNomeEdicao] = useState(no.nome);
  const [mostrarAdd, setMostrarAdd] = useState(false);
  const [nomeNovo, setNomeNovo] = useState('');

  const filhos = (porPai.get(no.id) || []).slice().sort((a, b) => a.ordem - b.ordem);

  function confirmarRenomear() {
    const nome = nomeEdicao.trim();
    if (nome && nome !== no.nome) acoes.renomear(no.id, nome);
    else setNomeEdicao(no.nome);
    setEditando(false);
  }

  function confirmarAdicionar() {
    const nome = nomeNovo.trim();
    if (!nome) return;
    acoes.adicionar(nome, no.id);
    setNomeNovo('');
    setMostrarAdd(false);
  }

  return (
    <li>
      <div className="flex items-center gap-1.5 rounded-lg bg-sand-50 dark:bg-sand-900/40 px-2.5 py-1.5">
        <SinalBadge sinal={no.sinal} onClick={podeEditar ? () => acoes.alterarSinal(no.id) : undefined} />
        {editando ? (
          <input
            className="input !py-1 text-sm flex-1"
            autoFocus
            value={nomeEdicao}
            onChange={(e) => setNomeEdicao(e.target.value)}
            onBlur={confirmarRenomear}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmarRenomear();
              if (e.key === 'Escape') { setNomeEdicao(no.nome); setEditando(false); }
            }}
          />
        ) : (
          <span className="flex-1 text-sm text-sand-700 dark:text-sand-200">{no.nome}</span>
        )}

        {podeEditar && !editando && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button className="btn-ghost !p-1" onClick={() => setMostrarAdd((v) => !v)} title="Adicionar subitem">
              <Plus size={13} />
            </button>
            <button className="btn-ghost !p-1" onClick={() => setEditando(true)} title="Renomear">
              <Pencil size={13} />
            </button>
            <button className="btn-ghost !p-1" onClick={() => acoes.mover(no.id, 'up')} title="Mover para cima">
              <ChevronUp size={13} />
            </button>
            <button className="btn-ghost !p-1" onClick={() => acoes.mover(no.id, 'down')} title="Mover para baixo">
              <ChevronDown size={13} />
            </button>
            <button
              className="btn-ghost !p-1 text-loss-600 dark:text-loss-400"
              title="Excluir"
              onClick={() => {
                const aviso = filhos.length > 0 ? ` e ${filhos.length} subitem(ns)` : '';
                if (window.confirm(`Excluir "${no.nome}"${aviso}?`)) acoes.remover(no.id);
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {mostrarAdd && (
        <div className="flex items-center gap-1.5 mt-1.5 ml-2">
          <input
            className="input !py-1.5 text-sm flex-1"
            autoFocus
            placeholder="Nome do subitem..."
            value={nomeNovo}
            onChange={(e) => setNomeNovo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') confirmarAdicionar(); if (e.key === 'Escape') setMostrarAdd(false); }}
          />
          <button className="btn-secondary !px-2.5 !py-1.5 text-xs" onClick={confirmarAdicionar}>Adicionar</button>
        </div>
      )}

      {filhos.length > 0 && (
        <ul className="ml-4 mt-1.5 space-y-1.5 border-l border-sand-200 dark:border-sand-800 pl-3">
          {filhos.map((filho) => (
            <NoArvoreEstrutura key={filho.id} no={filho} porPai={porPai} podeEditar={podeEditar} acoes={acoes} />
          ))}
        </ul>
      )}
    </li>
  );
}
