import { useState } from 'react'
import { Page, PageHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
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
          <ActivityTimeline items={data} loading={isLoading} />
          {data && data.length >= limit && (
            <div className="border-t border-[--color-border] p-3 text-center">
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
