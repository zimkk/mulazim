import { cn } from '@/lib/utils/cn'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function Avatar({
  name,
  url,
  className = 'size-6',
}: {
  name: string
  url?: string | null
  className?: string
}) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={cn('rounded-full object-cover', className)}
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full text-[0.625rem] font-semibold text-white shadow-xs ring-1 ring-inset ring-white/15',
        className,
      )}
      style={{
        background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))',
      }}
    >
      {initials(name)}
    </span>
  )
}
