import { PAPEIS } from './constants';

// empresasPermitidas: 'todas' (todas as empresas do grupo, atuais e futuras) ou array de ids de empresa.
// relatoriosPermitidos: array com 'dre' | 'balanco' | 'fluxoCaixa'.
export const usuarios = [
  {
    id: 'user-super-admin',
    nome: 'Júlio Barcelos',
    email: 'juliobarcelos08@gmail.com',
    papel: PAPEIS.SUPER_ADMIN,
    grupoId: null,
    empresasPermitidas: 'todas',
    relatoriosPermitidos: ['dre', 'balanco', 'fluxoCaixa'],
    status: 'ativo',
    ultimoAcesso: '2026-07-11T09:14:00',
    acessosMes: 62,
    relatoriosVisualizadosMes: 140,
  },
  {
    id: 'user-kobe-admin',
    nome: 'Marina Kobayashi',
    email: 'marina@grupokobe.com.br',
    papel: PAPEIS.ADMIN_GRUPO,
    grupoId: 'grupo-kobe',
    empresasPermitidas: 'todas',
    relatoriosPermitidos: ['dre', 'balanco', 'fluxoCaixa'],
    status: 'ativo',
    ultimoAcesso: '2026-07-10T18:32:00',
    acessosMes: 24,
    relatoriosVisualizadosMes: 51,
  },
  {
    id: 'user-kobe-1',
    nome: 'Carlos Eduardo Lima',
    email: 'carlos.lima@grupokobe.com.br',
    papel: PAPEIS.USUARIO,
    grupoId: 'grupo-kobe',
    empresasPermitidas: ['kobe-comercio'],
    relatoriosPermitidos: ['dre'],
    status: 'ativo',
    ultimoAcesso: '2026-07-09T11:05:00',
    acessosMes: 9,
    relatoriosVisualizadosMes: 12,
  },
  {
    id: 'user-kobe-2',
    nome: 'Patrícia Nogueira',
    email: 'patricia.nogueira@grupokobe.com.br',
    papel: PAPEIS.USUARIO,
    grupoId: 'grupo-kobe',
    empresasPermitidas: ['kobe-industria', 'kobe-logistica'],
    relatoriosPermitidos: ['dre', 'fluxoCaixa'],
    status: 'convidado',
    ultimoAcesso: null,
    acessosMes: 0,
    relatoriosVisualizadosMes: 0,
  },
  {
    id: 'user-royal-admin',
    nome: 'Fernanda Souza',
    email: 'fernanda@royalalimentos.com.br',
    papel: PAPEIS.ADMIN_GRUPO,
    grupoId: 'grupo-royal',
    empresasPermitidas: 'todas',
    relatoriosPermitidos: ['dre', 'balanco', 'fluxoCaixa'],
    status: 'ativo',
    ultimoAcesso: '2026-07-11T08:47:00',
    acessosMes: 33,
    relatoriosVisualizadosMes: 78,
  },
  {
    id: 'user-royal-1',
    nome: 'Paulo Henrique Rocha',
    email: 'paulo.rocha@royalalimentos.com.br',
    papel: PAPEIS.USUARIO,
    grupoId: 'grupo-royal',
    empresasPermitidas: ['royal-sp'],
    relatoriosPermitidos: ['dre', 'balanco'],
    status: 'ativo',
    ultimoAcesso: '2026-07-08T14:20:00',
    acessosMes: 6,
    relatoriosVisualizadosMes: 15,
  },
  {
    id: 'user-royal-2',
    nome: 'Juliana Alves',
    email: 'juliana.alves@royalalimentos.com.br',
    papel: PAPEIS.USUARIO,
    grupoId: 'grupo-royal',
    empresasPermitidas: ['royal-matriz', 'royal-rj'],
    relatoriosPermitidos: ['dre', 'fluxoCaixa'],
    status: 'ativo',
    ultimoAcesso: '2026-07-05T16:02:00',
    acessosMes: 4,
    relatoriosVisualizadosMes: 7,
  },
  {
    id: 'user-royal-3',
    nome: 'Diego Martins',
    email: 'diego.martins@royalalimentos.com.br',
    papel: PAPEIS.USUARIO,
    grupoId: 'grupo-royal',
    empresasPermitidas: ['royal-mg'],
    relatoriosPermitidos: ['dre'],
    status: 'inativo',
    ultimoAcesso: '2026-05-22T10:00:00',
    acessosMes: 0,
    relatoriosVisualizadosMes: 0,
  },
  {
    id: 'user-renault-admin',
    nome: 'Ricardo Nunes',
    email: 'ricardo@renaultsul.com.br',
    papel: PAPEIS.ADMIN_GRUPO,
    grupoId: 'grupo-renault',
    empresasPermitidas: 'todas',
    relatoriosPermitidos: ['dre', 'balanco', 'fluxoCaixa'],
    status: 'ativo',
    ultimoAcesso: '2026-07-11T07:58:00',
    acessosMes: 19,
    relatoriosVisualizadosMes: 40,
  },
  {
    id: 'user-renault-1',
    nome: 'Bianca Ferreira',
    email: 'bianca.ferreira@renaultsul.com.br',
    papel: PAPEIS.USUARIO,
    grupoId: 'grupo-renault',
    empresasPermitidas: ['renault-centro'],
    relatoriosPermitidos: ['dre', 'balanco', 'fluxoCaixa'],
    status: 'ativo',
    ultimoAcesso: '2026-07-10T13:41:00',
    acessosMes: 11,
    relatoriosVisualizadosMes: 22,
  },
];

export function usuariosPorGrupo(grupoId) {
  return usuarios.filter((u) => u.grupoId === grupoId);
}

export function usuarioPodeVerEmpresa(usuario, empresaId) {
  if (usuario.papel === PAPEIS.SUPER_ADMIN) return true;
  if (usuario.empresasPermitidas === 'todas') return true;
  return usuario.empresasPermitidas.includes(empresaId);
}

export function usuarioPodeVerRelatorio(usuario, relatorioChave) {
  if (usuario.papel === PAPEIS.SUPER_ADMIN) return true;
  return usuario.relatoriosPermitidos.includes(relatorioChave);
}
