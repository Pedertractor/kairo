import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import { Minus, Plus } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { toDateKey } from '@/lib/date'
import { formatCurrentTime, formatTimeRange } from '@/lib/format-time'
import { cn } from '@/lib/utils'
import type { DayTimelineBlock } from '@/types/time-entry'

dayjs.locale('pt-br')

const TIMELINE_START_HOUR = 5
const TIMELINE_END_HOUR = 18
const TIMELINE_VIEWPORT_HEIGHT = 440
const BASE_HOUR_HEIGHT = 58
const MIN_ZOOM = 1
const MAX_ZOOM = 4
const ZOOM_STEP = 0.25

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

interface TimelineTick {
  minutes: number
  major: boolean
  label: string | null
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

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function getMinutesFromMidnight(iso: string): number {
  const date = dayjs(iso)

  return date.hour() * 60 + date.minute()
}

function formatTickLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

function getTickInterval(zoom: number): number {
  if (zoom >= 3) return 15
  if (zoom >= 2) return 30
  if (zoom >= 1.5) return 30

  return 60
}

function buildTicks(zoom: number): TimelineTick[] {
  const rangeStart = TIMELINE_START_HOUR * 60
  const rangeEnd = TIMELINE_END_HOUR * 60
  const interval = getTickInterval(zoom)
  const ticks: TimelineTick[] = []

  for (let minutes = rangeStart; minutes <= rangeEnd; minutes += interval) {
    const major = minutes % 60 === 0

    ticks.push({
      minutes,
      major,
      label: major || zoom >= 2 ? formatTickLabel(minutes) : null,
    })
  }

  return ticks
}

function getBlockStyle(block: DayTimelineBlock, hourHeight: number) {
  const rangeStart = TIMELINE_START_HOUR * 60
  const rangeEnd = TIMELINE_END_HOUR * 60
  const start = Math.max(getMinutesFromMidnight(block.startedAt), rangeStart)
  const end = block.endedAt
    ? Math.min(getMinutesFromMidnight(block.endedAt), rangeEnd)
    : Math.min(getMinutesFromMidnight(new Date().toISOString()), rangeEnd)

  const top = ((start - rangeStart) / 60) * hourHeight
  const height = Math.max(((end - start) / 60) * hourHeight, Math.min(28, hourHeight * 0.45))

  return { top, height }
}

function getBlockColors(block: DayTimelineBlock, isToday: boolean, now: Date) {
  if (block.isActive) {
    return {
      bar: 'bg-sidebar-primary text-sidebar-primary-foreground',
      subtext: 'text-sidebar-primary-foreground/80',
    }
  }

  const isFuture = isToday && dayjs(block.startedAt).isAfter(dayjs(now))

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
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const scrollRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(zoom)

  zoomRef.current = zoom

  const hourHeight = BASE_HOUR_HEIGHT * zoom
  const contentHeight = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * hourHeight
  const rangeStart = TIMELINE_START_HOUR * 60
  const rangeEnd = TIMELINE_END_HOUR * 60
  const ticks = useMemo(() => buildTicks(zoom), [zoom])

  const minutesToTop = useCallback(
    (minutes: number) => ((minutes - rangeStart) / 60) * hourHeight,
    [hourHeight, rangeStart],
  )

  const setZoomPreservingScroll = useCallback((nextZoom: number) => {
    const container = scrollRef.current
    const clamped = clampZoom(nextZoom)

    if (!container) {
      setZoom(clamped)
      return
    }

    const centerRatio =
      (container.scrollTop + container.clientHeight / 2) /
      Math.max(container.scrollHeight, 1)

    setZoom(clamped)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const nextScrollHeight = Math.max(container.scrollHeight, 1)
        container.scrollTop =
          centerRatio * nextScrollHeight - container.clientHeight / 2
      })
    })
  }, [])

  useEffect(() => {
    if (!isToday) {
      return
    }

    const interval = window.setInterval(() => setNow(new Date()), 60_000)

    return () => window.clearInterval(interval)
  }, [isToday])

  useEffect(() => {
    const container = scrollRef.current

    if (!container) {
      return
    }

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return
      }

      event.preventDefault()

      const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      setZoomPreservingScroll(zoomRef.current + delta)
    }

    container.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [setZoomPreservingScroll])

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const showNowLine =
    isToday && currentMinutes >= rangeStart && currentMinutes <= rangeEnd
  const nowTop = minutesToTop(currentMinutes)

  return (
    <Card className="gap-0 rounded-2xl border-0 py-5 shadow-sm">
      <CardHeader className="flex-col items-start gap-3 space-y-0 px-5 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <CardTitle className="text-base font-semibold">Timeline do Dia</CardTitle>

          <div className="flex items-center rounded-full border bg-muted/50 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-7 rounded-full"
              aria-label="Diminuir zoom"
              disabled={zoom <= MIN_ZOOM}
              onClick={() => setZoomPreservingScroll(zoom - ZOOM_STEP)}
            >
              <Minus className="size-3.5" />
            </Button>
            <span className="min-w-10 px-1 text-center text-[11px] font-medium text-muted-foreground tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-7 rounded-full"
              aria-label="Aumentar zoom"
              disabled={zoom >= MAX_ZOOM}
              onClick={() => setZoomPreservingScroll(zoom + ZOOM_STEP)}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex shrink-0 rounded-full bg-muted p-1">
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
          <div
            ref={scrollRef}
            className="overflow-y-auto overscroll-contain rounded-lg"
            style={{ height: TIMELINE_VIEWPORT_HEIGHT }}
          >
            <div
              className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[3.25rem_minmax(0,1fr)] sm:gap-x-4"
              style={{ height: contentHeight }}
            >
              <div className="relative shrink-0">
                {ticks.map((tick) =>
                  tick.label ? (
                    <div
                      key={tick.minutes}
                      className={cn(
                        'absolute right-0 w-full -translate-y-1/2 text-right tabular-nums',
                        tick.major
                          ? 'text-xs text-muted-foreground'
                          : 'text-[10px] text-muted-foreground/70',
                      )}
                      style={{ top: minutesToTop(tick.minutes) }}
                    >
                      {tick.label}
                    </div>
                  ) : null,
                )}
              </div>

              <div className="relative min-w-0">
                {ticks.map((tick) => (
                  <div
                    key={tick.minutes}
                    className={cn(
                      'absolute right-0 left-0 border-t',
                      tick.major ? 'border-border/70' : 'border-border/35',
                    )}
                    style={{ top: minutesToTop(tick.minutes) }}
                  />
                ))}

                {blocks.map((block) => {
                  const { top, height } = getBlockStyle(block, hourHeight)
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
                      <p className={cn('truncate text-xs', colors.subtext)}>
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

                {blocks.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      Nenhum apontamento neste dia.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {!isLoading ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Use Ctrl + scroll ou os botões +/- para ampliar e ver intervalos menores.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
