import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toDateKey } from '@/lib/date'
import { formatCurrentTime, formatTimeRange } from '@/lib/format-time'
import { cn } from '@/lib/utils'
import type { DayTimelineBlock } from '@/types/time-entry'

dayjs.locale('pt-br')

const TIMELINE_START_HOUR = 8
const TIMELINE_END_HOUR = 18
const HOUR_HEIGHT = 52

interface DayTimelineProps {
  blocks: DayTimelineBlock[]
  selectedDate: string
  onDateChange: (date: string) => void
  isLoading: boolean
}

interface DateOption {
  key: string
  label: string
}

function buildDateOptions(): DateOption[] {
  const today = new Date()

  return Array.from({ length: 4 }, (_, index) => {
    const date = new Date(today)
    date.setDate(date.getDate() - index)

    const key = toDateKey(date)
    let label: string

    if (index === 0) {
      label = 'Hoje'
    } else if (index === 1) {
      label = 'Ontem'
    } else {
      label = dayjs(date).format('ddd')
    }

    return { key, label }
  })
}

function getMinutesFromMidnight(iso: string): number {
  const date = dayjs(iso)

  return date.hour() * 60 + date.minute()
}

function getBlockStyle(block: DayTimelineBlock) {
  const rangeStart = TIMELINE_START_HOUR * 60
  const rangeEnd = TIMELINE_END_HOUR * 60
  const start = Math.max(getMinutesFromMidnight(block.startedAt), rangeStart)
  const end = block.endedAt
    ? Math.min(getMinutesFromMidnight(block.endedAt), rangeEnd)
    : Math.min(getMinutesFromMidnight(new Date().toISOString()), rangeEnd)

  const top = ((start - rangeStart) / 60) * HOUR_HEIGHT
  const height = Math.max(((end - start) / 60) * HOUR_HEIGHT, 28)

  return { top, height }
}

function getBlockColors(
  block: DayTimelineBlock,
  isToday: boolean,
  now: Date,
) {
  if (block.isActive) {
    return {
      bar: 'bg-sidebar-primary text-sidebar-primary-foreground',
      subtext: 'text-sidebar-primary-foreground/80',
    }
  }

  const isFuture =
    isToday && dayjs(block.startedAt).isAfter(dayjs(now))

  if (isFuture) {
    return {
      bar: 'bg-[#C5D3FF] text-sidebar-primary',
      subtext: 'text-sidebar-primary/70',
    }
  }

  return {
    bar: 'bg-sidebar-primary text-sidebar-primary-foreground',
    subtext: 'text-sidebar-primary-foreground/80',
  }
}

export function DayTimeline({
  blocks,
  selectedDate,
  onDateChange,
  isLoading,
}: DayTimelineProps) {
  const dateOptions = useMemo(() => buildDateOptions(), [])
  const isToday = selectedDate === toDateKey(new Date())
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!isToday) {
      return
    }

    const interval = window.setInterval(() => setNow(new Date()), 60_000)

    return () => window.clearInterval(interval)
  }, [isToday])

  const timelineHeight = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * HOUR_HEIGHT
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const rangeStart = TIMELINE_START_HOUR * 60
  const rangeEnd = TIMELINE_END_HOUR * 60
  const showNowLine =
    isToday && currentMinutes >= rangeStart && currentMinutes <= rangeEnd
  const nowTop = ((currentMinutes - rangeStart) / 60) * HOUR_HEIGHT

  const hours = Array.from(
    { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 },
    (_, index) => TIMELINE_START_HOUR + index,
  )

  return (
    <Card className="gap-0 rounded-2xl border-0 py-5 shadow-sm">
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 px-5 pb-4">
        <CardTitle className="text-base font-semibold">Timeline do Dia</CardTitle>

        <div className="flex rounded-full bg-muted p-1">
          {dateOptions.map((option) => {
            const isActive = option.key === selectedDate

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onDateChange(option.key)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                  isActive
                    ? 'bg-card text-sidebar-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </CardHeader>

      <CardContent className="px-5">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : (
          <div className="flex gap-4">
            <div
              className="relative shrink-0 text-xs text-muted-foreground"
              style={{ height: timelineHeight }}
            >
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute right-0 -translate-y-1/2 pr-2"
                  style={{ top: (hour - TIMELINE_START_HOUR) * HOUR_HEIGHT }}
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            <div className="relative min-w-0 flex-1" style={{ height: timelineHeight }}>
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute right-0 left-0 border-t border-border/60"
                  style={{ top: (hour - TIMELINE_START_HOUR) * HOUR_HEIGHT }}
                />
              ))}

              {blocks.map((block) => {
                const { top, height } = getBlockStyle(block)
                const colors = getBlockColors(block, isToday, now)

                return (
                  <div
                    key={block.id}
                    className={cn(
                      'absolute right-0 left-0 overflow-hidden rounded-xl px-3 py-2',
                      colors.bar,
                    )}
                    style={{ top, height }}
                  >
                    <p className="truncate text-sm font-semibold">{block.title}</p>
                    <p className={cn('text-xs', colors.subtext)}>
                      {formatTimeRange(block.startedAt, block.endedAt)}
                    </p>
                  </div>
                )
              })}

              {showNowLine ? (
                <div
                  className="absolute right-0 left-0 z-10 flex items-center"
                  style={{ top: nowTop }}
                >
                  <span className="size-2.5 shrink-0 rounded-full bg-sidebar-primary" />
                  <div className="h-px flex-1 border-t border-dashed border-sidebar-primary" />
                  <span className="shrink-0 pl-2 text-xs font-semibold text-sidebar-primary">
                    {formatCurrentTime(now)}
                  </span>
                </div>
              ) : null}

              {!isLoading && blocks.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhum apontamento neste dia.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
