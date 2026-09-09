import { ROUND_META, STATUS_LABEL, STATUS_TONE } from './meta.js';

const TONES = {
  pass: 'bg-pass-soft text-pass',
  fail: 'bg-fail-soft text-fail',
  pending: 'bg-pending-soft text-pending',
  neutral: 'bg-ink/5 text-muted',
  brand: 'bg-brand-soft text-brand',
};

export function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** A pass/fail/in-progress state, always rendered with the same words and colour. */
export function StatusBadge({ status, className = '' }) {
  if (!status) return null;
  const tone = STATUS_TONE[status] ?? 'neutral';
  return (
    <Badge tone={tone} className={className}>
      <span className={`size-1.5 rounded-full ${tone === 'neutral' ? 'bg-muted' : 'bg-current'}`} />
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

/** Which interview round something belongs to — the app's primary wayfinding signal. */
export function RoundBadge({ roundType, className = '' }) {
  const meta = ROUND_META[roundType];
  if (!meta) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${meta.soft} ${meta.text} ${className}`}
    >
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
