import {
  formatDayMinutes,
  getMinutesOnSelectedDay,
  MINUTES_IN_DAY,
} from '@/lib/timeline-day'

export function formatTimeRange(
  startedAt: string,
  endedAt: string | null,
  selectedDate: string,
): string {
  const startMinutes = getMinutesOnSelectedDay(startedAt, selectedDate)
  const endMinutes = endedAt
    ? getMinutesOnSelectedDay(endedAt, selectedDate)
    : null
  const crossesMidnight =
    startMinutes === 0 || endMinutes === MINUTES_IN_DAY
  const separator = crossesMidnight ? ' → ' : ' - '
  const endLabel =
    endMinutes === null ? 'agora' : formatDayMinutes(endMinutes)

  return `${formatDayMinutes(startMinutes)}${separator}${endLabel}`
}

export function formatCurrentTime(date = new Date()): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}
