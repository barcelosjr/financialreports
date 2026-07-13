export const PAPEIS = {
  SUPER_ADMIN: 'super_admin',
  ADMIN_GRUPO: 'admin_grupo',
  USUARIO: 'usuario',
};

export const PAPEL_LABEL = {
  [PAPEIS.SUPER_ADMIN]: 'Super Admin',
  [PAPEIS.ADMIN_GRUPO]: 'Admin do Grupo',
  [PAPEIS.USUARIO]: 'Usuário',
};

export const PAPEL_DESCRICAO = {
  [PAPEIS.SUPER_ADMIN]: 'Acesso total a todos os grupos econômicos e empresas.',
  [PAPEIS.ADMIN_GRUPO]: 'Gerencia usuários e permissões dentro do próprio grupo econômico.',
  [PAPEIS.USUARIO]: 'Acessa apenas as empresas e relatórios liberados para ele.',
};

export const RELATORIOS = [
  { chave: 'dre', label: 'DRE', nomeCompleto: 'Demonstrativo do Resultado do Exercício' },
  { chave: 'balanco', label: 'Balanço', nomeCompleto: 'Balanço Patrimonial' },
  { chave: 'fluxoCaixa', label: 'Fluxo de Caixa', nomeCompleto: 'Demonstrativo do Fluxo de Caixa' },
];

export const PERIODOS = [
  '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
  '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
];

export const MES_LABEL = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
  '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

export function labelPeriodo(periodo) {
  const [ano, mes] = periodo.split('-');
  return `${MES_LABEL[mes]}/${ano.slice(2)}`;
}

export const PERIODO_ATUAL = PERIODOS[PERIODOS.length - 1];
