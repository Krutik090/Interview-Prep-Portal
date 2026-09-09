import { Link } from 'react-router-dom';

const VARIANTS = {
  primary:
    'bg-brand text-white border-brand hover:bg-brand-hover disabled:bg-brand/45 disabled:border-transparent',
  secondary:
    'bg-surface text-ink border-line-strong hover:bg-paper hover:border-muted/50 disabled:text-muted/60',
  ghost: 'bg-transparent text-ink border-transparent hover:bg-ink/5 disabled:text-muted/60',
  danger: 'bg-surface text-fail border-fail/35 hover:bg-fail-soft disabled:text-fail/50',
  success: 'bg-pass text-white border-pass hover:bg-pass/90 disabled:bg-pass/45',
};

const SIZES = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  icon: Icon,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg border font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2} aria-hidden="true" />}
      {children}
    </button>
  );
}

/** Same styling as Button, but renders a real link — never nest one in the other. */
export function ButtonLink({
  to,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon,
  children,
  ...props
}) {
  return (
    <Link
      to={to}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg border font-medium no-underline transition-colors ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2} aria-hidden="true" />}
      {children}
    </Link>
  );
}
