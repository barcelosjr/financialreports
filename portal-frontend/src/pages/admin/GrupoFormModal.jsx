import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';

const VAZIO = { nome: '', contrato: '', plano: '' };

export default function GrupoFormModal({ aberto, onClose, onSalvar, grupoInicial }) {
  const [form, setForm] = useState(VAZIO);

  useEffect(() => {
    if (!aberto) return;
    setForm(grupoInicial ? { nome: grupoInicial.nome, contrato: grupoInicial.contrato, plano: grupoInicial.plano } : VAZIO);
  }, [aberto, grupoInicial]);

  function handleSalvar() {
    if (!form.nome || !form.contrato) return;
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
          <label className="label">Chave de contrato</label>
          <input
            className="input"
            value={form.contrato}
            onChange={(e) => setForm((f) => ({ ...f, contrato: e.target.value }))}
            placeholder="Ex: GK-2026-0001"
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
      </div>
    </Modal>
  );
}
