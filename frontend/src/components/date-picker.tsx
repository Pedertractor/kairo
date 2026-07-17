import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR as dateFnsPtBR } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { ptBR as dayPickerPtBR } from 'react-day-picker/locale'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  id?: string
  date?: Date
  onDateChange: (date: Date | undefined) => void
  disabled?: boolean
  placeholder?: string
  displayFormat?: string
  className?: string
}

export function DatePicker({
  id,
  date,
  onDateChange,
  disabled = false,
  placeholder = 'Selecionar data',
  displayFormat = 'PPP',
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)

  function handleOpenChange(nextOpen: boolean) {
    const scrollY = window.scrollY
    setOpen(nextOpen)

    // Prevent focus management from jumping the page when the popover opens/closes.
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY })
    })
  }

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
              !date && 'text-muted-foreground',
              className,
            )}
          />
        }
      >
        <CalendarIcon />
        {date
          ? format(date, displayFormat, { locale: dateFnsPtBR })
          : placeholder}
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        initialFocus={false}
        finalFocus={false}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            onDateChange(selectedDate)
            setOpen(false)
          }}
          locale={dayPickerPtBR}
        />
      </PopoverContent>
    </Popover>
  )
}
