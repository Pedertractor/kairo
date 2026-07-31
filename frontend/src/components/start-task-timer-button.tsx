import { Pause, Play } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useActiveTimer } from '@/hooks/use-active-timer'
import { useAuth } from '@/hooks/use-auth'

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
  const { user } = useAuth()
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
      aria-label={
        user?.absent ? 'Indisponível enquanto ausente' : 'Iniciar timer'
      }
      title={user?.absent ? 'Você está marcado como ausente' : undefined}
      disabled={isStarting || user?.absent}
      onClick={() => void startTaskTimer(projectId, taskId)}
    >
      <Play />
    </Button>
  )
}
