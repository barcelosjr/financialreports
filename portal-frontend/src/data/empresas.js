export const gruposEconomicos = [
  {
    id: 'grupo-kobe',
    contrato: 'GK-2024-0031',
    nome: 'Grupo Kobe Participações',
    plano: 'Plano Grupo — até 5 empresas',
    empresas: [
      { id: 'kobe-comercio', codigo: '001', nome: 'KOBE Comércio Ltda', cnpj: '12.345.678/0001-90' },
      { id: 'kobe-industria', codigo: '002', nome: 'KOBE Indústria S.A.', cnpj: '12.345.678/0002-71' },
      { id: 'kobe-logistica', codigo: '003', nome: 'KOBE Logística Ltda', cnpj: '12.345.678/0003-52' },
    ],
  },
  {
    id: 'grupo-royal',
    contrato: 'RY-2023-0117',
    nome: 'Rede Royal Alimentos',
    plano: 'Plano Grupo — até 10 empresas',
    empresas: [
      { id: 'royal-matriz', codigo: '010', nome: 'Royal Alimentos Matriz', cnpj: '23.456.789/0001-11' },
      { id: 'royal-sp', codigo: '011', nome: 'Royal Alimentos Filial SP', cnpj: '23.456.789/0002-92' },
      { id: 'royal-rj', codigo: '012', nome: 'Royal Alimentos Filial RJ', cnpj: '23.456.789/0003-73' },
      { id: 'royal-mg', codigo: '013', nome: 'Royal Alimentos Filial MG', cnpj: '23.456.789/0004-54' },
    ],
  },
  {
    id: 'grupo-renault',
    contrato: 'RN-2025-0004',
    nome: 'Renault Concessionárias Sul',
    plano: 'Plano Essencial — até 3 empresas',
    empresas: [
      { id: 'renault-centro', codigo: '020', nome: 'Renault Concessionária Centro', cnpj: '34.567.890/0001-20' },
      { id: 'renault-zonasul', codigo: '021', nome: 'Renault Concessionária Zona Sul', cnpj: '34.567.890/0002-01' },
    ],
  },
];

export function empresaPorId(empresaId) {
  for (const grupo of gruposEconomicos) {
    const empresa = grupo.empresas.find((e) => e.id === empresaId);
    if (empresa) return { ...empresa, grupoId: grupo.id, grupoNome: grupo.nome };
  }
  return null;
}

export function grupoPorId(grupoId) {
  return gruposEconomicos.find((g) => g.id === grupoId) || null;
}

export const todasEmpresas = gruposEconomicos.flatMap((g) =>
  g.empresas.map((e) => ({ ...e, grupoId: g.id, grupoNome: g.nome }))
);
