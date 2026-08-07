import { useEffect, useState } from 'react'
import { ArrowLeft, Pencil } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { ActivityTagBadge } from '@/components/activity-tag-badge'
import { ActivityStatusActions } from '@/components/activity-status-actions'
import { EditActivityTagDialog } from '@/components/edit-activity-tag-dialog'
import { EditActivityTitleDialog } from '@/components/edit-activity-title-dialog'
import { FinishActivityDialog } from '@/components/finish-activity-dialog'
import { FinishItemButton } from '@/components/finish-item-button'
import { UpdateActivityStatusDialog } from '@/components/update-activity-status-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-handler'
import { CardTimeBudget } from '@/components/card-time-budget'
import { canFinishStatus } from '@/lib/card-status'
import type { ActivityResponse, ActivitySummary } from '@/types/card'

export function ActivityDetailPage() {
  const { teamId, activityId } = useParams<{
    teamId: string
    activityId: string
  }>()
  const [activity, setActivity] = useState<ActivitySummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isEditTitleDialogOpen, setIsEditTitleDialogOpen] = useState(false)
  const [isEditTagDialogOpen, setIsEditTagDialogOpen] = useState(false)
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false)

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
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="text-2xl font-bold">{activity.title}</h1>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Editar título"
                  onClick={() => setIsEditTitleDialogOpen(true)}
                >
                  <Pencil />
                </Button>
              </div>
              {teamId ? (
                <div className="flex shrink-0 items-center gap-0.5">
                  {canFinishStatus(activity.status) ? (
                    <FinishItemButton
                      onClick={() => setIsFinishDialogOpen(true)}
                    />
                  ) : null}
                  <ActivityStatusActions
                    teamId={teamId}
                    activity={activity}
                    onStatusClick={() => setIsStatusDialogOpen(true)}
                    onFavoriteToggle={(isFavorite) => {
                      setActivity((current) =>
                        current ? { ...current, isFavorite } : current,
                      )
                    }}
                    statusClassName="px-2.5 py-1 text-sm"
                  />
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {activity.tag ? (
                <ActivityTagBadge
                  tag={activity.tag}
                  className="text-sm"
                  aria-label={`Alterar tag de ${activity.title}`}
                  onClick={() => setIsEditTagDialogOpen(true)}
                />
              ) : (
                <span className="text-sm text-muted-foreground">Sem tag</span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Editar tag"
                onClick={() => setIsEditTagDialogOpen(true)}
              >
                <Pencil />
              </Button>
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
            <>
              <EditActivityTitleDialog
                teamId={teamId}
                activity={activity}
                open={isEditTitleDialogOpen}
                onOpenChange={setIsEditTitleDialogOpen}
                onUpdated={setActivity}
              />
              <EditActivityTagDialog
                teamId={teamId}
                activity={activity}
                open={isEditTagDialogOpen}
                onOpenChange={setIsEditTagDialogOpen}
                onUpdated={reloadActivity}
              />
              <UpdateActivityStatusDialog
                teamId={teamId}
                activity={activity}
                open={isStatusDialogOpen}
                onOpenChange={setIsStatusDialogOpen}
                onUpdated={reloadActivity}
              />
              <FinishActivityDialog
                teamId={teamId}
                activity={activity}
                open={isFinishDialogOpen}
                onOpenChange={setIsFinishDialogOpen}
                onFinished={reloadActivity}
              />
            </>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Atividade não encontrada.</p>
      )}
    </div>
  )
}
