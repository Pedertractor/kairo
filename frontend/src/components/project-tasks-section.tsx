import { useCallback, useEffect, useState } from 'react'

import { CreateTaskDialog } from '@/components/create-task-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-handler'
import { TASK_STATUS_LABELS } from '@/lib/task-status'
import type { TaskSummary, TasksListResponse } from '@/types/task'

interface ProjectTasksSectionProps {
  projectId: string
}

export function ProjectTasksSection({ projectId }: ProjectTasksSectionProps) {
  const [tasks, setTasks] = useState<TaskSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const loadTasks = useCallback(async () => {
    setIsLoading(true)

    try {
      const data = await api<TasksListResponse>(`/projects/${projectId}/tasks`)
      setTasks(data.tasks)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Tarefas</p>
          <p className="text-sm text-muted-foreground">
            Gerencie as tarefas deste projeto.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Criar nova tarefa
        </Button>
      </div>

      <CreateTaskDialog
        projectId={projectId}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={loadTasks}
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium">Nenhuma tarefa ainda</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            As tarefas deste projeto aparecerão aqui.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex flex-col gap-2 rounded-lg border bg-card p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{task.title}</p>
                <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {TASK_STATUS_LABELS[task.status]}
                </span>
              </div>
              {task.description ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {task.description}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {task.estimatedHours ? (
                  <span>{task.estimatedHours}h estimadas</span>
                ) : null}
                {task.assignedToName ? (
                  <span>Responsável: {task.assignedToName}</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
