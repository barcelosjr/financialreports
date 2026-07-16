import { createContext, useCallback, useContext, useRef, useState } from 'react';
import Modal from '../Modal';

const ConfirmContext = createContext(null);

// Substitui window.confirm nativo por um modal on-brand. Uso:
//   const confirmar = useConfirm();
//   const ok = await confirmar({ titulo: 'Remover empresa?', mensagem: '...', destrutivo: true });
export function ConfirmProvider({ children }) {
  const [pedido, setPedido] = useState(null);
  const resolverRef = useRef(null);

  const confirmar = useCallback((opcoes) => {
    setPedido(opcoes);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  function responder(valor) {
    resolverRef.current?.(valor);
    setPedido(null);
  }

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      <Modal
        aberto={!!pedido}
        onClose={() => responder(false)}
        titulo={pedido?.titulo ?? 'Confirmar ação'}
        subtitulo={pedido?.mensagem}
        footer={
          <>
            <button className="btn-secondary" onClick={() => responder(false)}>
              {pedido?.textoCancelar ?? 'Cancelar'}
            </button>
            <button
              className={pedido?.destrutivo ? 'btn-primary !bg-loss-500 hover:!bg-loss-600' : 'btn-primary'}
              onClick={() => responder(true)}
            >
              {pedido?.textoConfirmar ?? 'Confirmar'}
            </button>
          </>
        }
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm precisa estar dentro de <ConfirmProvider>');
  return ctx;
}
