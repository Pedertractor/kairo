import { CARD_STATUS_BADGE_CLASS, STATUS_LABELS } from '@/lib/card-status'
import { cn } from '@/lib/utils'
import type { ActivitySummary } from '@/types/card'

import { FavoriteButton } from './favorite-button'
import { StartActivityTimerButton } from './start-activity-timer-button'

interface ActivityStatusActionsProps {
  teamId: string
  activity: ActivitySummary
  onStatusClick: () => void
  onFavoriteToggle?: (isFavorite: boolean) => void
  statusClassName?: string
}

export function ActivityStatusActions({
  teamId,
  activity,
  onStatusClick,
  onFavoriteToggle,
  statusClassName,
}: ActivityStatusActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <FavoriteButton
        target={{
          kind: 'activity',
          teamId,
          activityId: activity.id,
        }}
        isFavorite={activity.isFavorite}
        onToggle={onFavoriteToggle}
        className="text-muted-foreground hover:text-amber-500"
      />
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
