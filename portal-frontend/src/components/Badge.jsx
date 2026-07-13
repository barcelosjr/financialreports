import { PAPEIS, PAPEL_LABEL } from '../data/constants';

const PAPEL_CLASSES = {
  [PAPEIS.SUPER_ADMIN]: 'bg-clay-100 text-clay-700 dark:bg-clay-700/20 dark:text-clay-300',
  [PAPEIS.ADMIN_GRUPO]: 'bg-info-50 text-info-600 dark:bg-info-600/20 dark:text-info-400',
  [PAPEIS.USUARIO]: 'bg-sand-150 text-sand-600 dark:bg-sand-800 dark:text-sand-300',
};

export function PapelBadge({ papel }) {
  return <span className={`badge ${PAPEL_CLASSES[papel]}`}>{PAPEL_LABEL[papel]}</span>;
}

const STATUS_CONFIG = {
  ativo: { label: 'Ativo', className: 'bg-gain-50 text-gain-600 dark:bg-gain-700/20 dark:text-gain-400' },
  convidado: { label: 'Convite pendente', className: 'bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400' },
  inativo: { label: 'Inativo', className: 'bg-sand-150 text-sand-500 dark:bg-sand-800 dark:text-sand-400' },
};

export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.inativo;
  return <span className={`badge ${cfg.className}`}>{cfg.label}</span>;
}

const SINAL_CONFIG = {
  '+': { simbolo: '+', titulo: 'Soma no total', className: 'bg-gain-50 text-gain-600 dark:bg-gain-700/20 dark:text-gain-400' },
  '-': { simbolo: '−', titulo: 'Diminui do total', className: 'bg-loss-50 text-loss-600 dark:bg-loss-700/20 dark:text-loss-400' },
  '=': { simbolo: '=', titulo: 'Linha de subtotal', className: 'bg-clay-100 text-clay-700 dark:bg-clay-700/20 dark:text-clay-300' },
};

export function SinalBadge({ sinal, onClick }) {
  const cfg = SINAL_CONFIG[sinal] ?? SINAL_CONFIG['+'];
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={onClick ? `${cfg.titulo} — clique para alternar` : cfg.titulo}
      className={`badge !px-0 w-5 h-5 justify-center font-mono font-semibold shrink-0 ${cfg.className} ${onClick ? 'cursor-pointer hover:opacity-75' : ''}`}
    >
      {cfg.simbolo}
    </Tag>
  );
}
