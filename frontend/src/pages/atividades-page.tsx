import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ActivityDetailsDialog } from '@/components/activity-details-dialog'
import { ActivityTagBadge } from '@/components/activity-tag-badge'
import { CardTimeBudget } from '@/components/card-time-budget'
import {
  ComplexityLevelMeter,
  ComplexityLevelStripe,
} from '@/components/complexity-level-meter'
import { CreateActivityDialog } from '@/components/create-activity-dialog'
import { DeleteActivityDialog } from '@/components/delete-activity-dialog'
import { EditActivityTagDialog } from '@/components/edit-activity-tag-dialog'
import { FavoriteButton } from '@/components/favorite-button'
import { FinishActivityDialog } from '@/components/finish-activity-dialog'
import { ItemActionsMenu } from '@/components/item-actions-menu'
import {
  ProjectCountBadge,
  ProjectStatusInline,
} from '@/components/project-count-badge'
import { ActivityFilters } from '@/components/activity-filters'
import { useActivityFilters } from '@/hooks/use-activity-filters'
import { StartActivityTimerButton } from '@/components/start-activity-timer-button'
import { UpdateActivityStatusDialog } from '@/components/update-activity-status-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useActiveTimer } from '@/hooks/use-active-timer'
import { subscribeActivityDataInvalidation } from '@/lib/activity-data-invalidation'
import { api } from '@/lib/api-handler'
import {
  canFinishStatus,
  CARD_STATUS_BADGE_CLASS,
  CARD_STATUS_CARD_CLASS,
  STATUS_LABELS,
} from '@/lib/card-status'
import {
  canCreateTeamActivities,
  canEditTeamActivities,
} from '@/lib/team-permissions'
import { cn } from '@/lib/utils'
import type {
  ActivitiesListResponse,
  ActivitySummary,
} from '@/types/card'
import type { TeamSummary, TeamsListResponse } from '@/types/team'
import type { TagSummary, TagsListResponse } from '@/types/tag'

