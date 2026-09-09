import { Panel } from './Panel.jsx';

/**
 * Velzon-style metric tile: quiet label, one large number, an optional
 * supporting line, and a tinted icon. The number is the point — everything
 * else stays out of its way.
 */
export default function StatCard({ label, value, sublabel, icon: Icon, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-soft text-brand',
    pass: 'bg-pass-soft text-pass',
    pending: 'bg-pending-soft text-pending',
    aptitude: 'bg-aptitude-soft text-aptitude',
    gd: 'bg-gd-soft text-gd',
    technical: 'bg-technical-soft text-technical',
    hr: 'bg-hr-soft text-hr',
  };

  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        {Icon && (
          <span className={`flex size-9 items-center justify-center rounded-lg ${tones[tone]}`}>
            <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-[30px] font-semibold leading-none tracking-tight text-ink">
        {value}
      </p>
      {sublabel && <p className="mt-2 text-[13px] text-muted">{sublabel}</p>}
    </Panel>
  );
}
