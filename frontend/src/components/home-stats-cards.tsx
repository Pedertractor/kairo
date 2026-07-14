import { useRef } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useActiveTimer, useElapsedSeconds } from '@/hooks/use-active-timer'
import {
  formatChangePercent,
  formatLoggedDuration,
} from '@/lib/format-duration'
import { getActiveTodaySeconds } from '@/lib/today-overlap-seconds'
import type { DayDashboardStats } from '@/types/time-entry'

interface HomeStatsCardsProps {
  stats: DayDashboardStats | null
  isLoading: boolean
}

/**
 * Isolates the 1s tick so only this leaf re-renders while a timer is running.
 * Snapshots the completed (non-active) portion when stats refresh so we don't
 * double-count the live session.
 */
function LiveLoggedDuration({ loggedSeconds }: { loggedSeconds: number }) {
  const { activeTimer } = useActiveTimer()
  const elapsedSeconds = useElapsedSeconds()
  const startedAt = activeTimer?.timeEntry.startedAt ?? null

  const baselineRef = useRef({
    loggedSeconds,
    startedAt,
    activeTodaySeconds: startedAt
      ? getActiveTodaySeconds(startedAt, elapsedSeconds)
      : 0,
  })

  const baseline = baselineRef.current

  if (
    baseline.loggedSeconds !== loggedSeconds ||
    baseline.startedAt !== startedAt
  ) {
    baseline.loggedSeconds = loggedSeconds
    baseline.startedAt = startedAt
    baseline.activeTodaySeconds = startedAt
      ? getActiveTodaySeconds(startedAt, elapsedSeconds)
      : 0
  }

  const displaySeconds = startedAt
    ? baseline.loggedSeconds -
      baseline.activeTodaySeconds +
      getActiveTodaySeconds(startedAt, elapsedSeconds)
    : loggedSeconds

  return (
    <span className="text-3xl font-bold tracking-tight text-sidebar-primary tabular-nums">
      {formatLoggedDuration(displaySeconds, { includeSeconds: true })}
    </span>
  )
}

export function HomeStatsCards({ stats, isLoading }: HomeStatsCardsProps) {
  const changeLabel = stats ? formatChangePercent(stats.changePercent) : null

  return (
    <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
      <Card className="gap-0 rounded-2xl border-0 bg-card py-5 shadow-sm">
        <CardContent className="space-y-2">
          <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            Tempo apontado
          </p>

          {isLoading ? (
            <Skeleton className="h-9 w-40" />
          ) : (
            <div className="flex items-baseline gap-3">
              <LiveLoggedDuration loggedSeconds={stats?.loggedSeconds ?? 0} />
              {changeLabel ? (
                <span className="text-sm font-semibold text-sidebar-primary">
                  {changeLabel}
                </span>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 rounded-2xl border-0 bg-card py-5 shadow-sm">
        <CardContent className="space-y-2">
          <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            Diversidade de atividades
          </p>

          {isLoading ? (
            <Skeleton className="h-9 w-20" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {String(stats?.uniqueCategories ?? 0).padStart(2, '0')}
              </span>
              <span className="text-sm text-muted-foreground">Categorias</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
