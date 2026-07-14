export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString()
}

export function formatTimeRange(startedAt: string, endedAt: string | null): string {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const start = formatter.format(new Date(startedAt))

  if (!endedAt) {
    return start
  }

  return `${start} - ${formatter.format(new Date(endedAt))}`
}

export function formatCurrentTime(date = new Date()): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function getRecentDayOptions(count = 4): Array<{ key: string; label: string }> {
  const today = new Date()
  const formatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - index)

    let label = formatter.format(date).replace('.', '')

    if (index === 0) {
      label = 'Hoje'
    } else if (index === 1) {
      label = 'Ontem'
    }

    return {
      key: toDateKey(date),
      label,
    }
  })
}

export function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

export const TIMELINE_START_HOUR = 8
export const TIMELINE_END_HOUR = 18
export const TIMELINE_TOTAL_MINUTES =
  (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60

export function timeToTimelinePercent(isoDate: string): number {
  const date = new Date(isoDate)
  const minutes = minutesSinceMidnight(date) - TIMELINE_START_HOUR * 60
  const clamped = Math.max(0, Math.min(TIMELINE_TOTAL_MINUTES, minutes))

  return (clamped / TIMELINE_TOTAL_MINUTES) * 100
}

export function blockTimelineStyle(
  startedAt: string,
  endedAt: string | null,
): { top: string; height: string } {
  const startPercent = timeToTimelinePercent(startedAt)
  const endDate = endedAt ? new Date(endedAt) : new Date()
  const endPercent = timeToTimelinePercent(endDate.toISOString())
  const height = Math.max(endPercent - startPercent, 4)

  return {
    top: `${startPercent}%`,
    height: `${height}%`,
  }
}
