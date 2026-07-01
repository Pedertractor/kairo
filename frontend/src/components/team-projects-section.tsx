import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { CreateProjectDialog } from '@/components/create-project-dialog'
import { ProjectStatusActions } from '@/components/project-status-actions'
import { UpdateProjectStatusDialog } from '@/components/update-project-status-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-handler'
import { CardTimeBudget } from '@/components/card-time-budget'
import type { ProjectSummary, ProjectsListResponse } from '@/types/card'

interface TeamProjectsSectionProps {
  teamId: string
}

export function TeamProjectsSection({ teamId }: TeamProjectsSectionProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [projectToUpdate, setProjectToUpdate] =
    useState<ProjectSummary | null>(null)

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
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li
              key={project.id}
              className="flex flex-col gap-2 rounded-lg border bg-card p-3 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={`/projetos/${project.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {project.title}
                </Link>
                <ProjectStatusActions
                  project={project}
                  onStatusClick={() => setProjectToUpdate(project)}
                />
              </div>
              {project.description ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {project.description}
                </p>
              ) : null}
              <CardTimeBudget
                loggedSeconds={project.loggedSeconds}
                estimatedHours={project.estimatedHours}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
