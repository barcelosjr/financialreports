import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import Modal from '../../components/Modal';

const VAZIO = { nome: '', plano: '' };

export default function GrupoFormModal({ aberto, onClose, onSalvar, grupoInicial }) {
  const [form, setForm] = useState(VAZIO);

  useEffect(() => {
    if (!aberto) return;
    setForm(grupoInicial ? { nome: grupoInicial.nome, plano: grupoInicial.plano } : VAZIO);
  }, [aberto, grupoInicial]);

  function handleSalvar() {
    if (!form.nome) return;
    onSalvar(form);
    onClose();
  }

  return (
    <Modal
      aberto={aberto}
      onClose={onClose}
      titulo={grupoInicial ? 'Editar grupo econômico' : 'Novo grupo econômico'}
      subtitulo="Cada grupo é um cliente da plataforma, identificado por uma chave de contrato."
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSalvar}>{grupoInicial ? 'Salvar alterações' : 'Criar grupo'}</button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Nome do grupo</label>
          <input
            className="input"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            placeholder="Ex: Grupo Kobe Participações"
          />
        </div>
        <div>
          <label className="label">Plano</label>
          <input
            className="input"
            value={form.plano}
            onChange={(e) => setForm((f) => ({ ...f, plano: e.target.value }))}
            placeholder="Ex: Plano Grupo — até 5 empresas"
          />
        </div>

        <div className="rounded-lg bg-sand-100 dark:bg-sand-800 px-3.5 py-3 flex items-start gap-2.5">
          <KeyRound size={15} className="text-sand-400 mt-0.5 shrink-0" />
          {grupoInicial?.contrato ? (
            <p className="text-sm text-sand-600 dark:text-sand-300">
              Chave de contrato: <span className="font-medium text-sand-800 dark:text-sand-100">{grupoInicial.contrato}</span>
              <br />
              <span className="text-xs text-sand-400">Gerada automaticamente, não pode ser editada.</span>
            </p>
          ) : (
            <p className="text-sm text-sand-500 dark:text-sand-400">
              A chave de contrato é gerada automaticamente quando a primeira empresa deste grupo for cadastrada.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
