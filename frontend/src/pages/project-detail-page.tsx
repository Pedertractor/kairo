import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { ProjectStatusActions } from '@/components/project-status-actions'
import { ProjectTasksSection } from '@/components/project-tasks-section'
import { UpdateProjectStatusDialog } from '@/components/update-project-status-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-handler'
import type { ProjectResponse, ProjectSummary } from '@/types/card'

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<ProjectSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)

  useEffect(() => {
    if (!projectId) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function loadProject() {
      setIsLoading(true)

      try {
        const data = await api<ProjectResponse>(`/projects/${projectId}`)
        if (!cancelled) {
          setProject(data.project)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadProject()

    return () => {
      cancelled = true
    }
  }, [projectId])

  async function reloadProject() {
    if (!projectId) {
      return
    }

    const data = await api<ProjectResponse>(`/projects/${projectId}`)
    setProject(data.project)
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" render={<Link to="/projetos" />}>
          <ArrowLeft />
          Voltar para projetos
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-6 w-24" />
        </div>
      ) : project ? (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold">{project.title}</h1>
              <ProjectStatusActions
                project={project}
                onStatusClick={() => setIsStatusDialogOpen(true)}
                statusClassName="rounded-md bg-muted px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
              />
            </div>
            {project.teamName ? (
              <p className="text-sm text-muted-foreground">
                Equipe:{' '}
                <Link
                  to={`/equipes/${project.teamId}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {project.teamName}
                </Link>
              </p>
            ) : null}
            {project.description ? (
              <p className="text-muted-foreground">{project.description}</p>
            ) : null}
            {project.estimatedHours ? (
              <p className="text-sm text-muted-foreground">
                {project.estimatedHours}h estimadas
              </p>
            ) : null}
          </div>

          <UpdateProjectStatusDialog
            teamId={project.teamId}
            project={project}
            open={isStatusDialogOpen}
            onOpenChange={setIsStatusDialogOpen}
            onUpdated={reloadProject}
          />

          <ProjectTasksSection projectId={project.id} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Projeto não encontrado.</p>
      )}
    </div>
  )
}
