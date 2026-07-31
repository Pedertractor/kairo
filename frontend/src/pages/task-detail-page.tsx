import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Pencil } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { EditTaskTitleDialog } from '@/components/edit-task-title-dialog'
import { FavoriteButton } from '@/components/favorite-button'
import { StartTaskTimerButton } from '@/components/start-task-timer-button'
import { TaskTimeEntriesSection } from '@/components/task-time-entries-section'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CardTimeBudget } from '@/components/card-time-budget'
import { api } from '@/lib/api-handler'
import { subscribeTaskDataInvalidation } from '@/lib/task-data-invalidation'
import { TASK_STATUS_BADGE_CLASS, TASK_STATUS_LABELS } from '@/lib/task-status'
import { cn } from '@/lib/utils'
import type { TaskDetail, TaskDetailResponse } from '@/types/task'

export function TaskDetailPage() {
  const { projectId, taskId } = useParams<{
    projectId: string
    taskId: string
  }>()
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditTitleDialogOpen, setIsEditTitleDialogOpen] = useState(false)

  const loadTask = useCallback(async () => {
    if (!projectId || !taskId) {
      return
    }

    const data = await api<TaskDetailResponse>(
      `/projects/${projectId}/tasks/${taskId}`,
    )
    setTask(data.task)
  }, [projectId, taskId])

  useEffect(() => {
    if (!projectId || !taskId) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)

      try {
        const data = await api<TaskDetailResponse>(
          `/projects/${projectId}/tasks/${taskId}`,
        )

        if (!cancelled) {
          setTask(data.task)
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
  }, [projectId, taskId])

  useEffect(
    () => subscribeTaskDataInvalidation(() => void loadTask()),
    [loadTask],
  )

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={
            <Link
              to={projectId ? `/projetos/${projectId}` : '/projetos'}
            />
          }
        >
          <ArrowLeft />
          Voltar para projeto
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="mt-4 h-40 w-full" />
        </div>
      ) : task ? (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="text-2xl font-bold">{task.title}</h1>
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
              <div className="flex shrink-0 items-center gap-2">
                {projectId ? (
                  <>
                    <FavoriteButton
                      target={{
                        kind: 'task',
                        projectId,
                        taskId: task.id,
                      }}
                      isFavorite={task.isFavorite}
                      onToggle={(isFavorite) => {
                        setTask((current) =>
                          current ? { ...current, isFavorite } : current,
                        )
                      }}
                      size="icon-sm"
                    />
                    <StartTaskTimerButton
                      projectId={projectId}
                      taskId={task.id}
                      size="icon-sm"
                    />
                  </>
                ) : null}
                <span
                  className={cn(
                    TASK_STATUS_BADGE_CLASS[task.status],
                    'px-2.5 py-1 text-sm',
                  )}
                >
                  {TASK_STATUS_LABELS[task.status]}
                </span>
              </div>
            </div>
            {task.description ? (
              <p className="text-muted-foreground">{task.description}</p>
            ) : null}
            {task.assignedToName ? (
              <p className="text-sm text-muted-foreground">
                Responsável:{' '}
                <span className="font-medium text-foreground">
                  {task.assignedToName}
                </span>
              </p>
            ) : null}
            <CardTimeBudget
              loggedSeconds={task.loggedSeconds}
              estimatedHours={task.estimatedHours}
              className="text-sm"
            />
          </div>

          {projectId ? (
            <EditTaskTitleDialog
              projectId={projectId}
              task={task}
              open={isEditTitleDialogOpen}
              onOpenChange={setIsEditTitleDialogOpen}
              onUpdated={setTask}
            />
          ) : null}

          {projectId && taskId ? (
            <TaskTimeEntriesSection
              projectId={projectId}
              taskId={taskId}
              onUpdated={() => void loadTask()}
            />
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Tarefa não encontrada.</p>
      )}
    </div>
  )
}
