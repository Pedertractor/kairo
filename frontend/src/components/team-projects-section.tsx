import { useAuth } from '@/hooks/use-auth'
import { canDeleteTeamCard } from '@/lib/team-permissions'
import type { TeamSummary } from '@/types/team'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { CardTimeBudget } from '@/components/card-time-budget'
import { CardCreatedAt } from '@/components/card-created-at'
import { CreateProjectDialog } from '@/components/create-project-dialog'
import { FilterField, ResponsiveFilters } from '@/components/responsive-filters'
import { DeleteProjectDialog } from '@/components/delete-project-dialog'
import { FinishProjectDialog } from '@/components/finish-project-dialog'
import { ItemActionsMenu } from '@/components/item-actions-menu'
import { ProjectStatusActions } from '@/components/project-status-actions'
import { UpdateProjectStatusDialog } from '@/components/update-project-status-dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-handler'
import {
  canFinishStatus,
  CARD_STATUSES,
  CARD_STATUS_BADGE_CLASS,
  CARD_STATUS_CARD_CLASS,
  STATUS_LABELS,
} from '@/lib/card-status'
import {
  ALL_PROJECT_STATUSES,
  filterAndSortTeamProjects,
  type ProjectOrder,
  type ProjectStatusFilter,
} from '@/lib/team-project-filters'
import { cn } from '@/lib/utils'
import type { ProjectSummary, ProjectsListResponse } from '@/types/card'

const PROJECT_ORDER_LABELS: Record<ProjectOrder, string> = {
  newest: 'Mais recentes',
  oldest: 'Mais antigos',
  'name-asc': 'Nome (A–Z)',
  'name-desc': 'Nome (Z–A)',
}

interface TeamProjectsSectionProps {
  team: Pick<TeamSummary, 'role' | 'membersCanDeleteCards'>
  teamId: string
  canCreate: boolean
  onProjectsChange?: (projects: ProjectSummary[]) => void
}

export function TeamProjectsSection({
  team,
  teamId,
  canCreate,
  onProjectsChange,
}: TeamProjectsSectionProps) {
  const { user } = useAuth()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [projectToUpdate, setProjectToUpdate] =
    useState<ProjectSummary | null>(null)
  const [projectToFinish, setProjectToFinish] =
    useState<ProjectSummary | null>(null)
  const [projectToDelete, setProjectToDelete] =
    useState<ProjectSummary | null>(null)
  const [statusFilter, setStatusFilter] =
    useState<ProjectStatusFilter>(ALL_PROJECT_STATUSES)
  const [projectOrder, setProjectOrder] = useState<ProjectOrder>('newest')

  const loadProjects = useCallback(async () => {
    setIsLoading(true)

    try {
      const data = await api<ProjectsListResponse>(
        `/teams/${teamId}/projects`,
      )
      setProjects(data.projects)
      onProjectsChange?.(data.projects)
    } finally {
      setIsLoading(false)
    }
  }, [teamId, onProjectsChange])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const filteredProjects = useMemo(
    () => filterAndSortTeamProjects(projects, statusFilter, projectOrder),
    [projects, statusFilter, projectOrder],
  )

  const hasSheetFilters =
    statusFilter !== ALL_PROJECT_STATUSES || projectOrder !== 'newest'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Projetos</p>
          <p className="text-sm text-muted-foreground">
            Gerencie os projetos desta equipe.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            Criar novo projeto
          </Button>
        ) : null}
      </div>

      <CreateProjectDialog
        teamId={teamId}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={loadProjects}
      />

      <UpdateProjectStatusDialog
        teamId={teamId}
        project={projectToUpdate}
        open={projectToUpdate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setProjectToUpdate(null)
          }
        }}
        onUpdated={loadProjects}
      />

      <FinishProjectDialog
        teamId={teamId}
        project={projectToFinish}
        open={projectToFinish !== null}
        onOpenChange={(open) => {
          if (!open) {
            setProjectToFinish(null)
          }
        }}
        onFinished={loadProjects}
      />

      <DeleteProjectDialog
        teamId={teamId}
        project={projectToDelete}
        open={projectToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setProjectToDelete(null)
          }
        }}
        onDeleted={loadProjects}
      />

      {!isLoading && projects.length > 0 ? (
        <div className="flex items-end">
          <ResponsiveFilters
            description="Filtrar e ordenar os projetos desta equipe."
            hasActiveFilters={hasSheetFilters}
          >
            {(idPrefix, itemClassName) => (
              <>
                <FilterField
                  id={`${idPrefix}-status`}
                  label="Filtrar por status"
                  className={itemClassName}
                >
                  <Select
                    value={statusFilter}
                    onValueChange={(value) =>
                      setStatusFilter((value ?? ALL_PROJECT_STATUSES) as ProjectStatusFilter)
                    }
                  >
                    <SelectTrigger
                      id={`${idPrefix}-status`}
                      className="w-full"
                      aria-label="Filtrar por status"
                    >
                      <SelectValue>
                        {(selectedValue) =>
                          selectedValue === ALL_PROJECT_STATUSES
                            ? 'Todos os status'
                            : STATUS_LABELS[selectedValue as keyof typeof STATUS_LABELS]
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_PROJECT_STATUSES}>Todos os status</SelectItem>
                      {CARD_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>

                <FilterField
                  id={`${idPrefix}-order`}
                  label="Ordenar por"
                  className={itemClassName}
                >
                  <Select
                    value={projectOrder}
                    onValueChange={(value) =>
                      setProjectOrder((value ?? 'newest') as ProjectOrder)
                    }
                  >
                    <SelectTrigger
                      id={`${idPrefix}-order`}
                      className="w-full"
                      aria-label="Ordenar por"
                    >
                      <SelectValue>
                        {(selectedValue) => PROJECT_ORDER_LABELS[selectedValue as ProjectOrder]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROJECT_ORDER_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
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
      ) : projects.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium">Nenhum projeto ainda</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Os projetos desta equipe aparecerão aqui.
          </p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium">Nenhum projeto encontrado</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Tente ajustar o filtro de status.
          </p>
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <li
              key={project.id}
              className={cn(
                'relative rounded-lg border p-3 transition-colors hover:bg-muted/50',
                CARD_STATUS_CARD_CLASS[project.status],
              )}
            >
              <Link
                to={`/projetos/${project.id}`}
                className="absolute inset-0 z-0 rounded-lg"
                aria-label={project.title}
              />
              <div className="pointer-events-none relative z-10 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{project.title}</span>
                  <div className="pointer-events-auto flex shrink-0 items-center gap-0.5">
                    <ItemActionsMenu
                      title={project.title}
                      canFinish={canFinishStatus(project.status)}
                      onFinish={() => setProjectToFinish(project)}
                      canDelete={canDeleteTeamCard(team, project.createdById, user?.id)}
                      onDelete={() => setProjectToDelete(project)}
                    />
                    <ProjectStatusActions
                      project={project}
                      onStatusClick={() => setProjectToUpdate(project)}
                      statusClassName={CARD_STATUS_BADGE_CLASS[project.status]}
                    />
                  </div>
                </div>
                {project.description ? (
                  <p className="line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">
                    {project.description}
                  </p>
                ) : null}
                <div className="flex items-center justify-between gap-2 [&>div]:min-w-0 [&>div]:flex-1">
                  <CardTimeBudget
                    loggedSeconds={project.loggedSeconds}
                    estimatedHours={project.estimatedHours}
                    className="truncate"
                  />
                  <CardCreatedAt createdAt={project.createdAt} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
