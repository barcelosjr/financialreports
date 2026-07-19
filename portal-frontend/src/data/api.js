// Cliente HTTP para o backend (PHP na Hostinger, Node em dev/spec) --
// mesmo contrato dos dois: base configurável, header de auth, erro lido de
// { error }. Fica atrás dos flags VITE_USE_BACKEND_* (ver flags.js): cada
// costura decide, por conta própria, se usa este cliente ou o mock local.

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

// Token de sessão real (Fase 2, JWT) -- SessaoContext chama setSessionToken
// sempre que login/logout/hidratação de página mudam o token. Enquanto não
// há um (flag VITE_USE_BACKEND_SESSAO desligada, ou usuário deslogado), as
// chamadas continuam com X-API-KEY (Fase 1), sem quebrar essa costura.
let sessionToken = null;
export function setSessionToken(token) {
  sessionToken = token || null;
}

function montarQueryString(params) {
  if (!params) return '';
  const entradas = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entradas.length === 0) return '';
  const usp = new URLSearchParams();
  entradas.forEach(([chave, valor]) => usp.set(chave, valor));
  return `?${usp.toString()}`;
}

function montarUrl(path, params) {
  return `${API_BASE}/api${path}${montarQueryString(params)}`;
}

async function request(method, path, { params, body } = {}) {
  const headers = sessionToken ? { Authorization: `Bearer ${sessionToken}` } : { 'X-API-KEY': API_KEY };
  const init = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const res = await fetch(montarUrl(path, params), init);
  const texto = await res.text();

  let dados = null;
  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      dados = null;
    }
  }

  if (!res.ok) {
    throw new Error(dados?.error || `Erro ${res.status} ao chamar ${path}.`);
  }
  return dados;
}

export const apiGet = (path, opts) => request('GET', path, opts);
export const apiPost = (path, opts) => request('POST', path, opts);
export const apiPut = (path, opts) => request('PUT', path, opts);
export const apiDelete = (path, opts) => request('DELETE', path, opts);
