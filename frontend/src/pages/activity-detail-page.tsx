import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Pencil } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ActivityDetailsDialog } from '@/components/activity-details-dialog'
import { ActivityTagBadge } from '@/components/activity-tag-badge'
import { ActivityStatusActions } from '@/components/activity-status-actions'
import { ActivityTimeEntriesSection } from '@/components/activity-time-entries-section'
import { ComplexityLevelMeter } from '@/components/complexity-level-meter'
import { DeleteActivityDialog } from '@/components/delete-activity-dialog'
import { EditActivityTagDialog } from '@/components/edit-activity-tag-dialog'
import { EditActivityTitleDialog } from '@/components/edit-activity-title-dialog'
import { FinishActivityDialog } from '@/components/finish-activity-dialog'
import { ItemActionsMenu } from '@/components/item-actions-menu'
import { UpdateActivityStatusDialog } from '@/components/update-activity-status-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { subscribeActivityDataInvalidation } from '@/lib/activity-data-invalidation'
import { api } from '@/lib/api-handler'
import { CardTimeBudget } from '@/components/card-time-budget'
import { canFinishStatus } from '@/lib/card-status'
import type { ActivityResponse, ActivitySummary } from '@/types/card'

export function ActivityDetailPage() {
  const navigate = useNavigate()
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)

  const loadActivity = useCallback(async () => {
    if (!teamId || !activityId) {
      return
    }

    const data = await api<ActivityResponse>(
      `/teams/${teamId}/activities/${activityId}`,
    )
    setActivity(data.activity)
  }, [teamId, activityId])

  useEffect(() => {
    if (!teamId || !activityId) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function load() {
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

    void load()

    return () => {
      cancelled = true
    }
  }, [teamId, activityId])

  useEffect(
    () => subscribeActivityDataInvalidation(() => void loadActivity()),
    [loadActivity],
  )

  const reloadActivity = loadActivity

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
                  <ItemActionsMenu
                    title={activity.title}
                    canFinish={canFinishStatus(activity.status)}
                    onDetails={() => setIsDetailsDialogOpen(true)}
                    onFinish={() => setIsFinishDialogOpen(true)}
                    onDelete={() => setIsDeleteDialogOpen(true)}
                  />
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
                  aria-label={`Alterar etiqueta de ${activity.title}`}
                  onClick={() => setIsEditTagDialogOpen(true)}
                />
              ) : (
                <span className="text-sm text-muted-foreground">Sem etiqueta</span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Editar etiqueta"
                onClick={() => setIsEditTagDialogOpen(true)}
              >
                <Pencil />
              </Button>
            </div>
            {activity.description ? (
              <p className="whitespace-pre-wrap text-muted-foreground">
                {activity.description}
              </p>
            ) : null}
            {activity.createdByName ? (
              <p className="text-sm text-muted-foreground">
                Criado por{' '}
                <span className="font-medium text-foreground">
                  {activity.createdByName}
                </span>
              </p>
            ) : null}
            {activity.assignedToName ? (
              <p className="text-sm text-muted-foreground">
                Responsável:{' '}
                <span className="font-medium text-foreground">
                  {activity.assignedToName}
                </span>
              </p>
            ) : null}
            {activity.complexityLevel ? (
              <ComplexityLevelMeter
                level={activity.complexityLevel}
                size="lg"
                className="text-sm text-muted-foreground"
              />
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
              <ActivityDetailsDialog
                teamId={teamId}
                activity={activity}
                open={isDetailsDialogOpen}
                onOpenChange={setIsDetailsDialogOpen}
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
              <DeleteActivityDialog
                teamId={teamId}
                activity={activity}
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onDeleted={() => navigate(`/equipes/${teamId}`)}
              />
            </>
          ) : null}

          {teamId && activityId ? (
            <ActivityTimeEntriesSection
              teamId={teamId}
              activityId={activityId}
            />
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Atividade não encontrada.</p>
      )}
    </div>
  )
}
