import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ aberto, onClose, titulo, subtitulo, children, footer, largura = 'max-w-lg' }) {
  useEffect(() => {
    if (!aberto) return undefined;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [aberto, onClose]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-sand-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative w-full ${largura} max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-sand-900 shadow-[var(--shadow-popover)]`}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-sand-150 dark:border-sand-800">
          <div>
            <h3 className="text-base font-semibold text-sand-900 dark:text-sand-50">{titulo}</h3>
            {subtitulo && <p className="text-sm text-sand-500 dark:text-sand-400 mt-0.5">{subtitulo}</p>}
          </div>
          <button onClick={onClose} className="text-sand-400 hover:text-sand-600 dark:hover:text-sand-200 -mr-1">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-sand-150 dark:border-sand-800 flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
