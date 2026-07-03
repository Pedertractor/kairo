import dayjs from 'dayjs'

export function toDateKey(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD')
}

export function fromDateKey(dateKey: string): Date {
  return dayjs(dateKey).toDate()
}
