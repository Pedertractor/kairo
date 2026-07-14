import { Pause, Play } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useActiveTimer } from '@/hooks/use-active-timer'

interface StartTaskTimerButtonProps {
  projectId: string
  taskId: string
  size?: 'icon-xs' | 'icon-sm'
  className?: string
}

export function StartTaskTimerButton({
  projectId,
  taskId,
  size = 'icon-xs',
  className,
}: StartTaskTimerButtonProps) {
  const { startTaskTimer, pauseTimer, isStarting, isPausing, isTaskActive } =
    useActiveTimer()

  if (isTaskActive(taskId)) {
    return (
      <Button
        type="button"
        variant="ghost"
        size={size}
        className={className}
        aria-label="Pausar timer"
        disabled={isPausing}
        onClick={() => void pauseTimer()}
      >
        <Pause />
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={className}
      aria-label="Iniciar timer"
      disabled={isStarting}
      onClick={() => void startTaskTimer(projectId, taskId)}
    >
      <Play />
    </Button>
  )
}
