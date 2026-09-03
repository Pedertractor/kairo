import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { CardTimeBudget } from '@/components/card-time-budget'
import { CreateProjectDialog } from '@/components/create-project-dialog'
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
  CARD_STATUS_BADGE_CLASS,
  CARD_STATUS_CARD_CLASS,
  isFinishedStatus,
} from '@/lib/card-status'
import { cn } from '@/lib/utils'
import type { ProjectSummary, ProjectsListResponse } from '@/types/card'

const VISIBILITY_ACTIVE = 'active'
const VISIBILITY_ALL = 'all'

interface TeamProjectsSectionProps {
  teamId: string
}

export function TeamProjectsSection({ teamId }: TeamProjectsSectionProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [projectToUpdate, setProjectToUpdate] =
    useState<ProjectSummary | null>(null)
  const [projectToFinish, setProjectToFinish] =
    useState<ProjectSummary | null>(null)
  const [projectToDelete, setProjectToDelete] =
    useState<ProjectSummary | null>(null)
  const [visibilityFilter, setVisibilityFilter] = useState(VISIBILITY_ACTIVE)

  const loadProjects = useCallback(async () => {
    setIsLoading(true)

    try {
      const data = await api<ProjectsListResponse>(
        `/teams/${teamId}/projects`,
      )
      setProjects(data.projects)
    } finally {
      setIsLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const filteredProjects = useMemo(() => {
    const showFinished = visibilityFilter === VISIBILITY_ALL

    return projects.filter(
      (project) => showFinished || !isFinishedStatus(project.status),
    )
  }, [projects, visibilityFilter])

  const hasFinishedHidden =
    visibilityFilter === VISIBILITY_ACTIVE &&
    projects.some((project) => isFinishedStatus(project.status))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Projetos</p>
          <p className="text-sm text-muted-foreground">
            Gerencie os projetos desta equipe.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Criar novo projeto
        </Button>
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
        <div className="w-full sm:w-1/4">
          <Select
            value={visibilityFilter}
            onValueChange={(value) =>
              setVisibilityFilter(value ?? VISIBILITY_ACTIVE)
            }
          >
            <SelectTrigger className="w-full" aria-label="Filtrar concluídos">
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
            {hasFinishedHidden
              ? 'Há projetos concluídos ocultos. Selecione "Todos" para exibi-los.'
              : 'Os projetos desta equipe aparecerão aqui.'}
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
                <CardTimeBudget
                  loggedSeconds={project.loggedSeconds}
                  estimatedHours={project.estimatedHours}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
