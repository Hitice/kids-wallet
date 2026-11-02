import { useId, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-teal-700 text-white hover:bg-teal-800 disabled:bg-stone-300 disabled:text-stone-600',
  secondary:
    'bg-white text-stone-900 ring-1 ring-inset ring-stone-300 hover:bg-stone-100 disabled:text-stone-400',
  danger: 'bg-white text-red-800 ring-1 ring-inset ring-red-300 hover:bg-red-50',
  ghost: 'text-teal-800 hover:bg-teal-50 underline-offset-4 hover:underline',
};

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-base font-semibold transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function LinkButton({
  href,
  variant = 'primary',
  children,
  className = '',
}: {
  href: string;
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-base font-semibold no-underline transition-colors ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </a>
  );
}

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  const id = useId();
  return (
    <section
      aria-labelledby={title ? id : undefined}
      className={`rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6 ${className}`}
    >
      {title && (
        <h2 id={id} className="mb-3 text-lg font-semibold text-stone-900">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

type Tone = 'info' | 'warning' | 'error' | 'success';

const TONES: Record<Tone, string> = {
  info: 'border-sky-300 bg-sky-50 text-sky-950',
  warning: 'border-amber-300 bg-amber-50 text-amber-950',
  error: 'border-red-300 bg-red-50 text-red-950',
  success: 'border-emerald-300 bg-emerald-50 text-emerald-950',
};

export function Alert({ tone = 'info', title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border p-3 text-sm sm:text-base ${TONES[tone]}`}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? 'mt-1' : ''}>{children}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block font-medium text-stone-900">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-stone-600">
          {hint}
        </p>
      )}
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error && (
        <p id={errorId} className="text-sm font-medium text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  'block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 placeholder:text-stone-500 aria-invalid:border-red-600';

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('failed');
    }
    window.setTimeout(() => setState('idle'), 2000);
  };
  return (
    <Button variant="secondary" onClick={copy} className="text-sm">
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}
      <span className="sr-only" aria-live="polite">
        {state === 'copied' ? 'Copied to clipboard' : ''}
      </span>
    </Button>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-stone-700">
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-teal-700"
      />
      {label}
    </span>
  );
}

export function Mono({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <code className={`font-mono text-sm break-all text-stone-800 ${className}`}>{children}</code>;
}

export function PageTitle({ children, lead }: { children: ReactNode; lead?: ReactNode }) {
  return (
    <header className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{children}</h1>
      {lead && <p className="text-stone-700">{lead}</p>}
    </header>
  );
}

export function NetworkBadge({ network }: { network: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-amber-900 uppercase">
      {network}
    </span>
  );
}
