import { CARD_STATUS_BADGE_CLASS, STATUS_LABELS } from '@/lib/card-status'
import { cn } from '@/lib/utils'
import type { ProjectSummary } from '@/types/card'

interface ProjectStatusActionsProps {
  project: ProjectSummary
  onStatusClick: () => void
  statusClassName?: string
}

export function ProjectStatusActions({
  project,
  onStatusClick,
  statusClassName,
}: ProjectStatusActionsProps) {
  return (
    <button
      type="button"
      className={cn(CARD_STATUS_BADGE_CLASS[project.status], statusClassName)}
      onClick={onStatusClick}
    >
      {STATUS_LABELS[project.status]}
    </button>
  )
}
