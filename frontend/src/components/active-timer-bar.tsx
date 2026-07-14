import { Link } from 'react-router-dom';
import { Pause } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  useActiveTimer,
  useElapsedSeconds,
} from '@/contexts/active-timer-context';
import { formatElapsed } from '@/lib/format-elapsed';

export function ActiveTimerBar() {
  const { activeTimer, isPausing, pauseTimer } = useActiveTimer();
  const elapsedSeconds = useElapsedSeconds();

  if (!activeTimer) {
    return null;
  }

  const timerLink = activeTimer.task
    ? {
        to: `/projetos/${activeTimer.task.projectId}`,
        title: activeTimer.task.title,
        subtitle: activeTimer.task.projectTitle,
      }
    : activeTimer.activity
      ? {
          to: `/equipes/${activeTimer.activity.teamId}/atividades/${activeTimer.activity.id}`,
          title: activeTimer.activity.title,
          subtitle: 'Timer em andamento',
        }
      : null;

  if (!timerLink) {
    return null;
  }

  return (
    <div className='sticky bottom-0 z-50 w-full shrink-0 border-t border-white/50 bg-background/55 py-2.5 backdrop-blur-md dark:border-white/10 dark:bg-background/45'>
      <div className='mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 lg:px-10'>
        <div className='min-w-0'>
          <p className='truncate text-sm font-medium text-sidebar-primary'>
            <Link to={timerLink.to} className='hover:underline'>
              {timerLink.title}
            </Link>
          </p>
          <p className='max-h-0 overflow-hidden text-xs text-muted-foreground opacity-0'>
            {timerLink.subtitle}
          </p>
        </div>

        <div className='flex items-center gap-3'>
          <span className='font-mono text-lg font-semibold tabular-nums text-sidebar-primary'>
            {formatElapsed(elapsedSeconds)}
          </span>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='border-border/60 bg-background/70 hover:bg-background'
            disabled={isPausing}
            onClick={() => void pauseTimer()}
          >
            <Pause />
          </Button>
        </div>
      </div>
    </div>
  );
}
