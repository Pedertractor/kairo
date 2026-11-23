import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { DatePicker } from '@/components/date-picker'
import { Button } from '@/components/ui/button'
import { fromDateKey, toDateKey } from '@/lib/date'
import { cn } from '@/lib/utils'

interface TimelineDateFilterProps {
  /** Selected day as `YYYY-MM-DD`. */
  value: string
  onChange: (dateKey: string) => void
  className?: string
}

/** Pick any past day for a day timeline: step back/forward, open a calendar or jump to today. */
export function TimelineDateFilter({
  value,
  onChange,
  className,
}: TimelineDateFilterProps) {
  const todayKey = toDateKey(new Date())
  const isToday = value >= todayKey

  function shift(days: number) {
    const next = dayjs(value).add(days, 'day').format('YYYY-MM-DD')
    onChange(next > todayKey ? todayKey : next)
  }

  return (
    <div className={cn('flex shrink-0 items-center gap-1', className)}>
      <Button
        type='button'
        variant='ghost'
        size='icon-sm'
        className='size-8 rounded-full'
        aria-label='Dia anterior'
        onClick={() => shift(-1)}
      >
        <ChevronLeft className='size-4' />
      </Button>
      <DatePicker
        date={fromDateKey(value)}
        maxDate={new Date()}
        displayFormat='EEE, dd/MM/yy'
        className='h-8 w-40 capitalize'
        onDateChange={(next) => {
          if (next) onChange(toDateKey(next))
        }}
      />
      <Button
        type='button'
        variant='ghost'
        size='icon-sm'
        className='size-8 rounded-full'
        aria-label='Próximo dia'
        disabled={isToday}
        onClick={() => shift(1)}
      >
        <ChevronRight className='size-4' />
      </Button>
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='h-8'
        disabled={isToday}
        onClick={() => onChange(todayKey)}
      >
        Hoje
      </Button>
    </div>
  )
}
