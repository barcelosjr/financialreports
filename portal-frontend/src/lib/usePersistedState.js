import { useEffect, useState } from 'react';

// Mesmo padrão do tema em SessaoContext (localStorage, chave "fr-*"): estado
// que sobrevive a trocar de tela e voltar (o componente desmonta/remonta) e a
// fechar e reabrir a página, sem precisar de backend para isso.
export function usePersistedState(chave, valorInicial) {
  const [estado, setEstado] = useState(() => {
    if (typeof window === 'undefined') return valorInicial;
    try {
      const salvo = localStorage.getItem(chave);
      return salvo !== null ? JSON.parse(salvo) : valorInicial;
    } catch {
      return valorInicial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(chave, JSON.stringify(estado));
    } catch {
      // Quota excedida ou localStorage indisponível — perde a persistência,
      // mas não quebra a tela.
    }
  }, [chave, estado]);

  return [estado, setEstado];
}
