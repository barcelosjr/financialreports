import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, MailPlus, Ban, CheckCircle, Copy, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { usuarios as usuariosIniciais } from '../../data/usuarios';
import { PAPEIS, RELATORIOS } from '../../data/constants';
import { formatarDataRelativa } from '../../lib/format';
import { PapelBadge, StatusBadge } from '../../components/Badge';
import RequireAcesso from '../../components/RequireAcesso';
import Modal from '../../components/Modal';
import UsuarioFormModal from './UsuarioFormModal';
import { apiGet, apiPost, apiPut } from '../../data/api';
import { FLAGS } from '../../data/flags';

function SenhaTemporariaModal({ dados, onClose }) {
  const [copiado, setCopiado] = useState(false);

  function copiar() {
    navigator.clipboard?.writeText(dados.senha).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    });
  }

  return (
    <Modal
      aberto={dados !== null}
      onClose={onClose}
      titulo="Usuário criado"
      subtitulo="Repasse esta senha temporária pro usuário -- ela só aparece agora."
      footer={<button className="btn-primary" onClick={onClose}>Fechar</button>}
    >
      {dados && (
        <div className="space-y-3">
          <p className="text-sm text-sand-600 dark:text-sand-300">
            <span className="font-medium text-sand-800 dark:text-sand-100">{dados.nome}</span> ({dados.email}) já pode
            entrar com a senha abaixo (troca-se o fluxo de convite por e-mail numa fase futura).
          </p>
          <div className="flex items-center gap-2 rounded-lg bg-sand-100 dark:bg-sand-800 px-3.5 py-2.5">
            <code className="flex-1 text-sm font-mono text-sand-800 dark:text-sand-100">{dados.senha}</code>
            <button className="btn-ghost !p-1.5" onClick={copiar} title="Copiar">
              {copiado ? <Check size={15} className="text-gain-600" /> : <Copy size={15} />}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Usuarios() {
  const { usuarioAtual, grupos: todosGrupos, grupoPorId } = useApp();
  const ehSuperAdmin = usuarioAtual.papel === PAPEIS.SUPER_ADMIN;
  const podeAdministrar = usuarioAtual.papel !== PAPEIS.USUARIO;

  const [listaMock, setListaMock] = useState(usuariosIniciais);
  const [listaApi, setListaApi] = useState([]);
  const [filtroGrupo, setFiltroGrupo] = useState('todos');
  const [modal, setModal] = useState(null); // null | 'novo' | usuario
  const [senhaGerada, setSenhaGerada] = useState(null); // null | { nome, email, senha }

  useEffect(() => {
    if (!FLAGS.TENANT || !podeAdministrar) return;
    const grupoId = ehSuperAdmin && filtroGrupo !== 'todos' ? filtroGrupo : undefined;
    apiGet('/usuarios', { params: grupoId ? { grupoId } : undefined })
      .then(setListaApi)
      .catch((err) => console.error('Falha ao carregar usuários:', err));
  }, [ehSuperAdmin, filtroGrupo, podeAdministrar]);

  const lista = FLAGS.TENANT ? listaApi : listaMock;
  const grupos = ehSuperAdmin ? todosGrupos : todosGrupos.filter((g) => g.id === usuarioAtual.grupoId);
  const papeisPermitidos = ehSuperAdmin ? [PAPEIS.ADMIN_GRUPO, PAPEIS.USUARIO] : [PAPEIS.USUARIO];

  const usuariosVisiveis = useMemo(() => {
    const base = ehSuperAdmin ? lista : lista.filter((u) => u.grupoId === usuarioAtual.grupoId);
    if (ehSuperAdmin && filtroGrupo !== 'todos' && !FLAGS.TENANT) return base.filter((u) => u.grupoId === filtroGrupo);
    return base;
  }, [lista, ehSuperAdmin, usuarioAtual.grupoId, filtroGrupo]);

  function salvarUsuario(dados) {
    if (FLAGS.TENANT) {
      if (dados.id) {
        apiPut(`/usuarios/${dados.id}`, { body: dados })
          .then((atualizado) => setListaApi((prev) => prev.map((u) => (u.id === atualizado.id ? atualizado : u))))
          .catch((err) => window.alert('Falha ao salvar usuário: ' + err.message));
      } else {
        apiPost('/usuarios', { body: dados })
          .then(({ usuario, senhaTemporaria }) => {
            setListaApi((prev) => [usuario, ...prev]);
            setSenhaGerada({ nome: usuario.nome, email: usuario.email, senha: senhaTemporaria });
          })
          .catch((err) => window.alert('Falha ao criar usuário: ' + err.message));
      }
      return;
    }

    setListaMock((prev) => {
      const anterior = prev.find((u) => u.id === dados.id);
      const completo = {
        ...dados,
        id: dados.id ?? `user-${Date.now()}`,
        status: anterior?.status ?? 'convidado',
        ultimoAcesso: anterior?.ultimoAcesso ?? null,
        acessosMes: anterior?.acessosMes ?? 0,
        relatoriosVisualizadosMes: anterior?.relatoriosVisualizadosMes ?? 0,
      };
      return anterior ? prev.map((u) => (u.id === completo.id ? completo : u)) : [completo, ...prev];
    });
  }

  function alternarStatus(usuario) {
    const novoStatus = usuario.status === 'inativo' ? 'ativo' : 'inativo';
    if (FLAGS.TENANT) {
      apiPut(`/usuarios/${usuario.id}`, { body: { status: novoStatus } })
        .then((atualizado) => setListaApi((prev) => prev.map((u) => (u.id === atualizado.id ? atualizado : u))))
        .catch((err) => window.alert('Falha ao atualizar status: ' + err.message));
      return;
    }
    setListaMock((prev) => prev.map((u) => (u.id === usuario.id ? { ...u, status: novoStatus } : u)));
  }

  return (
    <RequireAcesso permitido={podeAdministrar}>
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-serif font-semibold text-sand-900 dark:text-sand-50">Usuários e níveis de acesso</h2>
          <p className="text-sm text-sand-500 dark:text-sand-400">
            {ehSuperAdmin ? 'Todos os grupos econômicos da plataforma.' : `Usuários do grupo ${grupoPorId(usuarioAtual.grupoId)?.nome}.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ehSuperAdmin && (
            <select className="input !w-auto !py-2 text-sm" value={filtroGrupo} onChange={(e) => setFiltroGrupo(e.target.value)}>
              <option value="todos">Todos os grupos</option>
              {todosGrupos.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
          )}
          <button className="btn-primary" onClick={() => setModal('novo')}>
            <Plus size={16} /> Novo usuário
          </button>
        </div>
      </div>

      <div className="surface rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead>
            <tr className="border-b border-sand-150 dark:border-sand-800">
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pl-4 pr-2">Usuário</th>
              {ehSuperAdmin && <th className="text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pr-2">Grupo</th>}
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pr-2">Nível</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pr-2">Empresas</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pr-2">Relatórios</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pr-2">Status</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-3 pr-2">Último acesso</th>
              <th className="py-3 pr-4" />
            </tr>
          </thead>
          <tbody>
            {usuariosVisiveis.map((u) => {
              const grupo = grupoPorId(u.grupoId);
              const acessoTotalRelatorios = u.papel !== PAPEIS.USUARIO;
              return (
                <tr key={u.id} className="border-b border-sand-100 dark:border-sand-800/60 last:border-0 hover:bg-sand-50/60 dark:hover:bg-sand-800/30">
                  <td className="py-3 pl-4 pr-2">
                    <p className="text-sm font-medium text-sand-800 dark:text-sand-100">{u.nome}</p>
                    <p className="text-xs text-sand-400">{u.email}</p>
                  </td>
                  {ehSuperAdmin && <td className="py-3 pr-2 text-sm text-sand-600 dark:text-sand-300">{grupo?.nome ?? '—'}</td>}
                  <td className="py-3 pr-2"><PapelBadge papel={u.papel} /></td>
                  <td className="py-3 pr-2 text-sm text-sand-600 dark:text-sand-300">
                    {u.empresasPermitidas === 'todas' ? 'Todas' : `${u.empresasPermitidas.length} empresa(s)`}
                  </td>
                  <td className="py-3 pr-2 text-sm text-sand-600 dark:text-sand-300">
                    {acessoTotalRelatorios ? 'Todos' : u.relatoriosPermitidos.map((r) => RELATORIOS.find((rr) => rr.chave === r)?.label).join(', ')}
                  </td>
                  <td className="py-3 pr-2"><StatusBadge status={u.status} /></td>
                  <td className="py-3 pr-2 text-sm text-sand-500 dark:text-sand-400">{formatarDataRelativa(u.ultimoAcesso)}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center justify-end gap-1">
                      {u.status === 'convidado' && (
                        <button className="btn-ghost !p-1.5" title="Reenviar convite">
                          <MailPlus size={15} />
                        </button>
                      )}
                      <button className="btn-ghost !p-1.5" title="Editar" onClick={() => setModal(u)}>
                        <Pencil size={15} />
                      </button>
                      {u.id !== usuarioAtual.id && (
                        <button
                          className="btn-ghost !p-1.5"
                          title={u.status === 'inativo' ? 'Reativar' : 'Desativar'}
                          onClick={() => alternarStatus(u)}
                        >
                          {u.status === 'inativo' ? <CheckCircle size={15} /> : <Ban size={15} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {usuariosVisiveis.length === 0 && (
              <tr><td colSpan={8} className="text-center text-sm text-sand-400 py-8">Nenhum usuário encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <UsuarioFormModal
        aberto={modal !== null}
        onClose={() => setModal(null)}
        onSalvar={salvarUsuario}
        usuarioInicial={modal && modal !== 'novo' ? modal : null}
        grupos={grupos}
        papeisPermitidos={papeisPermitidos}
        grupoFixoId={!ehSuperAdmin ? usuarioAtual.grupoId : undefined}
      />

      <SenhaTemporariaModal dados={senhaGerada} onClose={() => setSenhaGerada(null)} />
    </div>
    </RequireAcesso>
  );
}
