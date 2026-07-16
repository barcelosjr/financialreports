import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const TIPO_CONFIG = {
  sucesso: { Icon: CheckCircle2, className: 'text-gain-600 dark:text-gain-400' },
  erro: { Icon: XCircle, className: 'text-loss-500 dark:text-loss-400' },
  info: { Icon: Info, className: 'text-info-500 dark:text-info-400' },
};

function ToastItem({ toast, onFechar }) {
  const { Icon, className } = TIPO_CONFIG[toast.tipo] ?? TIPO_CONFIG.info;
  return (
    <div className="surface rounded-xl px-4 py-3 flex items-start gap-2.5 min-w-[260px] max-w-sm shadow-[var(--shadow-popover)]">
      <Icon size={18} className={`shrink-0 mt-0.5 ${className}`} />
      <p className="text-sm text-sand-700 dark:text-sand-200 flex-1">{toast.mensagem}</p>
      <button onClick={() => onFechar(toast.id)} className="text-sand-400 hover:text-sand-600 dark:hover:text-sand-200 shrink-0">
        <X size={15} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const contador = useRef(0);

  const fechar = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const mostrar = useCallback((mensagem, tipo = 'info', { duracao = 4000 } = {}) => {
    contador.current += 1;
    const id = contador.current;
    setToasts((prev) => [...prev, { id, mensagem, tipo }]);
    if (duracao) setTimeout(() => fechar(id), duracao);
    return id;
  }, [fechar]);

  const api = {
    sucesso: (mensagem, opcoes) => mostrar(mensagem, 'sucesso', opcoes),
    erro: (mensagem, opcoes) => mostrar(mensagem, 'erro', opcoes),
    info: (mensagem, opcoes) => mostrar(mensagem, 'info', opcoes),
    fechar,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onFechar={fechar} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>');
  return ctx;
}