export function AtividadesPage() {
  const { isActivityCurrent } = useActiveTimer()
  const [activities, setActivities] = useState<ActivitySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [activityToFinish, setActivityToFinish] =
    useState<ActivitySummary | null>(null)
  const [activityToDelete, setActivityToDelete] =
    useState<ActivitySummary | null>(null)
  const [activityToUpdate, setActivityToUpdate] =
    useState<ActivitySummary | null>(null)
  const [activityToEditTag, setActivityToEditTag] =
    useState<ActivitySummary | null>(null)
  const [activityToDetail, setActivityToDetail] =
    useState<ActivitySummary | null>(null)
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [tags, setTags] = useState<TagSummary[]>([])
  const [canCreateActivity, setCanCreateActivity] = useState(false)

  const loadActivities = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true)
    }

    try {
      const [activitiesData, teamsData] = await Promise.all([
        api<ActivitiesListResponse>('/activities'),
        api<TeamsListResponse>('/teams'),
      ])
      const teamTags = await Promise.all(teamsData.teams.map((team) =>
        api<TagsListResponse>(`/teams/${team.id}/tags`),
      ))
      setActivities(activitiesData.activities)
      setTags(teamTags.flatMap((data) => data.tags))
      setTeams(
        [...teamsData.teams].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      )
      setCanCreateActivity(teamsData.teams.some(canCreateTeamActivities))
    } finally {
      if (!options?.silent) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void loadActivities()
  }, [loadActivities])

  useEffect(
    () =>
      subscribeActivityDataInvalidation(() =>
        void loadActivities({ silent: true }),
      ),
    [loadActivities],
  )

  const teamsById = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams],
  )

  const filterMembers = useMemo(() => teams.flatMap((team) =>
    team.members.map((member) => ({ ...member, teamId: team.id })),
  ), [teams])
  const activityFilters = useActivityFilters(activities, { teams, tags, members: filterMembers })
  const { filteredActivities, hasActiveFilters, hasFinishedHidden } = activityFilters

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Atividades</h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>Atividades das suas equipes.</span>
            {!isLoading ? (
              <>
                <ProjectCountBadge
                  projects={activities}
                  emptyLabel="Nenhuma atividade nas suas equipes."
                  itemLabel="atividade"
                  itemLabelPlural="atividades"
                />
                <ProjectStatusInline projects={activities} />
              </>
            ) : null}
          </p>
        </div>
        {canCreateActivity ? (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            Criar nova atividade
          </Button>
        ) : null}
      </div>

      <CreateActivityDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={() => void loadActivities()}
      />

      <FinishActivityDialog
        teamId={activityToFinish?.teamId ?? ''}
        activity={activityToFinish}
        open={activityToFinish !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActivityToFinish(null)
          }
        }}
        onFinished={() => void loadActivities()}
      />

      <DeleteActivityDialog
        teamId={activityToDelete?.teamId ?? ''}
        activity={activityToDelete}
        open={activityToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActivityToDelete(null)
          }
        }}
        onDeleted={() => void loadActivities()}
      />

      <UpdateActivityStatusDialog
        teamId={activityToUpdate?.teamId ?? ''}
        activity={activityToUpdate}
        open={activityToUpdate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActivityToUpdate(null)
          }
        }}
        onUpdated={() => void loadActivities()}
      />

      <EditActivityTagDialog
        teamId={activityToEditTag?.teamId ?? ''}
        activity={activityToEditTag}
        open={activityToEditTag !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActivityToEditTag(null)
          }
        }}
        onUpdated={() => void loadActivities()}
      />

      <ActivityDetailsDialog
        teamId={activityToDetail?.teamId ?? ''}
        activity={activityToDetail}
        open={activityToDetail !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActivityToDetail(null)
          }
        }}
        onUpdated={() => void loadActivities()}
      />

      {!isLoading && activities.length > 0 ? (
        <ActivityFilters
          controller={activityFilters}
          teams={teams}
          description="Filtrar as atividades das suas equipes."
        />
      ) : null}

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
            As atividades das suas equipes aparecerão aqui.
          </p>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium">Nenhuma atividade encontrada</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {hasFinishedHidden && !hasActiveFilters
              ? 'Há atividades concluídas ocultas. Selecione "Todas" para exibi-las.'
              : hasActiveFilters
                ? 'Tente ajustar ou limpar os filtros.'
                : 'As atividades das suas equipes aparecerão aqui.'}
          </p>
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredActivities.map((activity) => {
            const isTimerActive = isActivityCurrent(activity.id)
            const team = teamsById.get(activity.teamId)
            const canEdit = team ? canEditTeamActivities(team) : false

            return (
              <li
                key={activity.id}
                className={cn(
                  'relative flex flex-col gap-2 rounded-lg border p-3 transition-all hover:bg-muted/50',
                  activity.complexityLevel && 'pl-4',
                  CARD_STATUS_CARD_CLASS[activity.status],
                  isTimerActive &&
                    'border-sidebar-primary shadow-md shadow-sidebar-primary/15 ring-2 ring-sidebar-primary/35',
                )}
              >
                {activity.complexityLevel ? (
                  <ComplexityLevelStripe level={activity.complexityLevel} />
                ) : null}
                <Link
                  to={`/equipes/${activity.teamId}/atividades/${activity.id}`}
                  className="absolute inset-0 rounded-lg"
                  aria-label={activity.title}
                />
                <div className="pointer-events-none relative z-10 flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{activity.title}</p>
                  <div className="pointer-events-auto flex shrink-0 items-center gap-0.5">
                    <FavoriteButton
                      target={{
                        kind: 'activity',
                        teamId: activity.teamId,
                        activityId: activity.id,
                      }}
                      isFavorite={activity.isFavorite}
                      onToggle={(isFavorite) => {
                        setActivities((current) =>
                          current.map((item) =>
                            item.id === activity.id
                              ? { ...item, isFavorite }
                              : item,
                          ),
                        )
                      }}
                    />
                    <StartActivityTimerButton
                      teamId={activity.teamId}
                      activityId={activity.id}
                      className="text-muted-foreground hover:text-sidebar-primary"
                    />
                    <ItemActionsMenu
                      title={activity.title}
                      canFinish={canFinishStatus(activity.status)}
                      onDetails={() => setActivityToDetail(activity)}
                      onFinish={() => setActivityToFinish(activity)}
                      onDelete={() => setActivityToDelete(activity)}
                    />
                  </div>
                </div>
                <div className="pointer-events-none relative z-10 flex items-center gap-2 self-start">
                  {activity.tag ? (
                    <ActivityTagBadge
                      tag={activity.tag}
                      className="pointer-events-auto max-w-28"
                      aria-label={`Alterar etiqueta de ${activity.title}`}
                      onClick={
                        canEdit
                          ? () => setActivityToEditTag(activity)
                          : undefined
                      }
                    />
                  ) : null}
                  <button
                    type="button"
                    className={cn(
                      'pointer-events-auto',
                      CARD_STATUS_BADGE_CLASS[activity.status],
                    )}
                    aria-label={`Alterar status de ${activity.title}`}
                    onClick={() => setActivityToUpdate(activity)}
                  >
                    {STATUS_LABELS[activity.status]}
                  </button>
                </div>
                {activity.teamName ? (
                  <p className="pointer-events-none relative z-10 text-xs text-muted-foreground">
                    {activity.teamName}
                  </p>
                ) : null}
                {activity.description ? (
                  <p className="pointer-events-none relative z-10 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">
                    {activity.description}
                  </p>
                ) : null}
                {activity.assignedToName ? (
                  <p className="pointer-events-none relative z-10 truncate text-xs text-muted-foreground">
                    Responsável:{' '}
                    <span className="font-medium text-foreground">
                      {activity.assignedToName}
                    </span>
                  </p>
                ) : null}
                {activity.complexityLevel ? (
                  <ComplexityLevelMeter
                    level={activity.complexityLevel}
                    size="md"
                    className="pointer-events-none relative z-10 text-xs text-muted-foreground"
                  />
                ) : null}
                <div className="pointer-events-none relative z-10">
                  <CardTimeBudget
                    loggedSeconds={activity.loggedSeconds}
                    estimatedHours={activity.estimatedHours}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
