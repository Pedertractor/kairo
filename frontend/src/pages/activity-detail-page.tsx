import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { UpdateActivityStatusDialog } from '@/components/update-activity-status-dialog'
import { ActivityStatusActions } from '@/components/activity-status-actions'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-handler'
import { CardTimeBudget } from '@/components/card-time-budget'
import type { ActivityResponse, ActivitySummary } from '@/types/card'

export function ActivityDetailPage() {
  const { teamId, activityId } = useParams<{
    teamId: string
    activityId: string
  }>()
  const [activity, setActivity] = useState<ActivitySummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)

  useEffect(() => {
    if (!teamId || !activityId) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function loadActivity() {
      setIsLoading(true)

      try {
        const data = await api<ActivityResponse>(
          `/teams/${teamId}/activities/${activityId}`,
        )
        if (!cancelled) {
          setActivity(data.activity)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadActivity()

    return () => {
      cancelled = true
    }
  }, [teamId, activityId])

  async function reloadActivity() {
    if (!teamId || !activityId) {
      return
    }

    const data = await api<ActivityResponse>(
      `/teams/${teamId}/activities/${activityId}`,
    )
    setActivity(data.activity)
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link to={teamId ? `/equipes/${teamId}` : '/equipes'} />}
        >
          <ArrowLeft />
          Voltar para equipe
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-6 w-24" />
        </div>
      ) : activity ? (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold">{activity.title}</h1>
              {teamId ? (
                <ActivityStatusActions
                  teamId={teamId}
                  activity={activity}
                  onStatusClick={() => setIsStatusDialogOpen(true)}
                  statusClassName="rounded-md bg-muted px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                />
              ) : null}
            </div>
            {activity.description ? (
              <p className="text-muted-foreground">{activity.description}</p>
            ) : null}
            <CardTimeBudget
              loggedSeconds={activity.loggedSeconds}
              estimatedHours={activity.estimatedHours}
              className="text-sm"
            />
          </div>

          {teamId ? (
            <UpdateActivityStatusDialog
              teamId={teamId}
              activity={activity}
              open={isStatusDialogOpen}
              onOpenChange={setIsStatusDialogOpen}
              onUpdated={reloadActivity}
            />
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Atividade não encontrada.</p>
      )}
    </div>
  )
}
