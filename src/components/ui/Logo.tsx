export function Logo({ className = 'size-5' }: { className?: string }) {
  return (
    <span className={`inline-grid shrink-0 grid-cols-2 gap-[2px] rounded bg-[--color-accent] p-[3px] ${className}`}>
      <span className="rounded-[1px] bg-white" />
      <span className="rounded-[1px] bg-white/70" />
      <span className="rounded-[1px] bg-white/70" />
      <span className="rounded-[1px] bg-white" />
    </span>
  )
}
