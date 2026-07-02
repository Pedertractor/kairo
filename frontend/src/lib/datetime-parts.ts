import dayjs from 'dayjs'

export interface DateTimeParts {
  year: string
  month: string
  day: string
  hour: string
  minute: string
}

export const MONTH_OPTIONS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
] as const

export function isoToDateTimeParts(iso: string): DateTimeParts {
  const date = dayjs(iso)

  return {
    year: date.format('YYYY'),
    month: date.format('MM'),
    day: date.format('DD'),
    hour: date.format('HH'),
    minute: date.format('mm'),
  }
}

export function dateTimePartsToIso(parts: DateTimeParts): string {
  return dayjs(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00`,
  ).toISOString()
}

export function isDateTimePartsComplete(parts: DateTimeParts): boolean {
  return Boolean(
    parts.year && parts.month && parts.day && parts.hour && parts.minute,
  )
}

export function getDayOptions(year: string, month: string): string[] {
  if (!year || !month) {
    return Array.from({ length: 31 }, (_, index) =>
      String(index + 1).padStart(2, '0'),
    )
  }

  const daysInMonth = dayjs(`${year}-${month}-01`).daysInMonth()

  return Array.from({ length: daysInMonth }, (_, index) =>
    String(index + 1).padStart(2, '0'),
  )
}

export function getYearOptions(centerYear?: string): string[] {
  const baseYear = centerYear ? Number(centerYear) : dayjs().year()
  const start = baseYear - 5
  const end = baseYear + 5

  return Array.from({ length: end - start + 1 }, (_, index) =>
    String(start + index),
  )
}

export function getHourOptions(): string[] {
  return Array.from({ length: 24 }, (_, index) =>
    String(index).padStart(2, '0'),
  )
}

export function getMinuteOptions(): string[] {
  return Array.from({ length: 60 }, (_, index) =>
    String(index).padStart(2, '0'),
  )
}

export function clampDayForMonth(
  parts: DateTimeParts,
): DateTimeParts {
  const days = getDayOptions(parts.year, parts.month)

  if (!days.includes(parts.day)) {
    return { ...parts, day: days[days.length - 1] ?? '01' }
  }

  return parts
}
