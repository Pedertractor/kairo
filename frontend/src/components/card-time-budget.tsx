import { Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
  onEdit?: () => void
}

export function CardTimeBudget({
  loggedSeconds,
  estimatedHours,
  className,
  onEdit,
}: CardTimeBudgetProps) {
  const spentLabel = formatLoggedDuration(loggedSeconds)
  const status = getTimeBudgetStatus(loggedSeconds, estimatedHours)

  const label = !estimatedHours
    ? `${spentLabel} registradas`
    : `${spentLabel} / ${estimatedHours}h estimadas`

  return (
    <div className="flex items-center gap-1">
      <p
        className={cn(
          'text-xs',
          !estimatedHours || status === 'none'
            ? 'text-muted-foreground'
            : STATUS_CLASS[status],
          className,
        )}
      >
        {label}
      </p>
      {onEdit ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Editar horas estimadas"
          onClick={onEdit}
        >
          <Pencil />
        </Button>
      ) : null}
    </div>
  )
}
