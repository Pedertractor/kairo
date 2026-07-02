import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR as dateFnsPtBR } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { ptBR as dayPickerPtBR } from 'react-day-picker/locale'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { mergeDateTimeValue, splitDateTimeValue } from '@/lib/datetime-value'
import { cn } from '@/lib/utils'

type EndMode = 'active' | 'set'

const END_MODE_LABELS: Record<EndMode, string> = {
  active: 'Em andamento',
  set: 'Definir data e hora',
}

interface DateTimePickerFieldProps {
  id: string
  label: string
  value: string | null
  onChange: (value: string | null) => void
  optional?: boolean
  description?: string
  disabled?: boolean
}

export function DateTimePickerField({
  id,
  label,
  value,
  onChange,
  optional = false,
  description,
  disabled = false,
}: DateTimePickerFieldProps) {
  const [dateOpen, setDateOpen] = useState(false)
  const [{ date, time }, setDateTime] = useState(() => splitDateTimeValue(value))
  const endMode: EndMode = optional && !value ? 'active' : 'set'

  useEffect(() => {
    setDateTime(splitDateTimeValue(value))
  }, [value])

  function emitChange(nextDate: Date | undefined, nextTime: string) {
    onChange(mergeDateTimeValue(nextDate, nextTime))
  }

  function handleDateSelect(selectedDate: Date | undefined) {
    const next = { date: selectedDate, time }
    setDateTime(next)
    emitChange(next.date, next.time)
    setDateOpen(false)
  }

  function handleTimeChange(nextTime: string) {
    const fallbackDate = date ?? new Date()
    const next = { date: fallbackDate, time: nextTime }
    setDateTime(next)
    emitChange(next.date, next.time)
  }

  function handleEndModeChange(nextMode: EndMode) {
    if (nextMode === 'active') {
      onChange(null)
      return
    }

    const next = splitDateTimeValue(value ?? new Date().toISOString())
    setDateTime(next)
    onChange(mergeDateTimeValue(next.date, next.time))
  }

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>

      {optional ? (
        <Select
          value={endMode}
          onValueChange={(nextValue) =>
            handleEndModeChange(nextValue as EndMode)
          }
          disabled={disabled}
        >
          <SelectTrigger id={`${id}-mode`} className="w-full">
            <SelectValue>
              {(selectedValue) =>
                END_MODE_LABELS[selectedValue as EndMode] ?? 'Selecionar'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Em andamento</SelectItem>
            <SelectItem value="set">Definir data e hora</SelectItem>
          </SelectContent>
        </Select>
      ) : null}

      {(!optional || endMode === 'set') && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-date`}>Data</Label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger
                disabled={disabled}
                render={
                  <Button
                    id={`${id}-date`}
                    type="button"
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground',
                    )}
                  />
                }
              >
                <CalendarIcon />
                {date
                  ? format(date, 'PPP', { locale: dateFnsPtBR })
                  : 'Selecionar data'}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateSelect}
                  locale={dayPickerPtBR}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-time`}>Hora</Label>
            <Input
              id={`${id}-time`}
              type="time"
              value={time}
              disabled={disabled}
              onChange={(event) => handleTimeChange(event.target.value)}
            />
          </div>
        </div>
      )}

      {description ? (
        <FieldDescription>{description}</FieldDescription>
      ) : null}
    </Field>
  )
}
