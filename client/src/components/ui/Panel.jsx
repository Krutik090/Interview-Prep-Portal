export function Panel({ className = '', children, ...props }) {
  return (
    <section
      className={`rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(20,22,31,0.04)] ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}

export function PanelHeader({ title, description, actions, className = '' }) {
  return (
    <header
      className={`flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 ${className}`}
    >
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

export function PanelBody({ className = '', children }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}
