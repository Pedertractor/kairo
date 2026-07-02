export function splitDateTimeValue(iso: string | null): {
  date: Date | undefined
  time: string
} {
  if (!iso) {
    return { date: undefined, time: '00:00' }
  }

  const value = new Date(iso)
  const pad = (part: number) => String(part).padStart(2, '0')

  return {
    date: new Date(value.getFullYear(), value.getMonth(), value.getDate()),
    time: `${pad(value.getHours())}:${pad(value.getMinutes())}`,
  }
}

export function mergeDateTimeValue(
  date: Date | undefined,
  time: string,
): string | null {
  if (!date || !time) {
    return null
  }

  const [hours, minutes] = time.split(':').map(Number)
  const merged = new Date(date)
  merged.setHours(hours, minutes, 0, 0)

  return merged.toISOString()
}
