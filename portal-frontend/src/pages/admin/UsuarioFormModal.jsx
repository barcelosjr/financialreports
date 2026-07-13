import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import { PAPEIS, PAPEL_LABEL, PAPEL_DESCRICAO, RELATORIOS } from '../../data/constants';

const VAZIO = {
  nome: '', email: '', papel: PAPEIS.USUARIO, grupoId: '', empresasPermitidas: 'todas', relatoriosPermitidos: ['dre'],
};

export default function UsuarioFormModal({ aberto, onClose, onSalvar, usuarioInicial, grupos, papeisPermitidos, grupoFixoId }) {
  const [form, setForm] = useState(VAZIO);

  useEffect(() => {
    if (!aberto) return;
    if (usuarioInicial) {
      setForm({
        nome: usuarioInicial.nome,
        email: usuarioInicial.email,
        papel: usuarioInicial.papel,
        grupoId: usuarioInicial.grupoId ?? '',
        empresasPermitidas: usuarioInicial.empresasPermitidas,
        relatoriosPermitidos: usuarioInicial.relatoriosPermitidos,
      });
    } else {
      setForm({ ...VAZIO, grupoId: grupoFixoId ?? '', papel: papeisPermitidos[0] });
    }
  }, [aberto, usuarioInicial, grupoFixoId, papeisPermitidos]);

  const grupoSelecionado = grupos.find((g) => g.id === form.grupoId);
  const acessoTotal = form.papel === PAPEIS.ADMIN_GRUPO || form.papel === PAPEIS.SUPER_ADMIN;

  function toggleEmpresa(empresaId) {
    setForm((f) => {
      const atual = f.empresasPermitidas === 'todas' ? [] : f.empresasPermitidas;
      const novo = atual.includes(empresaId) ? atual.filter((id) => id !== empresaId) : [...atual, empresaId];
      return { ...f, empresasPermitidas: novo };
    });
  }

  function toggleRelatorio(chave) {
    setForm((f) => ({
      ...f,
      relatoriosPermitidos: f.relatoriosPermitidos.includes(chave)
        ? f.relatoriosPermitidos.filter((r) => r !== chave)
        : [...f.relatoriosPermitidos, chave],
    }));
  }

  function handleSalvar() {
    if (!form.nome || !form.email || !form.grupoId) return;
    onSalvar({
      id: usuarioInicial?.id ?? `user-${Date.now()}`,
      nome: form.nome,
      email: form.email,
      papel: form.papel,
      grupoId: form.grupoId,
      empresasPermitidas: acessoTotal ? 'todas' : form.empresasPermitidas,
      relatoriosPermitidos: acessoTotal ? ['dre', 'balanco', 'fluxoCaixa'] : form.relatoriosPermitidos,
      status: usuarioInicial?.status ?? 'convidado',
      ultimoAcesso: usuarioInicial?.ultimoAcesso ?? null,
      acessosMes: usuarioInicial?.acessosMes ?? 0,
      relatoriosVisualizadosMes: usuarioInicial?.relatoriosVisualizadosMes ?? 0,
    });
    onClose();
  }

  return (
    <Modal
      aberto={aberto}
      onClose={onClose}
      titulo={usuarioInicial ? 'Editar usuário' : 'Novo usuário'}
      subtitulo={usuarioInicial ? usuarioInicial.email : 'Um convite será enviado por e-mail para ativar o acesso.'}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSalvar}>{usuarioInicial ? 'Salvar alterações' : 'Enviar convite'}</button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Nome</label>
            <input className="input" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="nome@empresa.com.br" />
          </div>
        </div>

        {grupos.length > 1 && (
          <div>
            <label className="label">Grupo econômico</label>
            <select className="input" value={form.grupoId} onChange={(e) => setForm((f) => ({ ...f, grupoId: e.target.value, empresasPermitidas: 'todas' }))}>
              <option value="" disabled>Selecione um grupo</option>
              {grupos.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="label">Nível de acesso</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {papeisPermitidos.map((papel) => (
              <button
                type="button"
                key={papel}
                onClick={() => setForm((f) => ({ ...f, papel }))}
                className={`text-left rounded-lg border px-3 py-2.5 transition-colors ${
                  form.papel === papel
                    ? 'border-clay-400 bg-clay-50 dark:bg-clay-700/10'
                    : 'border-sand-200 dark:border-sand-700 hover:bg-sand-50 dark:hover:bg-sand-800'
                }`}
              >
                <p className="text-sm font-medium text-sand-800 dark:text-sand-100">{PAPEL_LABEL[papel]}</p>
                <p className="text-xs text-sand-500 dark:text-sand-400 mt-0.5">{PAPEL_DESCRICAO[papel]}</p>
              </button>
            ))}
          </div>
        </div>

        {!acessoTotal && grupoSelecionado && (
          <>
            <div>
              <div className="flex items-center justify-between">
                <label className="label mb-1.5">Empresas liberadas</label>
                <button
                  type="button"
                  className="text-xs font-medium text-clay-600 dark:text-clay-400"
                  onClick={() => setForm((f) => ({ ...f, empresasPermitidas: f.empresasPermitidas === 'todas' ? [] : 'todas' }))}
                >
                  {form.empresasPermitidas === 'todas' ? 'Escolher específicas' : 'Selecionar todas'}
                </button>
              </div>
              {form.empresasPermitidas === 'todas' ? (
                <p className="text-sm text-sand-500 dark:text-sand-400 bg-sand-100 dark:bg-sand-800 rounded-lg px-3 py-2">
                  Todas as empresas do grupo (atuais e futuras)
                </p>
              ) : (
                <div className="space-y-1 max-h-32 overflow-y-auto rounded-lg border border-sand-200 dark:border-sand-700 p-2">
                  {grupoSelecionado.empresas.map((empresa) => (
                    <label key={empresa.id} className="flex items-center gap-2 text-sm text-sand-700 dark:text-sand-200 px-1 py-1 rounded hover:bg-sand-50 dark:hover:bg-sand-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.empresasPermitidas.includes(empresa.id)}
                        onChange={() => toggleEmpresa(empresa.id)}
                        className="accent-clay-500"
                      />
                      {empresa.nome}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="label">Relatórios liberados</label>
              <div className="flex flex-wrap gap-2">
                {RELATORIOS.map((r) => (
                  <label
                    key={r.chave}
                    className={`flex items-center gap-1.5 text-sm rounded-full border px-3 py-1.5 cursor-pointer transition-colors ${
                      form.relatoriosPermitidos.includes(r.chave)
                        ? 'border-clay-400 bg-clay-50 text-clay-700 dark:bg-clay-700/10 dark:text-clay-300'
                        : 'border-sand-200 dark:border-sand-700 text-sand-600 dark:text-sand-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={form.relatoriosPermitidos.includes(r.chave)}
                      onChange={() => toggleRelatorio(r.chave)}
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
