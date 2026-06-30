import { STATUS_LABELS } from '@/lib/card-status'
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
        className={
          statusClassName ??
          'rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground'
        }
        onClick={onStatusClick}
      >
        {STATUS_LABELS[activity.status]}
      </button>
    </div>
  )
}
