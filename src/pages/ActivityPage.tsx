import { useState } from 'react'
import { Activity } from 'lucide-react'
import { Page, PageHeader } from '@/components/layout/AppShell'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/States'
import { ActivityTimeline } from '@/components/activity/ActivityTimeline'
import { useRecentActivity } from '@/lib/api/activity'

export default function ActivityPage() {
  const [limit, setLimit] = useState(50)
  const { data, isLoading, isError, refetch } = useRecentActivity(limit)

  return (
    <Page>
      <PageHeader title="Activity" subtitle="Everything that's happened across your work." />
      {isError ? (
        <ErrorState message="Unable to load activity." onRetry={refetch} />
      ) : (
        <Card>
          <CardHeader title="Timeline" icon={<Activity className="size-3.5" />} count={data?.length} />
          <ActivityTimeline items={data} loading={isLoading} />
          {data && data.length >= limit && (
            <div className="border-t border-[var(--color-border)] p-3 text-center">
              <Button size="sm" onClick={() => setLimit((l) => l + 50)}>
                Load more
              </Button>
            </div>
          )}
        </Card>
      )}
    </Page>
  )
}
