import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

interface EditEstimatedHoursDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  estimatedHours: string | null
  onSave: (estimatedHours: number | null) => Promise<void>
}

function toHoursInput(estimatedHours: string | null) {
  if (!estimatedHours) {
    return ''
  }

  const parsed = Number.parseFloat(estimatedHours)

  return Number.isFinite(parsed) ? String(parsed) : ''
}

function toHoursValue(input: string) {
  const parsed = Number.parseFloat(input)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function EditEstimatedHoursDialog({
  open,
  onOpenChange,
  estimatedHours,
  onSave,
}: EditEstimatedHoursDialogProps) {
  const [hoursInput, setHoursInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setHoursInput(toHoursInput(estimatedHours))
    }
  }, [open, estimatedHours])

  const nextHours = toHoursValue(hoursInput)
  const currentHours = toHoursValue(estimatedHours ?? '')
  const hasChanges = nextHours !== currentHours

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!hasChanges) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)

    try {
      await onSave(nextHours)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar horas estimadas</DialogTitle>
            <DialogDescription>
              Defina o tempo estimado ou deixe em branco para tempo indefinido.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="edit-estimated-hours">
                Horas estimadas
              </FieldLabel>
              <Input
                id="edit-estimated-hours"
                type="number"
                min="0"
                step="0.25"
                value={hoursInput}
                onChange={(event) => setHoursInput(event.target.value)}
                placeholder="Ex.: 4"
                disabled={isSubmitting}
              />
              <FieldDescription>
                Deixe em branco para tempo indefinido.
              </FieldDescription>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="cancel"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !hasChanges}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
