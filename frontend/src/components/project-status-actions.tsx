import { STATUS_LABELS } from '@/lib/card-status'
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
      className={
        statusClassName ??
        'rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground'
      }
      onClick={onStatusClick}
    >
      {STATUS_LABELS[project.status]}
    </button>
  )
}
