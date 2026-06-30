import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pause } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useActiveTimer } from '@/contexts/active-timer-context'
import { formatElapsed } from '@/lib/format-elapsed'
import { cn } from '@/lib/utils'

const PROXIMITY_THRESHOLD_PX = 88

export function ActiveTimerBar() {
  const { activeTimer, elapsedSeconds, isPausing, pauseTimer } =
    useActiveTimer()
  const [isHovered, setIsHovered] = useState(false)
  const [isNearBottom, setIsNearBottom] = useState(false)

  const isExpanded = isHovered || isNearBottom

  useEffect(() => {
    if (!activeTimer) {
      setIsNearBottom(false)
      return
    }

    function handleMouseMove(event: MouseEvent) {
      const distanceFromBottom = window.innerHeight - event.clientY
      setIsNearBottom(distanceFromBottom <= PROXIMITY_THRESHOLD_PX)
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [activeTimer])

  if (!activeTimer) {
    return null
  }

  const { activity } = activeTimer

  return (
    <div
      className={cn(
        'sticky bottom-0 z-50 w-full shrink-0 border-t transition-all duration-300 ease-out',
        'border-white/50 bg-background/55 backdrop-blur-md',
        'dark:border-white/10 dark:bg-background/45',
        isExpanded ? 'py-5 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.15)]' : 'py-2.5',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          'mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 transition-all duration-300 ease-out lg:px-10',
          isExpanded ? 'gap-6' : 'gap-4',
        )}
      >
        <div className="min-w-0">
          <p
            className={cn(
              'truncate font-medium text-sidebar-primary transition-all duration-300 ease-out',
              isExpanded ? 'text-base' : 'text-sm',
            )}
          >
            <Link
              to={`/equipes/${activity.teamId}/atividades/${activity.id}`}
              className="hover:underline"
            >
              {activity.title}
            </Link>
          </p>
          <p
            className={cn(
              'text-muted-foreground transition-all duration-300 ease-out',
              isExpanded
                ? 'mt-1 text-sm opacity-100'
                : 'max-h-0 overflow-hidden text-xs opacity-0',
            )}
          >
            Timer em andamento
          </p>
        </div>

        <div
          className={cn(
            'flex items-center transition-all duration-300 ease-out',
            isExpanded ? 'gap-4' : 'gap-3',
          )}
        >
          <span
            className={cn(
              'font-mono font-semibold tabular-nums text-sidebar-primary transition-all duration-300 ease-out',
              isExpanded ? 'text-3xl' : 'text-lg',
            )}
          >
            {formatElapsed(elapsedSeconds)}
          </span>
          <Button
            type="button"
            size={isExpanded ? 'default' : 'sm'}
            variant="outline"
            className={cn(
              'border-border/60 bg-background/70 transition-all duration-300 ease-out hover:bg-background',
              isExpanded && 'h-10 px-4',
            )}
            disabled={isPausing}
            onClick={() => void pauseTimer()}
          >
            <Pause className={cn(isExpanded && 'size-4')} />
            Pausar
          </Button>
        </div>
      </div>
    </div>
  )
}
