import dayjs from 'dayjs'

interface CardCreatedAtProps {
  createdAt: string
}

export function CardCreatedAt({ createdAt }: CardCreatedAtProps) {
  return (
    <time
      dateTime={createdAt}
      title={`Criação: ${dayjs(createdAt).format('DD/MM/YYYY [às] HH:mm')}`}
      aria-label={`Criação: ${dayjs(createdAt).format('DD/MM/YYYY [às] HH:mm')}`}
      className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground"
    >
      {dayjs(createdAt).format('DD/MM/YYYY [às] HH:mm')}
    </time>
  )
}
