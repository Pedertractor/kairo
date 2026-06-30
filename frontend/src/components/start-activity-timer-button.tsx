import { Play } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useActiveTimer } from '@/hooks/use-active-timer'

interface StartActivityTimerButtonProps {
  teamId: string
  activityId: string
  size?: 'icon-xs' | 'icon-sm'
  className?: string
}

export function StartActivityTimerButton({
  teamId,
  activityId,
  size = 'icon-xs',
  className,
}: StartActivityTimerButtonProps) {
  const { startTimer, isStarting, isActivityActive } = useActiveTimer()

  if (isActivityActive(activityId)) {
    return null
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={className}
      aria-label="Iniciar timer"
      disabled={isStarting}
      onClick={() => void startTimer(teamId, activityId)}
    >
      <Play />
    </Button>
  )
}
