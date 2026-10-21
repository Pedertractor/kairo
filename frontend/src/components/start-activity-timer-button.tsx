import { Pause, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useActiveTimer } from '@/hooks/use-active-timer';

interface StartActivityTimerButtonProps {
  teamId: string;
  activityId: string;
  canStart?: boolean;
  size?: 'icon-xs' | 'icon-sm';
  className?: string;
}

export function StartActivityTimerButton({
  teamId,
  activityId,
  canStart = true,
  size = 'icon-xs',
  className,
}: StartActivityTimerButtonProps) {
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

  if (!canStart) {
    return null;
  }

  return (
    <Button
      type='button'
      variant='ghost'
      size={size}
      className={className}
      aria-label='Iniciar timer'
      disabled={isStarting}
      onClick={() => void startTimer(teamId, activityId)}
    >
      <Play />
    </Button>
  );
}
