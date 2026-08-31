import { useEffect, useRef, useState } from 'react'
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

function isCompleteRange(
  nextRange: DateRange | undefined,
): nextRange is DateRange & { from: Date; to: Date } {
  return Boolean(nextRange?.from && nextRange.to)
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
  const [draft, setDraft] = useState<DateRange | undefined>(range)
  const draftRef = useRef(draft)
  draftRef.current = draft

  useEffect(() => {
    if (!open) {
      setDraft(range)
    }
  }, [open, range])

  function restoreScroll(scrollY: number) {
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY })
    })
  }

  function handleOpenChange(
    nextOpen: boolean,
    eventDetails: { reason: string; cancel: () => void },
  ) {
    // Day buttons remount/refocus while picking a range; don't dismiss on that focus shift.
    if (!nextOpen && eventDetails.reason === 'focus-out') {
      eventDetails.cancel()
      return
    }

    const scrollY = window.scrollY

    if (nextOpen) {
      setDraft(range)
    } else {
      const pending = draftRef.current
      if (pending?.from && !pending.to) {
        onRangeChange({ from: pending.from, to: pending.from })
      }
    }

    setOpen(nextOpen)
    restoreScroll(scrollY)
  }

  const displayed = open ? draft : range
  const label =
    displayed?.from && displayed.to
      ? `${format(displayed.from, displayFormat, { locale: dateFnsPtBR })} – ${format(displayed.to, displayFormat, { locale: dateFnsPtBR })}`
      : displayed?.from
        ? format(displayed.from, displayFormat, { locale: dateFnsPtBR })
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
              !displayed?.from && 'text-muted-foreground',
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
          selected={displayed}
          defaultMonth={displayed?.from}
          resetOnSelect
          onSelect={(nextRange) => {
            draftRef.current = nextRange
            setDraft(nextRange)
            if (!isCompleteRange(nextRange)) return
            onRangeChange(nextRange)
          }}
          numberOfMonths={numberOfMonths}
          locale={dayPickerPtBR}
        />
      </PopoverContent>
    </Popover>
  )
}
