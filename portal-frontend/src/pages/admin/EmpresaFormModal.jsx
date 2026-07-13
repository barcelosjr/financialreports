import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';

const VAZIO = { codigo: '', nome: '', cnpj: '' };

export default function EmpresaFormModal({ aberto, onClose, onSalvar, empresaInicial, grupoNome }) {
  const [form, setForm] = useState(VAZIO);

  useEffect(() => {
    if (!aberto) return;
    setForm(empresaInicial ? { codigo: empresaInicial.codigo, nome: empresaInicial.nome, cnpj: empresaInicial.cnpj } : VAZIO);
  }, [aberto, empresaInicial]);

  function handleSalvar() {
    if (!form.codigo || !form.nome) return;
    onSalvar(form);
    onClose();
  }

  return (
    <Modal
      aberto={aberto}
      onClose={onClose}
      titulo={empresaInicial ? 'Editar empresa' : 'Nova empresa'}
      subtitulo={grupoNome ? `Grupo: ${grupoNome}` : undefined}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSalvar}>{empresaInicial ? 'Salvar alterações' : 'Adicionar empresa'}</button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Código</label>
          <input
            className="input"
            value={form.codigo}
            onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
            placeholder="Ex: 004"
          />
        </div>
        <div>
          <label className="label">Razão social</label>
          <input
            className="input"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            placeholder="Ex: KOBE Distribuição Ltda"
          />
        </div>
        <div>
          <label className="label">CNPJ</label>
          <input
            className="input"
            value={form.cnpj}
            onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
            placeholder="00.000.000/0001-00"
          />
        </div>
      </div>
    </Modal>
  );
}
