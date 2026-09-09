import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api-handler'
import type { User } from '@/types/auth'
import type { TeamSummary } from '@/types/team'
import type { UpdateUserShiftInput, UserResponse } from '@/types/user'

interface EditShiftTarget {
  id: string
  name: string
  shiftStart: string | null
  shiftEnd: string | null
}

interface EditShiftDialogProps {
  target: EditShiftTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'user' | 'team'
  teamId?: string
  onUserUpdated?: (user: User) => void
  onTeamUpdated?: (team: TeamSummary) => void
}

function normalizeTimeInput(value: string | null | undefined): string {
  if (!value) {
    return ''
  }

  const [hours, minutes] = value.split(':')
  return `${hours.padStart(2, '0')}:${(minutes ?? '00').padStart(2, '0')}`
}

export function EditShiftDialog({
  target,
  open,
  onOpenChange,
  mode,
  teamId,
  onUserUpdated,
  onTeamUpdated,
}: EditShiftDialogProps) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (target && open) {
      setStart(normalizeTimeInput(target.shiftStart))
      setEnd(normalizeTimeInput(target.shiftEnd))
    }
  }, [target, open])

  const isValid =
    start !== '' &&
    end !== '' &&
    start < end

  const hasChanges =
    target !== null &&
    (normalizeTimeInput(target.shiftStart) !== start ||
      normalizeTimeInput(target.shiftEnd) !== end)

  async function handleConfirm() {
    if (!target || !isValid) {
      return
    }

    if (!hasChanges) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)

    try {
      const payload: UpdateUserShiftInput = { start, end }

      if (mode === 'team') {
        if (!teamId) {
          return
        }

        const data = await api<{ team: TeamSummary }>(
          `/teams/${teamId}/members/${target.id}/shift`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          },
        )

        onTeamUpdated?.(data.team)
      } else {
        const data = await api<UserResponse>(`/users/${target.id}/shift`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })

        onUserUpdated?.(data.user)
      }

      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar turno</DialogTitle>
          <DialogDescription>
            Defina o horário de entrada e saída de{' '}
            <span className="font-medium text-foreground">
              {target?.name ?? 'membro'}
            </span>
            . O intervalo de almoço não é considerado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="shift-start">Entrada</FieldLabel>
            <Input
              id="shift-start"
              type="time"
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="shift-end">Saída</FieldLabel>
            <Input
              id="shift-end"
              type="time"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? 'Salvando...' : 'Salvar turno'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
