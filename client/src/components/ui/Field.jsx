import { useId } from 'react';

const CONTROL =
  'w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-muted/60 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 disabled:bg-paper disabled:text-muted';

/**
 * One labelled control. Keeps label/hint/error wiring (and the aria
 * relationships between them) in a single place so every form in the app
 * reports errors the same way instead of each screen inventing its own.
 */
export function Field({ label, hint, error, required, children }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-ink">
        {label}
        {required && <span className="ml-1 text-fail">*</span>}
      </label>
      {children({
        id,
        'aria-describedby': [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? true : undefined,
      })}
      {hint && !error && (
        <p id={hintId} className="text-xs leading-snug text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs leading-snug text-fail">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className = '', invalid, ...props }) {
  return (
    <input
      className={`${CONTROL} h-10 ${invalid ? 'border-fail focus:border-fail focus:ring-fail/15' : ''} ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = '', rows = 4, invalid, ...props }) {
  return (
    <textarea
      rows={rows}
      className={`${CONTROL} py-2 leading-relaxed ${invalid ? 'border-fail focus:border-fail focus:ring-fail/15' : ''} ${className}`}
      {...props}
    />
  );
}

export function Select({ className = '', children, ...props }) {
  return (
    <select className={`${CONTROL} h-10 appearance-none bg-no-repeat pr-9 ${className}`} {...props}>
      {children}
    </select>
  );
}

/** Comma-separated text that reads back as tags — used for skills, companies, etc. */
export function TagInput({ value, onChange, placeholder, ...props }) {
  const tags = value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-2">
      <Input value={value} onChange={onChange} placeholder={placeholder} {...props} />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
