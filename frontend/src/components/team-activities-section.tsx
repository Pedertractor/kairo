import { useCallback, useEffect, useState } from 'react'

import { CreateActivityDialog } from '@/components/create-activity-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-handler'
import type { ActivitiesListResponse, ActivitySummary } from '@/types/card'

const STATUS_LABELS: Record<ActivitySummary['status'], string> = {
  TODO: 'A fazer',
  IN_PROGRESS: 'Em andamento',
  PAUSED: 'Pausado',
  DONE: 'Concluído',
  CANCELED: 'Cancelado',
}

interface TeamActivitiesSectionProps {
  teamId: string
}

export function TeamActivitiesSection({ teamId }: TeamActivitiesSectionProps) {
  const [activities, setActivities] = useState<ActivitySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const loadActivities = useCallback(async () => {
    setIsLoading(true)

    try {
      const data = await api<ActivitiesListResponse>(
        `/teams/${teamId}/activities`,
      )
      setActivities(data.activities)
    } finally {
      setIsLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    void loadActivities()
  }, [loadActivities])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Atividades</p>
          <p className="text-sm text-muted-foreground">
            Gerencie as atividades desta equipe.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Criar nova atividade
        </Button>
      </div>

      <CreateActivityDialog
        teamId={teamId}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={loadActivities}
      />

      {isLoading ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium">Nenhuma atividade ainda</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            As atividades desta equipe aparecerão aqui.
          </p>
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity) => (
            <li
              key={activity.id}
              className="flex flex-col gap-2 rounded-lg border bg-card p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{activity.title}</p>
                <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {STATUS_LABELS[activity.status]}
                </span>
              </div>
              {activity.description ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {activity.description}
                </p>
              ) : null}
              {activity.estimatedHours ? (
                <p className="text-xs text-muted-foreground">
                  {activity.estimatedHours}h estimadas
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
