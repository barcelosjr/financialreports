// Funções puras de domínio (multi-tenant: grupos/empresas/estrutura de
// contas) usadas pelo TenantContext/EstruturaContext. Extraídas do
// AppContext para poderem ser testadas isoladamente, sem precisar montar
// um <AppProvider>.
import { PAPEIS } from '../data/constants';
import { usuarioPodeVerEmpresa } from '../data/usuarios';

export function empresasVisiveis(usuario, grupos) {
  if (usuario.papel === PAPEIS.SUPER_ADMIN) return grupos;
  const grupo = grupos.find((g) => g.id === usuario.grupoId);
  if (!grupo) return [];
  const empresas = grupo.empresas.filter((e) => usuarioPodeVerEmpresa(usuario, e.id));
  return [{ ...grupo, empresas }];
}

export function slugify(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const PALAVRAS_IGNORADAS_PREFIXO = new Set(['de', 'da', 'do', 'e']);

// Chave de contrato gerada automaticamente (sem edição manual na tela de
// cadastro) assim que o grupo tiver ao menos uma empresa — hoje é só um
// identificador; no futuro deve disparar a geração do contrato empresarial
// em PDF e o envio por e-mail para o sócio/administrador de cada empresa
// assinar (ver README, seção "Próximos passos").
export function gerarChaveContrato(nomeGrupo, chavesExistentes) {
  const palavras = nomeGrupo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/\s+/)
    .filter((p) => p && !PALAVRAS_IGNORADAS_PREFIXO.has(p.toLowerCase()));
  const prefixo = ((palavras[0]?.[0] || 'G') + (palavras[1]?.[0] || palavras[0]?.[1] || 'X')).toUpperCase();
  const ano = new Date().getFullYear();

  let chave;
  do {
    const sequencial = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    chave = `${prefixo}-${ano}-${sequencial}`;
  } while (chavesExistentes.has(chave));

  return chave;
}

let contadorNo = 0;
export function proximoIdNo() {
  contadorNo += 1;
  return `no-${Date.now()}-${contadorNo}`;
}

export function moverNoLista(nos, nodeId, direcao) {
  const alvo = nos.find((n) => n.id === nodeId);
  if (!alvo) return nos;
  const irmaos = nos.filter((n) => n.parentId === alvo.parentId).sort((a, b) => a.ordem - b.ordem);
  const idx = irmaos.findIndex((n) => n.id === nodeId);
  const idxTroca = direcao === 'up' ? idx - 1 : idx + 1;
  if (idxTroca < 0 || idxTroca >= irmaos.length) return nos;
  const outro = irmaos[idxTroca];
  return nos.map((n) => {
    if (n.id === alvo.id) return { ...n, ordem: outro.ordem };
    if (n.id === outro.id) return { ...n, ordem: alvo.ordem };
    return n;
  });
}

export function removerNoComDescendentes(nos, nodeId) {
  const idsRemover = new Set([nodeId]);
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const n of nos) {
      if (n.parentId && idsRemover.has(n.parentId) && !idsRemover.has(n.id)) {
        idsRemover.add(n.id);
        mudou = true;
      }
    }
  }
  return nos.filter((n) => !idsRemover.has(n.id));
}

export function clonarArvore(nos) {
  const mapaIds = new Map(nos.map((n) => [n.id, proximoIdNo()]));
  return nos.map((n) => ({
    id: mapaIds.get(n.id),
    nome: n.nome,
    parentId: n.parentId ? mapaIds.get(n.parentId) : null,
    ordem: n.ordem,
    sinal: n.sinal,
  }));
}
