import { Page } from '@/components/layout/AppShell'
import { Card, CardBody } from '@/components/ui/Card'

export default function Setup() {
  return (
    <div className="flex h-full items-center justify-center bg-[--color-bg]">
      <Page>
        <Card className="max-w-lg">
          <CardBody className="space-y-3">
            <h1 className="text-base font-semibold">Supabase isn’t configured</h1>
            <p className="text-sm text-[--color-text-muted]">
              Create a <code className="rounded bg-[--color-surface-2] px-1">.env</code> file at the
              project root (copy from <code>.env.example</code>) and set:
            </p>
            <pre className="overflow-x-auto rounded-md bg-[--color-surface-2] p-3 text-xs">
              {`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key`}
            </pre>
            <p className="text-sm text-[--color-text-muted]">
              Then restart the dev server. See <code>README.md</code> for the full backend setup.
            </p>
          </CardBody>
        </Card>
      </Page>
    </div>
  )
}
