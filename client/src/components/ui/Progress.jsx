export function ProgressBar({ value, total, tone = 'brand', showLabel = true }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const tones = {
    brand: 'bg-brand',
    pass: 'bg-pass',
    fail: 'bg-fail',
    pending: 'bg-pending',
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/8"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div className={`h-full rounded-full ${tones[tone]}`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && (
        <span className="shrink-0 text-xs font-medium tabular-nums text-muted">
          {value}/{total}
        </span>
      )}
    </div>
  );
}

/**
 * A score out of 100. Pass `threshold` only where one genuinely applies
 * (an enrollment against its program's pass mark) — a module score is shown
 * neutrally, because the module's own status badge already says whether it
 * counted, and colouring it red next to a green "Completed" badge reads as
 * a contradiction.
 */
export function ScorePill({ score, threshold = null }) {
  if (score == null) return <span className="text-sm text-muted">—</span>;

  const tone =
    threshold == null
      ? 'bg-ink/6 text-ink'
      : score >= threshold
        ? 'bg-pass-soft text-pass'
        : 'bg-fail-soft text-fail';

  return (
    <span
      className={`inline-flex items-baseline gap-0.5 rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums ${tone}`}
    >
      {score}
      <span className="text-[11px] font-medium opacity-70">%</span>
    </span>
  );
}
