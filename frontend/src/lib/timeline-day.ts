import dayjs from 'dayjs'

export const DEFAULT_TIMELINE_START_HOUR = 5
export const DEFAULT_TIMELINE_END_HOUR = 18
export const MINUTES_IN_DAY = 24 * 60

export function getMinutesOnSelectedDay(
  iso: string,
  selectedDate: string,
): number {
  const dayStart = dayjs(selectedDate).startOf('day')
  const dayEnd = dayStart.add(1, 'day')
  const time = dayjs(iso)

  if (time.valueOf() <= dayStart.valueOf()) {
    return 0
  }

  if (time.valueOf() >= dayEnd.valueOf()) {
    return MINUTES_IN_DAY
  }

  return time.hour() * 60 + time.minute()
}

export function formatDayMinutes(minutes: number): string {
  const clamped = Math.max(0, Math.min(MINUTES_IN_DAY, minutes))
  const normalized = clamped === MINUTES_IN_DAY ? 0 : clamped
  const hours = Math.floor(normalized / 60)
  const mins = normalized % 60

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export function getVisibleTimelineRange(
  blocks: Array<{ startedAt: string; endedAt: string | null }>,
  selectedDate: string,
  now: Date,
): { rangeStart: number; rangeEnd: number } {
  let rangeStart = DEFAULT_TIMELINE_START_HOUR * 60
  let rangeEnd = DEFAULT_TIMELINE_END_HOUR * 60

  for (const block of blocks) {
    const start = getMinutesOnSelectedDay(block.startedAt, selectedDate)
    const end = block.endedAt
      ? getMinutesOnSelectedDay(block.endedAt, selectedDate)
      : getMinutesOnSelectedDay(now.toISOString(), selectedDate)

    if (start < rangeStart) {
      rangeStart = Math.floor(start / 60) * 60
    }

    if (end > rangeEnd) {
      rangeEnd = Math.ceil(end / 60) * 60
    }
  }

  return {
    rangeStart: Math.max(0, rangeStart),
    rangeEnd: Math.min(MINUTES_IN_DAY, rangeEnd),
  }
}
