import { useEffect, useState } from 'react'
import { Clock2 } from 'lucide-react'

import { DatePicker } from '@/components/date-picker'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { mergeDateTimeValue, splitDateTimeValue } from '@/lib/datetime-value'

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
  const [{ date, time }, setDateTime] = useState(() => splitDateTimeValue(value))
  const endMode: EndMode = optional && !value ? 'active' : 'set'

  useEffect(() => {
    setDateTime(splitDateTimeValue(value))
  }, [value])

  function emitChange(nextDate: Date | undefined, nextTime: string) {
    onChange(mergeDateTimeValue(nextDate, nextTime))
  }

  function handleDateChange(selectedDate: Date | undefined) {
    const next = { date: selectedDate, time }
    setDateTime(next)
    emitChange(next.date, next.time)
  }

  function handleTimeChange(nextTime: string) {
    const fallbackDate = date ?? new Date()
    const next = { date: fallbackDate, time: nextTime }
    setDateTime(next)

    // Native `type="time"` clears to "" on Backspace. Emitting null here would
    // flip optional fields to "Em andamento", unmount this input, and the dialog
    // focus manager treats that focus loss as a dismiss.
    if (!nextTime) {
      return
    }

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
          <Field>
            <FieldLabel htmlFor={`${id}-date`}>Data</FieldLabel>
            <DatePicker
              id={`${id}-date`}
              date={date}
              onDateChange={handleDateChange}
              disabled={disabled}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={`${id}-time`}>Hora</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id={`${id}-time`}
                type="time"
                value={time}
                disabled={disabled}
                className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                onChange={(event) => handleTimeChange(event.target.value)}
                onBlur={() => {
                  if (!time) {
                    setDateTime(splitDateTimeValue(value))
                  }
                }}
              />
              <InputGroupAddon align="inline-end">
                <Clock2 className="text-muted-foreground" />
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </div>
      )}

      {description ? (
        <FieldDescription>{description}</FieldDescription>
      ) : null}
    </Field>
  )
}
