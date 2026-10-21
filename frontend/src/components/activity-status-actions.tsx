import { CARD_STATUS_BADGE_CLASS, STATUS_LABELS } from '@/lib/card-status'
import { cn } from '@/lib/utils'
import type { ActivitySummary } from '@/types/card'

import { FavoriteButton } from './favorite-button'
import { StartActivityTimerButton } from './start-activity-timer-button'

interface ActivityStatusActionsProps {
  teamId: string
  activity: ActivitySummary
  canChangeStatus: boolean
  canStartTimer?: boolean
  onStatusClick: () => void
  onFavoriteToggle?: (isFavorite: boolean) => void
  statusClassName?: string
}

export function ActivityStatusActions({
  teamId,
  activity,
  canChangeStatus,
  canStartTimer = true,
  onStatusClick,
  onFavoriteToggle,
  statusClassName,
}: ActivityStatusActionsProps) {
  const statusClassNameMerged = cn(
    CARD_STATUS_BADGE_CLASS[activity.status],
    statusClassName,
  )

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
      />
      <StartActivityTimerButton
        teamId={teamId}
        activityId={activity.id}
        canStart={canStartTimer}
        className="text-muted-foreground hover:text-sidebar-primary"
      />
      {canChangeStatus ? (
        <button
          type="button"
          className={statusClassNameMerged}
          onClick={onStatusClick}
        >
          {STATUS_LABELS[activity.status]}
        </button>
      ) : (
        <span className={statusClassNameMerged}>
          {STATUS_LABELS[activity.status]}
        </span>
      )}
    </div>
  )
}
