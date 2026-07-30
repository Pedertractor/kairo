import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR as dateFnsPtBR } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { ptBR as dayPickerPtBR } from 'react-day-picker/locale'
import type { DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DateRangePickerProps {
  id?: string
  range?: DateRange
  onRangeChange: (range: DateRange | undefined) => void
  disabled?: boolean
  placeholder?: string
  displayFormat?: string
  className?: string
  numberOfMonths?: number
}

export function DateRangePicker({
  id,
  range,
  onRangeChange,
  disabled = false,
  placeholder = 'Selecionar período',
  displayFormat = 'dd-MM-yy',
  className,
  numberOfMonths = 2,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)

  function handleOpenChange(nextOpen: boolean) {
    const scrollY = window.scrollY
    setOpen(nextOpen)

    // Prevent focus management from jumping the page when the popover opens/closes.
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY })
    })
  }

  const label =
    range?.from && range.to
      ? `${format(range.from, displayFormat, { locale: dateFnsPtBR })} – ${format(range.to, displayFormat, { locale: dateFnsPtBR })}`
      : range?.from
        ? format(range.from, displayFormat, { locale: dateFnsPtBR })
        : placeholder

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !range?.from && 'text-muted-foreground',
              className,
            )}
          />
        }
      >
        <CalendarIcon />
        {label}
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        initialFocus={false}
        finalFocus={false}
      >
        <Calendar
          mode="range"
          selected={range}
          onSelect={(nextRange) => {
            onRangeChange(nextRange)
            if (nextRange?.from && nextRange.to) {
              setOpen(false)
            }
          }}
          numberOfMonths={numberOfMonths}
          locale={dayPickerPtBR}
        />
      </PopoverContent>
    </Popover>
  )
}
