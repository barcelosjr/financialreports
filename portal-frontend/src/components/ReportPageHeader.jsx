import { FileDown, Sheet } from 'lucide-react';

export default function ReportPageHeader({ titulo, subtitulo }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-serif font-semibold text-sand-900 dark:text-sand-50">{titulo}</h2>
        <p className="text-sm text-sand-500 dark:text-sand-400">{subtitulo}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-secondary !px-3 !py-2" disabled title="Exportação será habilitada na integração final">
          <FileDown size={15} /> PDF
        </button>
        <button className="btn-secondary !px-3 !py-2" disabled title="Exportação será habilitada na integração final">
          <Sheet size={15} /> Excel
        </button>
      </div>
    </div>
  );
}
