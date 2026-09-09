import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api } from '@/lib/api-handler'
import type { AbsenceListItem, AbsenceListResponse } from '@/types/absence'

interface CancelAbsenceDialogProps {
  absence: AbsenceListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCancelled: (data: AbsenceListResponse) => void
}

export function CancelAbsenceDialog({
  absence,
  open,
  onOpenChange,
  onCancelled,
}: CancelAbsenceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleCancel() {
    if (!absence) return

    setIsSubmitting(true)
    try {
      const data = await api<AbsenceListResponse>(
        `/absences/${absence.id}`,
        { method: 'DELETE' },
      )
      onCancelled(data)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar ausência futura</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja cancelar a ausência agendada de{' '}
            <span className='font-medium text-foreground'>
              {absence?.userName}
            </span>
            ? Registros passados permanecem no histórico.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type='button'
            variant='cancel'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Voltar
          </Button>
          <Button
            type='button'
            variant='destructive'
            onClick={() => void handleCancel()}
            disabled={isSubmitting || !absence}
          >
            {isSubmitting ? 'Cancelando...' : 'Cancelar ausência'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
