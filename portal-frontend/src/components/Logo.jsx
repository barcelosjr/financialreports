function Mark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="9" className="fill-clay-500" />
      <path d="M9 22V16.5C9 15.6716 9.67157 15 10.5 15H12.5C13.3284 15 14 15.6716 14 16.5V22" stroke="#FAF9F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 22V11.5C14.5 10.6716 15.1716 10 16 10H18C18.8284 10 19.5 10.6716 19.5 11.5V22" stroke="#FAF9F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 22V13.5C20 12.6716 20.6716 12 21.5 12H23.5C24.3284 12 25 12.6716 25 13.5V22" stroke="#FAF9F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({ size = 'md', className = '' }) {
  const sizes = {
    sm: { mark: 24, text: 'text-sm' },
    md: { mark: 32, text: 'text-lg' },
    lg: { mark: 40, text: 'text-2xl' },
  };
  const s = sizes[size];
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Mark size={s.mark} />
      <span className={`font-serif font-semibold tracking-tight text-sand-900 dark:text-sand-50 ${s.text}`}>
        Financial Reports
      </span>
    </div>
  );
}

export { Mark };
