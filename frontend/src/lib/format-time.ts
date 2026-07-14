import dayjs from 'dayjs'

export function formatTimeRange(startedAt: string, endedAt: string | null): string {
  const start = dayjs(startedAt).format('HH:mm')
  const end = endedAt ? dayjs(endedAt).format('HH:mm') : 'agora'

  return `${start} - ${end}`
}

export function formatCurrentTime(date = new Date()): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}
