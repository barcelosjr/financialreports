// Ponte leve entre TenantContext e EstruturaContext pra resolver
// empresaId -> código quando o flag VITE_USE_BACKEND_TENANT está ligado.
//
// Por quê um módulo simples em vez de contexto: EstruturaProvider fica
// ACIMA de TenantProvider na árvore (AppContext.jsx) porque hoje é o
// TenantContext quem depende do EstruturaContext (inicializarEstruturaEmpresa/
// removerEstruturaEmpresa ao cadastrar/remover empresa) -- então
// EstruturaContext não pode chamar useTenant() sem criar uma dependência
// circular entre os dois provedores. TenantContext atualiza este registro
// (fora do ciclo de render do React) sempre que sua lista de grupos muda;
// EstruturaContext só lê.
let mapaEmpresaIdParaCodigo = {};

export function atualizarRegistroEmpresas(grupos) {
  const novoMapa = {};
  grupos.forEach((g) => g.empresas.forEach((e) => { novoMapa[e.id] = e.codigo; }));
  mapaEmpresaIdParaCodigo = novoMapa;
}

export function codigoDaEmpresaRegistrada(empresaId) {
  return mapaEmpresaIdParaCodigo[empresaId] ?? null;
}
