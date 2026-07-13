import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, PlugZap } from 'lucide-react';
import Modal from '../../components/Modal';
import { TIPOS_CONEXAO, CAMPOS_POWERBI, testarConexaoPowerBI } from '../../data/conexao';

const VAZIO = {
  codigo: '', nome: '', cnpj: '',
  conexaoTipo: '',
  tenantId: '', clientId: '', clientSecret: '', groupId: '', datasetId: '',
};

function camposConexaoDoForm(form) {
  return {
    tenantId: form.tenantId,
    clientId: form.clientId,
    clientSecret: form.clientSecret,
    groupId: form.groupId,
    datasetId: form.datasetId,
  };
}

export default function EmpresaFormModal({ aberto, onClose, onSalvar, empresaInicial, grupoNome }) {
  const [form, setForm] = useState(VAZIO);
  const [teste, setTeste] = useState(null); // null | 'testando' | { ok, mensagem }
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    const c = empresaInicial?.conexao;
    setForm(
      empresaInicial
        ? {
            codigo: empresaInicial.codigo,
            nome: empresaInicial.nome,
            cnpj: empresaInicial.cnpj,
            conexaoTipo: c?.tipo ?? '',
            tenantId: c?.tenantId ?? '',
            clientId: c?.clientId ?? '',
            clientSecret: c?.clientSecret ?? '',
            groupId: c?.groupId ?? '',
            datasetId: c?.datasetId ?? '',
          }
        : VAZIO
    );
    setTeste(c?.status === 'conectado' ? { ok: true, mensagem: 'Conexão validada com sucesso — modelo semântico acessível.' } : null);
  }, [aberto, empresaInicial]);

  function set(campo) {
    return (e) => {
      setForm((f) => ({ ...f, [campo]: e.target.value }));
      setTeste(null);
    };
  }

  async function handleTestar() {
    setTeste('testando');
    const resultado = await testarConexaoPowerBI(camposConexaoDoForm(form));
    setTeste(resultado);
  }

  async function handleSalvar() {
    if (!form.codigo || !form.nome) return;

    let conexao = null;
    if (form.conexaoTipo === 'powerbi') {
      setSalvando(true);
      const resultado = await testarConexaoPowerBI(camposConexaoDoForm(form));
      setTeste(resultado);
      setSalvando(false);
      if (!resultado.ok) return;
      conexao = { tipo: 'powerbi', ...camposConexaoDoForm(form), status: 'conectado', testadoEm: new Date().toISOString() };
    }

    onSalvar({ codigo: form.codigo, nome: form.nome, cnpj: form.cnpj, conexao });
    onClose();
  }

  return (
    <Modal
      aberto={aberto}
      onClose={onClose}
      titulo={empresaInicial ? 'Editar empresa' : 'Nova empresa'}
      subtitulo={grupoNome ? `Grupo: ${grupoNome}` : undefined}
      largura="max-w-xl"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSalvar} disabled={salvando}>
            {salvando && <Loader2 size={15} className="animate-spin" />}
            {empresaInicial ? 'Salvar alterações' : 'Adicionar empresa'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-4">
          <div>
            <label className="label">Código</label>
            <input className="input" value={form.codigo} onChange={set('codigo')} placeholder="Ex: 004" />
          </div>
          <div>
            <label className="label">Razão social</label>
            <input className="input" value={form.nome} onChange={set('nome')} placeholder="Ex: KOBE Distribuição Ltda" />
          </div>
        </div>
        <div>
          <label className="label">CNPJ</label>
          <input className="input" value={form.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0001-00" />
        </div>

        <div className="pt-2 border-t border-sand-150 dark:border-sand-800">
          <label className="label mt-3">Tipo de conexão dos dados</label>
          <p className="text-xs text-sand-500 dark:text-sand-400 mb-2">
            Necessária para gerar os relatórios desta empresa (DRE, Balanço, Fluxo de Caixa).
          </p>
          <select className="input" value={form.conexaoTipo} onChange={set('conexaoTipo')}>
            <option value="">— Não configurado —</option>
            {TIPOS_CONEXAO.map((t) => (
              <option key={t.valor} value={t.valor}>{t.label}</option>
            ))}
          </select>
        </div>

        {form.conexaoTipo === 'powerbi' && (
          <div className="space-y-3 rounded-lg bg-sand-100 dark:bg-sand-800 p-3.5">
            {CAMPOS_POWERBI.map((campo) => (
              <div key={campo.chave}>
                <label className="label !mb-1 !text-xs">{campo.label}</label>
                <input
                  className="input !py-2 text-sm font-mono"
                  type={campo.sensivel ? 'password' : 'text'}
                  value={form[campo.chave]}
                  onChange={set(campo.chave)}
                  placeholder={campo.placeholder}
                  autoComplete="off"
                />
              </div>
            ))}

            <button type="button" className="btn-secondary w-full justify-center" onClick={handleTestar} disabled={teste === 'testando'}>
              {teste === 'testando' ? <Loader2 size={15} className="animate-spin" /> : <PlugZap size={15} />}
              Testar conexão
            </button>

            {teste && teste !== 'testando' && (
              <div
                className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${
                  teste.ok
                    ? 'bg-gain-50 text-gain-700 dark:bg-gain-700/15 dark:text-gain-400'
                    : 'bg-loss-50 text-loss-700 dark:bg-loss-700/15 dark:text-loss-400'
                }`}
              >
                {teste.ok ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <XCircle size={16} className="shrink-0 mt-0.5" />}
                <span>{teste.mensagem}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
