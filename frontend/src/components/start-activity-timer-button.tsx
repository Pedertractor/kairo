import { Pause, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useActiveTimer } from '@/hooks/use-active-timer';
import { useAuth } from '@/hooks/use-auth';

interface StartActivityTimerButtonProps {
  teamId: string;
  activityId: string;
  size?: 'icon-xs' | 'icon-sm';
  className?: string;
}

export function StartActivityTimerButton({
  teamId,
  activityId,
  size = 'icon-xs',
  className,
}: StartActivityTimerButtonProps) {
  const { user } = useAuth();
  const { startTimer, pauseTimer, isStarting, isPausing, isActivityActive } =
    useActiveTimer();

  if (isActivityActive(activityId)) {
    return (
      <Button
        type='button'
        variant='ghost'
        size={size}
        className={className}
        aria-label='Pausar timer'
        disabled={isPausing}
        onClick={() => void pauseTimer()}
      >
        <Pause />
      </Button>
    );
  }

  return (
    <Button
      type='button'
      variant='ghost'
      size={size}
      className={className}
      aria-label={user?.absent ? 'Indisponível enquanto ausente' : 'Iniciar timer'}
      title={user?.absent ? 'Você está marcado como ausente' : undefined}
      disabled={isStarting || user?.absent}
      onClick={() => void startTimer(teamId, activityId)}
    >
      <Play />
    </Button>
  );
}
