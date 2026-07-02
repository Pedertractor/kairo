import { useMemo } from 'react'

import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  clampDayForMonth,
  dateTimePartsToIso,
  getDayOptions,
  getHourOptions,
  getMinuteOptions,
  getYearOptions,
  isoToDateTimeParts,
  isDateTimePartsComplete,
  MONTH_OPTIONS,
  type DateTimeParts,
} from '@/lib/datetime-parts'

type EndMode = 'active' | 'set'

interface DateTimeSelectFieldProps {
  id: string
  label: string
  value: string | null
  onChange: (value: string | null) => void
  optional?: boolean
  description?: string
  disabled?: boolean
}

function DateTimeSelects({
  id,
  parts,
  onChange,
  disabled,
}: {
  id: string
  parts: DateTimeParts
  onChange: (parts: DateTimeParts) => void
  disabled?: boolean
}) {
  const dayOptions = useMemo(
    () => getDayOptions(parts.year, parts.month),
    [parts.year, parts.month],
  )
  const yearOptions = useMemo(
    () => getYearOptions(parts.year),
    [parts.year],
  )
  const hourOptions = useMemo(() => getHourOptions(), [])
  const minuteOptions = useMemo(() => getMinuteOptions(), [])

  function updatePart(key: keyof DateTimeParts, nextValue: string) {
    const nextParts = clampDayForMonth({ ...parts, [key]: nextValue })
    onChange(nextParts)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        <Select
          value={parts.day}
          onValueChange={(nextValue) => updatePart('day', nextValue)}
          disabled={disabled}
        >
          <SelectTrigger id={`${id}-day`} className="w-full">
            <SelectValue placeholder="Dia" />
          </SelectTrigger>
          <SelectContent>
            {dayOptions.map((day) => (
              <SelectItem key={day} value={day}>
                {day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={parts.month}
          onValueChange={(nextValue) => updatePart('month', nextValue)}
          disabled={disabled}
        >
          <SelectTrigger id={`${id}-month`} className="w-full">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            {MONTH_OPTIONS.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={parts.year}
          onValueChange={(nextValue) => updatePart('year', nextValue)}
          disabled={disabled}
        >
          <SelectTrigger id={`${id}-year`} className="w-full">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select
          value={parts.hour}
          onValueChange={(nextValue) => updatePart('hour', nextValue)}
          disabled={disabled}
        >
          <SelectTrigger id={`${id}-hour`} className="w-full">
            <SelectValue placeholder="Hora" />
          </SelectTrigger>
          <SelectContent>
            {hourOptions.map((hour) => (
              <SelectItem key={hour} value={hour}>
                {hour}h
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={parts.minute}
          onValueChange={(nextValue) => updatePart('minute', nextValue)}
          disabled={disabled}
        >
          <SelectTrigger id={`${id}-minute`} className="w-full">
            <SelectValue placeholder="Min" />
          </SelectTrigger>
          <SelectContent>
            {minuteOptions.map((minute) => (
              <SelectItem key={minute} value={minute}>
                {minute}min
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export function DateTimeSelectField({
  id,
  label,
  value,
  onChange,
  optional = false,
  description,
  disabled = false,
}: DateTimeSelectFieldProps) {
  const parts = value ? isoToDateTimeParts(value) : isoToDateTimeParts(new Date().toISOString())
  const endMode: EndMode = optional && !value ? 'active' : 'set'

  function handlePartsChange(nextParts: DateTimeParts) {
    if (!isDateTimePartsComplete(nextParts)) {
      return
    }

    onChange(dateTimePartsToIso(nextParts))
  }

  function handleEndModeChange(nextMode: EndMode) {
    if (nextMode === 'active') {
      onChange(null)
      return
    }

    onChange(dateTimePartsToIso(parts))
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
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Em andamento</SelectItem>
            <SelectItem value="set">Definir data e hora</SelectItem>
          </SelectContent>
        </Select>
      ) : null}

      {(!optional || endMode === 'set') && (
        <DateTimeSelects
          id={id}
          parts={parts}
          onChange={handlePartsChange}
          disabled={disabled}
        />
      )}

      {description ? (
        <FieldDescription>{description}</FieldDescription>
      ) : null}
    </Field>
  )
}
