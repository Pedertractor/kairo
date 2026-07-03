import { CARD_STATUS_BADGE_CLASS, STATUS_LABELS } from '@/lib/card-status'
import { cn } from '@/lib/utils'
import type { ActivitySummary } from '@/types/card'

import { StartActivityTimerButton } from './start-activity-timer-button'

interface ActivityStatusActionsProps {
  teamId: string
  activity: ActivitySummary
  onStatusClick: () => void
  statusClassName?: string
}

export function ActivityStatusActions({
  teamId,
  activity,
  onStatusClick,
  statusClassName,
}: ActivityStatusActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <StartActivityTimerButton
        teamId={teamId}
        activityId={activity.id}
        className="text-muted-foreground hover:text-sidebar-primary"
      />
      <button
        type="button"
        className={cn(
          CARD_STATUS_BADGE_CLASS[activity.status],
          statusClassName,
        )}
        onClick={onStatusClick}
      >
        {STATUS_LABELS[activity.status]}
      </button>
    </div>
  )
}
