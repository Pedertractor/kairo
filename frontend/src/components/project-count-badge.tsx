import { useMemo, type ReactNode } from 'react'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CARD_STATUSES, STATUS_LABELS } from '@/lib/card-status'
import { cn } from '@/lib/utils'
import type { ProjectSummary } from '@/types/card'

export function getProjectStatusCounts(projects: ProjectSummary[]) {
  return CARD_STATUSES.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    count: projects.filter((project) => project.status === status).length,
  })).filter((item) => item.count > 0)
}

export function ProjectCountBadge({
  projects,
  emptyLabel,
  children,
}: {
  projects: ProjectSummary[]
  emptyLabel: string
  children?: ReactNode
}) {
  const statusCounts = useMemo(
    () => getProjectStatusCounts(projects),
    [projects],
  )

  return (
    <Tooltip>
      <TooltipTrigger
        delay={200}
        render={
          <span className="inline-flex items-center">
            {children}
            <span
              className={cn(
                'inline-flex min-w-5 items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[11px] leading-none font-semibold tabular-nums text-muted-foreground',
                children ? 'ml-1.5' : null,
              )}
              aria-label={`${projects.length} ${projects.length === 1 ? 'projeto' : 'projetos'}`}
            >
              {projects.length}
            </span>
          </span>
        }
      />
      <TooltipContent
        side="bottom"
        className="rounded-xl border border-border bg-card px-3 py-2 text-card-foreground shadow-lg [&>svg]:hidden"
      >
        {projects.length === 0 ? (
          <p>{emptyLabel}</p>
        ) : (
          <ul className="min-w-40 space-y-1">
            {statusCounts.map((item) => (
              <li
                key={item.status}
                className="flex items-center justify-between gap-6 text-xs"
              >
                <span>{item.label}</span>
                <span className="font-semibold tabular-nums">{item.count}</span>
              </li>
            ))}
          </ul>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

export function ProjectStatusInline({
  projects,
}: {
  projects: ProjectSummary[]
}) {
  const statusCounts = useMemo(
    () => getProjectStatusCounts(projects),
    [projects],
  )

  if (statusCounts.length === 0) {
    return null
  }

  return (
    <span className="flex flex-wrap items-center gap-x-2 text-xs">
      {statusCounts.map((item) => (
        <span key={item.status}>
          {item.label}{' '}
          <span className="font-semibold tabular-nums">{item.count}</span>
        </span>
      ))}
    </span>
  )
}
