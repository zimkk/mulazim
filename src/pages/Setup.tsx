import { Settings2 } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'

export default function Setup() {
  return (
    <div className="app-backdrop flex h-full items-center justify-center p-6">
      <Card className="w-full max-w-lg" elevation="md">
        <CardBody className="space-y-4 p-7">
          <div className="flex items-center gap-2.5">
            <Logo className="size-6" />
            <span className="text-sm font-semibold tracking-tight">Mulazim</span>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-attention)]/10 text-[var(--color-attention)] ring-1 ring-inset ring-[var(--color-attention)]/20">
              <Settings2 className="size-5" />
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Supabase isn’t configured</h1>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Create a{' '}
                <code className="rounded bg-[var(--color-surface-2)] px-1 font-mono text-xs">.env</code>{' '}
                file at the project root (copy from{' '}
                <code className="rounded bg-[var(--color-surface-2)] px-1 font-mono text-xs">
                  .env.example
                </code>
                ) and set:
              </p>
            </div>
          </div>

          <pre className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3.5 font-mono text-xs leading-relaxed">
            {`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key`}
          </pre>

          <p className="text-sm text-[var(--color-text-muted)]">
            Then restart the dev server. See{' '}
            <code className="rounded bg-[var(--color-surface-2)] px-1 font-mono text-xs">README.md</code>{' '}
            for the full backend setup.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
