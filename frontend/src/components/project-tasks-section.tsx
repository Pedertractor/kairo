import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { CreateTaskDialog } from '@/components/create-task-dialog';
import { FavoriteButton } from '@/components/favorite-button';
import { StartTaskTimerButton } from '@/components/start-task-timer-button';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveTimer } from '@/hooks/use-active-timer';
import { api } from '@/lib/api-handler';
import { subscribeTaskDataInvalidation } from '@/lib/task-data-invalidation';
import { TASK_STATUS_BADGE_CLASS, TASK_STATUS_LABELS } from '@/lib/task-status';
import { cn } from '@/lib/utils';
import type { TaskStatus, TaskSummary, TasksListResponse } from '@/types/task';

interface ProjectTasksSectionProps {
  projectId: string;
}

const TASK_CARD_STATUS_CLASS: Record<TaskStatus, string> = {
  TODO: 'border-border bg-card',
  IN_PROGRESS:
    'border-sky-200 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-950/20',
  PAUSED:
    'border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20',
  DONE: 'border-emerald-200 bg-emerald-50/75 dark:border-emerald-900/60 dark:bg-emerald-950/25',
  CANCELED:
    'border-rose-200 bg-rose-50/65 dark:border-rose-900/60 dark:bg-rose-950/20',
};

export function ProjectTasksSection({ projectId }: ProjectTasksSectionProps) {
  const { isTaskActive } = useActiveTimer();
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const loadTasks = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
    }

    try {
      const data = await api<TasksListResponse>(`/projects/${projectId}/tasks`);
      setTasks(data.tasks);
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }, [projectId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(
    () => subscribeTaskDataInvalidation(() => void loadTasks({ silent: true })),
    [loadTasks],
  );

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
                  'group relative rounded-lg border transition-all',
                  'after:pointer-events-none after:absolute after:inset-0 after:z-[1] after:rounded-[inherit] after:bg-muted/30 after:opacity-0 after:transition-opacity hover:after:opacity-100',
                  TASK_CARD_STATUS_CLASS[task.status],
                  isTimerActive &&
                    'border-sidebar-primary shadow-md shadow-sidebar-primary/15 ring-2 ring-sidebar-primary/35',
                )}
              >
                <Link
                  to={`/projetos/${projectId}/tarefas/${task.id}`}
                  className='relative z-[2] flex flex-col gap-1.5 p-2.5 pr-28'
                >
                  <p className='line-clamp-2 text-sm font-medium leading-snug'>
                    {task.title}
                  </p>
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
                </Link>
                <div
                  className='absolute top-2.5 right-2.5 z-[2] flex shrink-0 items-center gap-0.5'
                  onClick={(event) => event.preventDefault()}
                >
                  <FavoriteButton
                    target={{
                      kind: 'task',
                      projectId,
                      taskId: task.id,
                    }}
                    isFavorite={task.isFavorite}
                    onToggle={(isFavorite) => {
                      setTasks((current) =>
                        current.map((item) =>
                          item.id === task.id ? { ...item, isFavorite } : item,
                        ),
                      );
                    }}
                    className='text-muted-foreground hover:text-amber-500'
                  />
                  <StartTaskTimerButton
                    projectId={projectId}
                    taskId={task.id}
                    status={task.status}
                    className='text-muted-foreground hover:text-sidebar-primary'
                  />
                  <span className={TASK_STATUS_BADGE_CLASS[task.status]}>
                    {TASK_STATUS_LABELS[task.status]}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
