import { formatLoggedDuration } from '@/lib/format-duration'
import {
  getTimeBudgetStatus,
  type TimeBudgetStatus,
} from '@/lib/card-time-budget'
import { cn } from '@/lib/utils'

const STATUS_CLASS: Record<Exclude<TimeBudgetStatus, 'none'>, string> = {
  ok: 'text-muted-foreground',
  near: 'text-amber-600 dark:text-amber-500',
  over: 'text-destructive',
}

interface CardTimeBudgetProps {
  loggedSeconds: number
  estimatedHours: string | null
  className?: string
}

export function CardTimeBudget({
  loggedSeconds,
  estimatedHours,
  className,
}: CardTimeBudgetProps) {
  const spentLabel = formatLoggedDuration(loggedSeconds)
  const status = getTimeBudgetStatus(loggedSeconds, estimatedHours)

  if (!estimatedHours) {
    return (
      <p className={cn('text-xs text-muted-foreground', className)}>
        {spentLabel} registradas
      </p>
    )
  }

  return (
    <p
      className={cn(
        'text-xs',
        status === 'none' ? 'text-muted-foreground' : STATUS_CLASS[status],
        className,
      )}
    >
      {spentLabel} / {estimatedHours}h estimadas
    </p>
  )
}
