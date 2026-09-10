export function Logo({ className = 'size-5' }: { className?: string }) {
  return (
    <span
      className={`inline-grid shrink-0 grid-cols-2 gap-[2px] rounded-[0.3em] p-[0.15em] shadow-xs ring-1 ring-inset ring-white/15 ${className}`}
      style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))' }}
    >
      <span className="rounded-[0.1em] bg-white" />
      <span className="rounded-[0.1em] bg-white/65" />
      <span className="rounded-[0.1em] bg-white/65" />
      <span className="rounded-[0.1em] bg-white" />
    </span>
  )
}
