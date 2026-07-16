import { describe, it, expect } from 'vitest';
import {
  empresasVisiveis, slugify, gerarChaveContrato, moverNoLista, removerNoComDescendentes, clonarArvore,
} from '../tenant';
import { PAPEIS } from '../../data/constants';

const GRUPOS = [
  { id: 'grupo-a', nome: 'Grupo A', empresas: [{ id: 'a1' }, { id: 'a2' }] },
  { id: 'grupo-b', nome: 'Grupo B', empresas: [{ id: 'b1' }] },
];

describe('empresasVisiveis', () => {
  it('super admin vê todos os grupos', () => {
    const usuario = { papel: PAPEIS.SUPER_ADMIN };
    expect(empresasVisiveis(usuario, GRUPOS)).toBe(GRUPOS);
  });

  it('admin do grupo vê só o próprio grupo, filtrando empresas permitidas', () => {
    const usuario = { papel: PAPEIS.ADMIN_GRUPO, grupoId: 'grupo-a', empresasPermitidas: 'todas' };
    const visiveis = empresasVisiveis(usuario, GRUPOS);
    expect(visiveis).toHaveLength(1);
    expect(visiveis[0].id).toBe('grupo-a');
    expect(visiveis[0].empresas.map((e) => e.id)).toEqual(['a1', 'a2']);
  });

  it('usuário comum só vê as empresas permitidas dentro do próprio grupo', () => {
    const usuario = { papel: PAPEIS.USUARIO, grupoId: 'grupo-a', empresasPermitidas: ['a2'] };
    const visiveis = empresasVisiveis(usuario, GRUPOS);
    expect(visiveis[0].empresas.map((e) => e.id)).toEqual(['a2']);
  });

  it('retorna array vazio se o grupo do usuário não existe mais', () => {
    const usuario = { papel: PAPEIS.USUARIO, grupoId: 'grupo-inexistente', empresasPermitidas: 'todas' };
    expect(empresasVisiveis(usuario, GRUPOS)).toEqual([]);
  });
});

describe('slugify', () => {
  it('remove acentos, espaços e caixa alta', () => {
    expect(slugify('Grupo Kobe Participações')).toBe('grupo-kobe-participacoes');
  });
});

describe('gerarChaveContrato', () => {
  it('gera chave no formato PREFIXO-ANO-0000 e evita colisão com chaves existentes', () => {
    const chave = gerarChaveContrato('Grupo Kobe', new Set());
    expect(chave).toMatch(/^[A-Z]{2}-\d{4}-\d{4}$/);
  });

  it('ignora preposições ao montar o prefixo', () => {
    const chave = gerarChaveContrato('Rede de Alimentos', new Set());
    expect(chave.startsWith('RA-')).toBe(true);
  });
});

describe('moverNoLista', () => {
  const nos = [
    { id: '1', parentId: null, ordem: 0 },
    { id: '2', parentId: null, ordem: 1 },
    { id: '3', parentId: null, ordem: 2 },
  ];

  it('troca a ordem com o irmão anterior ao mover "up"', () => {
    const resultado = moverNoLista(nos, '2', 'up');
    expect(resultado.find((n) => n.id === '2').ordem).toBe(0);
    expect(resultado.find((n) => n.id === '1').ordem).toBe(1);
  });

  it('não faz nada ao mover o primeiro item para cima', () => {
    const resultado = moverNoLista(nos, '1', 'up');
    expect(resultado).toBe(nos);
  });

  it('não faz nada ao mover o último item para baixo', () => {
    const resultado = moverNoLista(nos, '3', 'down');
    expect(resultado).toBe(nos);
  });
});

describe('removerNoComDescendentes', () => {
  it('remove o nó e todos os seus descendentes', () => {
    const nos = [
      { id: '1', parentId: null },
      { id: '2', parentId: '1' },
      { id: '3', parentId: '2' },
      { id: '4', parentId: null },
    ];
    const resultado = removerNoComDescendentes(nos, '1');
    expect(resultado.map((n) => n.id)).toEqual(['4']);
  });
});

describe('clonarArvore', () => {
  it('gera novos ids preservando a hierarquia e os dados', () => {
    const original = [
      { id: 'x', nome: 'Raiz', parentId: null, ordem: 0, sinal: '+' },
      { id: 'y', nome: 'Filho', parentId: 'x', ordem: 0, sinal: '-' },
    ];
    const copia = clonarArvore(original);
    expect(copia).toHaveLength(2);
    const raiz = copia.find((n) => n.nome === 'Raiz');
    const filho = copia.find((n) => n.nome === 'Filho');
    expect(raiz.id).not.toBe('x');
    expect(filho.parentId).toBe(raiz.id);
    expect(filho.sinal).toBe('-');
  });
});
