import dayjs from 'dayjs'

/** Seconds of an open timer that fall within today (local timezone). */
export function getActiveTodaySeconds(
  startedAt: string,
  elapsedSeconds: number,
): number {
  const startedAtMs = new Date(startedAt).getTime()
  const nowMs = startedAtMs + elapsedSeconds * 1000
  const dayStart = dayjs().startOf('day').valueOf()
  const dayEnd = dayjs().endOf('day').valueOf()
  const start = Math.max(startedAtMs, dayStart)
  const end = Math.min(nowMs, dayEnd)

  return Math.max(0, Math.floor((end - start) / 1000))
}
