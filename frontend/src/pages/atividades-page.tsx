import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
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
import { FilterField, ResponsiveFilters } from '@/components/responsive-filters'
import { StartActivityTimerButton } from '@/components/start-activity-timer-button'
import { UpdateActivityStatusDialog } from '@/components/update-activity-status-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useActiveTimer } from '@/hooks/use-active-timer'
import { subscribeActivityDataInvalidation } from '@/lib/activity-data-invalidation'
import { api } from '@/lib/api-handler'
import {
  canFinishStatus,
  CARD_STATUSES,
  CARD_STATUS_BADGE_CLASS,
  CARD_STATUS_CARD_CLASS,
  isFinishedStatus,
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
  CardStatus,
} from '@/types/card'
import type { TeamSummary, TeamsListResponse } from '@/types/team'

const ALL_STATUSES = 'ALL' as const
type StatusFilter = CardStatus | typeof ALL_STATUSES

const ALL_TEAMS = 'ALL' as const

const VISIBILITY_ACTIVE = 'active'
const VISIBILITY_ALL = 'all'

function getStatusFilterLabel(value: StatusFilter): string {
  if (value === ALL_STATUSES) {
    return 'Todos os status'
  }

  return STATUS_LABELS[value]
}

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
  const [nameFilter, setNameFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL_STATUSES)
  const [teamFilter, setTeamFilter] = useState<string>(ALL_TEAMS)
  const [visibilityFilter, setVisibilityFilter] = useState(VISIBILITY_ACTIVE)
  const [teams, setTeams] = useState<TeamSummary[]>([])
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
      setActivities(activitiesData.activities)
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

  const filteredActivities = useMemo(() => {
    const query = nameFilter.trim().toLowerCase()
    const showFinished =
      visibilityFilter === VISIBILITY_ALL || statusFilter === 'DONE'

    return activities.filter((activity) => {
      if (!showFinished && isFinishedStatus(activity.status)) {
        return false
      }

      const matchesName =
        query === '' || activity.title.toLowerCase().includes(query)
      const matchesStatus =
        statusFilter === ALL_STATUSES || activity.status === statusFilter
      const matchesTeam =
        teamFilter === ALL_TEAMS || activity.teamId === teamFilter

      return matchesName && matchesStatus && matchesTeam
    })
  }, [activities, nameFilter, statusFilter, teamFilter, visibilityFilter])

  const showTeamFilter = teams.length > 1
  const hasSheetFilters =
    statusFilter !== ALL_STATUSES ||
    visibilityFilter !== VISIBILITY_ACTIVE ||
    (showTeamFilter && teamFilter !== ALL_TEAMS)
  const hasActiveFilters = nameFilter.trim() !== '' || hasSheetFilters
  const hasFinishedHidden =
    visibilityFilter === VISIBILITY_ACTIVE &&
    activities.some((activity) => isFinishedStatus(activity.status))

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
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
          <div className="relative min-w-0 w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={nameFilter}
              onChange={(event) => setNameFilter(event.target.value)}
              placeholder="Buscar por nome..."
              className="pl-8"
              aria-label="Buscar atividades por nome"
            />
          </div>
          <ResponsiveFilters
            description="Filtrar as atividades das suas equipes."
            hasActiveFilters={hasSheetFilters}
          >
            {(idPrefix, itemClassName) => (
              <>
                <FilterField
                  id={`${idPrefix}-visibility`}
                  label="Filtrar por situação"
                  className={itemClassName}
                >
                  <Select
                    value={visibilityFilter}
                    onValueChange={(value) =>
                      setVisibilityFilter(value ?? VISIBILITY_ACTIVE)
                    }
                  >
                    <SelectTrigger
                      id={`${idPrefix}-visibility`}
                      className="w-full"
                      aria-label="Filtrar concluídas"
                    >
                      <SelectValue>
                        {(selectedValue) =>
                          selectedValue === VISIBILITY_ALL ? 'Todos' : 'Ativos'
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={VISIBILITY_ACTIVE}>Ativos</SelectItem>
                      <SelectItem value={VISIBILITY_ALL}>Todos</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>

                {showTeamFilter ? (
                  <FilterField
                    id={`${idPrefix}-team`}
                    label="Filtrar por equipe"
                    className={itemClassName}
                  >
                    <Select
                      value={teamFilter}
                      onValueChange={(value) =>
                        setTeamFilter(value ?? ALL_TEAMS)
                      }
                    >
                      <SelectTrigger
                        id={`${idPrefix}-team`}
                        className="w-full"
                        aria-label="Filtrar por equipe"
                      >
                        <SelectValue placeholder="Equipe">
                          {(selectedValue) =>
                            selectedValue === ALL_TEAMS
                              ? 'Todas as equipes'
                              : teams.find((team) => team.id === selectedValue)
                                  ?.name
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_TEAMS}>
                          Todas as equipes
                        </SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FilterField>
                ) : null}

                <FilterField
                  id={`${idPrefix}-status`}
                  label="Filtrar por status"
                  className={itemClassName}
                >
                  <Select
                    value={statusFilter}
                    onValueChange={(value) =>
                      setStatusFilter(value as StatusFilter)
                    }
                  >
                    <SelectTrigger
                      id={`${idPrefix}-status`}
                      className="w-full"
                      aria-label="Filtrar por status"
                    >
                      <SelectValue placeholder="Status">
                        {(selectedValue) =>
                          getStatusFilterLabel(selectedValue as StatusFilter)
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_STATUSES}>
                        Todos os status
                      </SelectItem>
                      {CARD_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>
              </>
            )}
          </ResponsiveFilters>
        </div>
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
              ? 'Há atividades concluídas ocultas. Selecione "Todos" para exibi-las.'
              : hasActiveFilters
                ? showTeamFilter
                  ? 'Tente ajustar os filtros de busca, equipe ou status.'
                  : 'Tente ajustar os filtros de busca ou status.'
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
