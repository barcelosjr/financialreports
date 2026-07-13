import { useState } from 'react';
import { Plus, Pencil, Trash2, KeyRound, Package } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PAPEIS } from '../../data/constants';
import RequireAcesso from '../../components/RequireAcesso';
import GrupoFormModal from './GrupoFormModal';
import EmpresaFormModal from './EmpresaFormModal';

export default function GruposEmpresas() {
  const {
    usuarioAtual, grupos, adicionarGrupo, atualizarGrupo, removerGrupo,
    adicionarEmpresa, atualizarEmpresa, removerEmpresa,
  } = useApp();
  const ehSuperAdmin = usuarioAtual.papel === PAPEIS.SUPER_ADMIN;

  const [modalGrupo, setModalGrupo] = useState(null); // null | 'novo' | grupo
  const [modalEmpresa, setModalEmpresa] = useState(null); // null | { grupo, empresa? }

  function salvarGrupo(dados) {
    if (modalGrupo === 'novo') adicionarGrupo(dados);
    else atualizarGrupo(modalGrupo.id, dados);
  }

  function excluirGrupo(grupo) {
    if (window.confirm(`Excluir o grupo "${grupo.nome}" e todas as suas ${grupo.empresas.length} empresa(s)? Isso também afeta os usuários vinculados a ele.`)) {
      removerGrupo(grupo.id);
    }
  }

  function salvarEmpresa(dados) {
    if (modalEmpresa.empresa) atualizarEmpresa(modalEmpresa.grupo.id, modalEmpresa.empresa.id, dados);
    else adicionarEmpresa(modalEmpresa.grupo.id, dados);
  }

  function excluirEmpresa(grupo, empresa) {
    if (window.confirm(`Remover a empresa "${empresa.nome}" do grupo "${grupo.nome}"?`)) {
      removerEmpresa(grupo.id, empresa.id);
    }
  }

  return (
    <RequireAcesso permitido={ehSuperAdmin}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-serif font-semibold text-sand-900 dark:text-sand-50">Grupos Econômicos e Empresas</h2>
            <p className="text-sm text-sand-500 dark:text-sand-400">Cadastre os clientes da plataforma (grupos) e as empresas de cada um.</p>
          </div>
          <button className="btn-primary" onClick={() => setModalGrupo('novo')}>
            <Plus size={16} /> Novo grupo econômico
          </button>
        </div>

        {grupos.length === 0 && (
          <div className="surface rounded-xl p-10 text-center text-sm text-sand-400">Nenhum grupo econômico cadastrado ainda.</div>
        )}

        <div className="space-y-4">
          {grupos.map((grupo) => (
            <div key={grupo.id} className="surface rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-sand-900 dark:text-sand-50">{grupo.nome}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-sand-500 dark:text-sand-400">
                    <span className="flex items-center gap-1"><KeyRound size={12} /> {grupo.contrato}</span>
                    <span className="flex items-center gap-1"><Package size={12} /> {grupo.plano}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setModalGrupo(grupo)}>
                    <Pencil size={13} /> Editar
                  </button>
                  <button className="btn-secondary !px-3 !py-1.5 text-xs text-loss-600 dark:text-loss-400" onClick={() => excluirGrupo(grupo)}>
                    <Trash2 size={13} /> Excluir
                  </button>
                  <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => setModalEmpresa({ grupo, empresa: null })}>
                    <Plus size={13} /> Nova empresa
                  </button>
                </div>
              </div>

              {grupo.empresas.length === 0 ? (
                <div className="rounded-lg bg-sand-100 dark:bg-sand-800 text-sm text-sand-400 text-center py-6">
                  Nenhuma empresa cadastrada neste grupo ainda.
                </div>
              ) : (
                <div className="rounded-lg border border-sand-150 dark:border-sand-800 overflow-hidden overflow-x-auto">
                  <table className="w-full min-w-[520px]">
                    <thead>
                      <tr className="border-b border-sand-150 dark:border-sand-800 bg-sand-50/60 dark:bg-sand-900/40">
                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-2.5 pl-4 pr-2">Código</th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-2.5 pr-2">Razão social</th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-sand-400 py-2.5 pr-2">CNPJ</th>
                        <th className="py-2.5 pr-4" />
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.empresas.map((empresa) => (
                        <tr key={empresa.id} className="border-b border-sand-100 dark:border-sand-800/60 last:border-0 hover:bg-sand-50/60 dark:hover:bg-sand-800/30">
                          <td className="py-2.5 pl-4 pr-2 text-sm text-sand-600 dark:text-sand-300 tabular-nums">{empresa.codigo}</td>
                          <td className="py-2.5 pr-2 text-sm font-medium text-sand-800 dark:text-sand-100">{empresa.nome}</td>
                          <td className="py-2.5 pr-2 text-sm text-sand-500 dark:text-sand-400">{empresa.cnpj}</td>
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center justify-end gap-1">
                              <button className="btn-ghost !p-1.5" title="Editar" onClick={() => setModalEmpresa({ grupo, empresa })}>
                                <Pencil size={14} />
                              </button>
                              <button className="btn-ghost !p-1.5 text-loss-600 dark:text-loss-400" title="Remover" onClick={() => excluirEmpresa(grupo, empresa)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>

        <GrupoFormModal
          aberto={modalGrupo !== null}
          onClose={() => setModalGrupo(null)}
          onSalvar={salvarGrupo}
          grupoInicial={modalGrupo && modalGrupo !== 'novo' ? modalGrupo : null}
        />

        <EmpresaFormModal
          aberto={modalEmpresa !== null}
          onClose={() => setModalEmpresa(null)}
          onSalvar={salvarEmpresa}
          empresaInicial={modalEmpresa?.empresa ?? null}
          grupoNome={modalEmpresa?.grupo?.nome}
        />
      </div>
    </RequireAcesso>
  );
}
