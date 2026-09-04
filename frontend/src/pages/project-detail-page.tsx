import { useEffect, useState } from 'react'
import { ArrowLeft, Pencil } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { DeleteProjectDialog } from '@/components/delete-project-dialog'
import { EditEstimatedHoursDialog } from '@/components/edit-estimated-hours-dialog'
import { EditProjectDialog } from '@/components/edit-project-dialog'
import { FinishProjectDialog } from '@/components/finish-project-dialog'
import { ItemActionsMenu } from '@/components/item-actions-menu'
import { ProjectStatusActions } from '@/components/project-status-actions'
import { ProjectTasksSection } from '@/components/project-tasks-section'
import { UpdateProjectStatusDialog } from '@/components/update-project-status-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCanEditEstimatedHours } from '@/hooks/use-can-edit-estimated-hours'
import { api } from '@/lib/api-handler'
import { CardTimeBudget } from '@/components/card-time-budget'
import { canFinishStatus } from '@/lib/card-status'
import type { ProjectResponse, ProjectSummary } from '@/types/card'

export function ProjectDetailPage() {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<ProjectSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isEditHoursDialogOpen, setIsEditHoursDialogOpen] = useState(false)
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const canEditEstimatedHours = useCanEditEstimatedHours(
    project?.teamId,
    project?.createdById,
    project !== null,
  )

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
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="text-2xl font-bold">{project.title}</h1>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Editar projeto"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <Pencil />
                </Button>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <ItemActionsMenu
                  title={project.title}
                  canFinish={canFinishStatus(project.status)}
                  onFinish={() => setIsFinishDialogOpen(true)}
                  onDelete={() => setIsDeleteDialogOpen(true)}
                />
                <ProjectStatusActions
                  project={project}
                  onStatusClick={() => setIsStatusDialogOpen(true)}
                  statusClassName="px-2.5 py-1 text-sm"
                />
              </div>
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
              <p className="whitespace-pre-wrap text-muted-foreground">
                {project.description}
              </p>
            ) : null}
            <CardTimeBudget
              loggedSeconds={project.loggedSeconds}
              estimatedHours={project.estimatedHours}
              className="text-sm"
              onEdit={
                canEditEstimatedHours
                  ? () => setIsEditHoursDialogOpen(true)
                  : undefined
              }
            />
          </div>

          <EditProjectDialog
            teamId={project.teamId}
            project={project}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onUpdated={(updated) =>
              setProject((current) =>
                current
                  ? {
                      ...updated,
                      teamName: updated.teamName ?? current.teamName,
                    }
                  : updated,
              )
            }
          />

          <EditEstimatedHoursDialog
            open={isEditHoursDialogOpen}
            onOpenChange={setIsEditHoursDialogOpen}
            estimatedHours={project.estimatedHours}
            onSave={async (estimatedHours) => {
              const data = await api<ProjectResponse>(
                `/teams/${project.teamId}/projects/${project.id}`,
                {
                  method: 'PATCH',
                  body: JSON.stringify({ estimatedHours }),
                },
              )

              setProject((current) =>
                current
                  ? {
                      ...data.project,
                      teamName: data.project.teamName ?? current.teamName,
                    }
                  : data.project,
              )
            }}
          />

          <UpdateProjectStatusDialog
            teamId={project.teamId}
            project={project}
            open={isStatusDialogOpen}
            onOpenChange={setIsStatusDialogOpen}
            onUpdated={reloadProject}
          />

          <FinishProjectDialog
            teamId={project.teamId}
            project={project}
            open={isFinishDialogOpen}
            onOpenChange={setIsFinishDialogOpen}
            onFinished={reloadProject}
          />

          <DeleteProjectDialog
            teamId={project.teamId}
            project={project}
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onDeleted={() => navigate('/projetos')}
          />

          <ProjectTasksSection
            projectId={project.id}
            teamId={project.teamId}
          />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Projeto não encontrado.</p>
      )}
    </div>
  )
}
