import dayjs from 'dayjs'

export function toDateKey(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD')
}
