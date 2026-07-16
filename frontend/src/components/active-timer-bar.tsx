import { Link } from 'react-router-dom';
import { Pause, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  useActiveTimer,
  useElapsedSeconds,
} from '@/contexts/active-timer-context';
import { formatElapsed } from '@/lib/format-elapsed';
import { cn } from '@/lib/utils';

export function ActiveTimerBar() {
  const {
    activeTimer,
    pausedTarget,
    isPausing,
    isStarting,
    pauseTimer,
    resumeTimer,
  } = useActiveTimer();
  const elapsedSeconds = useElapsedSeconds();

  const timerTarget = activeTimer ?? pausedTarget;

  if (!timerTarget) {
    return null;
  }

  const isRunning = activeTimer !== null;

  const timerLink = timerTarget.task
    ? {
        to: `/projetos/${timerTarget.task.projectId}`,
        title: timerTarget.task.title,
        kindLabel: 'Tarefa',
        kindClassName: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
        projectTitle: timerTarget.task.projectTitle,
      }
    : timerTarget.activity
      ? {
          to: `/equipes/${timerTarget.activity.teamId}/atividades/${timerTarget.activity.id}`,
          title: timerTarget.activity.title,
          kindLabel: 'Atividade',
          kindClassName: 'bg-sidebar-primary/15 text-sidebar-primary',
          projectTitle: null as string | null,
        }
      : null;

  if (!timerLink) {
    return null;
  }

  return (
    <div className='pointer-events-none sticky bottom-0 z-50 h-0 w-full shrink-0'>
      <div className='absolute inset-x-0 bottom-3 px-4 sm:px-6 lg:px-10'>
        <div
          className={cn(
            'pointer-events-auto mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-2xl border border-sidebar-primary/25 px-4 py-2.5 shadow-lg shadow-sidebar-primary/10',
            'bg-brand-soft/45 backdrop-blur-md',
            'dark:border-sidebar-primary/30 dark:bg-sidebar-primary/20 dark:shadow-sidebar-primary/15',
            !isRunning && 'opacity-95',
          )}
        >
          <div className='min-w-0'>
            <div className='mb-0.5 flex items-center gap-2'>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                  timerLink.kindClassName,
                )}
              >
                {timerLink.kindLabel}
              </span>
              {!isRunning ? (
                <span className='shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                  Pausado
                </span>
              ) : null}
              {timerLink.projectTitle ? (
                <span className='truncate text-xs text-sidebar-primary/70'>
                  {timerLink.projectTitle}
                </span>
              ) : null}
            </div>
            <p className='truncate text-sm font-medium text-sidebar-primary'>
              <Link to={timerLink.to} className='hover:underline'>
                {timerLink.title}
              </Link>
            </p>
          </div>

          <div className='flex shrink-0 items-center gap-3'>
            {isRunning ? (
              <span className='font-mono text-lg font-semibold tabular-nums text-sidebar-primary'>
                {formatElapsed(elapsedSeconds)}
              </span>
            ) : null}
            {isRunning ? (
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='border-sidebar-primary/40 bg-background/60 hover:bg-background/90'
                disabled={isPausing}
                onClick={() => void pauseTimer()}
              >
                <Pause />
              </Button>
            ) : (
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='border-sidebar-primary/40 bg-background/60 hover:bg-background/90'
                disabled={isStarting}
                onClick={() => void resumeTimer()}
              >
                <Play />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
