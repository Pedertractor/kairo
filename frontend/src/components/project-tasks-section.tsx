import { useCallback, useEffect, useState } from 'react';

import { CreateTaskDialog } from '@/components/create-task-dialog';
import { StartTaskTimerButton } from '@/components/start-task-timer-button';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveTimer } from '@/hooks/use-active-timer';
import { api } from '@/lib/api-handler';
import { TASK_STATUS_LABELS } from '@/lib/task-status';
import { cn } from '@/lib/utils';
import type { TaskSummary, TasksListResponse } from '@/types/task';

interface ProjectTasksSectionProps {
  projectId: string;
}

export function ProjectTasksSection({ projectId }: ProjectTasksSectionProps) {
  const { isTaskActive } = useActiveTimer();
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await api<TasksListResponse>(`/projects/${projectId}/tasks`);
      setTasks(data.tasks);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between gap-4'>
        <div>
          <p className='text-sm font-medium'>Tarefas</p>
          <p className='text-sm text-muted-foreground'>
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
        <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className='h-20 rounded-lg' />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className='flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center'>
          <p className='text-sm font-medium'>Nenhuma tarefa ainda</p>
          <p className='max-w-sm text-sm text-muted-foreground'>
            As tarefas deste projeto aparecerão aqui.
          </p>
        </div>
      ) : (
        <ul className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {tasks.map((task) => {
            const isTimerActive = isTaskActive(task.id);

            return (
              <li
                key={task.id}
                className={cn(
                  'flex flex-col gap-1.5 rounded-lg border bg-card p-2.5 transition-colors',
                  isTimerActive &&
                    'border-sidebar-primary bg-sidebar-primary/10',
                )}
              >
                <div className='flex items-start justify-between gap-1'>
                  <p className='line-clamp-2 text-sm font-medium leading-snug'>
                    {task.title}
                  </p>
                  <div className='flex shrink-0 items-center gap-0.5'>
                    <StartTaskTimerButton
                      projectId={projectId}
                      taskId={task.id}
                      className='text-muted-foreground hover:text-sidebar-primary'
                    />
                    <span className='rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground'>
                      {TASK_STATUS_LABELS[task.status]}
                    </span>
                  </div>
                </div>
                {task.description ? (
                  <p className='line-clamp-2 text-[11px] text-muted-foreground'>
                    {task.description}
                  </p>
                ) : null}
                <div className='flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground'>
                  {task.estimatedHours ? (
                    <span>{task.estimatedHours}h</span>
                  ) : null}
                  {task.assignedToName ? (
                    <span className='truncate'>{task.assignedToName}</span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
