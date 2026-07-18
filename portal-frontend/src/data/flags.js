// Flags de migração mock -> backend real, um por "costura" (ver PLANO.md).
// Cada contexto/módulo lê o seu e decide a fonte de dados sozinho; com o
// flag desligado o mock atual fica intacto.
export const FLAGS = {
  ESTRUTURA: import.meta.env.VITE_USE_BACKEND_ESTRUTURA === 'true',
  TENANT: import.meta.env.VITE_USE_BACKEND_TENANT === 'true',
  SESSAO: import.meta.env.VITE_USE_BACKEND_SESSAO === 'true',
  FINANCEIRO: import.meta.env.VITE_USE_BACKEND_FINANCEIRO === 'true',
};
