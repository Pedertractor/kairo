import { Pause, Play } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useActiveTimer } from '@/hooks/use-active-timer'
import { useAuth } from '@/hooks/use-auth'
import type { TaskStatus } from '@/types/task'

interface StartTaskTimerButtonProps {
  projectId: string
  taskId: string
  status?: TaskStatus
  size?: 'icon-xs' | 'icon-sm'
  className?: string
}

export function StartTaskTimerButton({
  projectId,
  taskId,
  status,
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

  const lockedByOther = status === 'IN_PROGRESS'

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={className}
      aria-label={
        user?.absent
          ? 'Indisponível enquanto ausente'
          : lockedByOther
          ? 'Tarefa já em andamento por outro usuário'
          : 'Iniciar timer'
      }
      title={
        user?.absent
          ? 'Você está marcado como ausente'
          : lockedByOther
          ? 'Esta tarefa já está em andamento por outro usuário'
          : undefined
      }
      disabled={isStarting || lockedByOther || user?.absent}
      onClick={() => void startTaskTimer(projectId, taskId)}
    >
      <Play />
    </Button>
  )
}
