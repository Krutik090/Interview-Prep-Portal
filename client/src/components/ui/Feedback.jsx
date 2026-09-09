import { AlertCircle, Loader2 } from 'lucide-react';
import Button from './Button.jsx';

export function Spinner({ size = 16, className = '' }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function LoadingState({ label = 'Loading' }) {
  return (
    <div className="flex items-center gap-2 px-5 py-10 text-sm text-muted" role="status">
      <Spinner />
      {label}
    </div>
  );
}

/** Skeleton rows for tables/lists, so the layout doesn't jump when data lands. */
export function SkeletonRows({ rows = 3, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-ink/5" />
      ))}
    </div>
  );
}

/** An empty screen is an invitation to act — always offer the next step. */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      {Icon && (
        <span className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
        </span>
      )}
      <div className="max-w-sm">
        <p className="font-display text-[15px] font-semibold text-ink">{title}</p>
        {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Errors explain what happened and how to fix it — never a bare "failed". */
export function ErrorState({ title = 'Something went wrong', description, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-fail-soft text-fail">
        <AlertCircle size={20} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="max-w-sm">
        <p className="font-display text-[15px] font-semibold text-ink">{title}</p>
        {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function InlineError({ children }) {
  if (!children) return null;
  return (
    <p className="flex items-start gap-1.5 rounded-lg bg-fail-soft px-3 py-2 text-[13px] text-fail">
      <AlertCircle size={15} className="mt-px shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
