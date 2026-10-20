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

interface DeleteAbsenceDialogProps {
  absence: AbsenceListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: (data: AbsenceListResponse) => void
}

export function DeleteAbsenceDialog({
  absence,
  open,
  onOpenChange,
  onDeleted,
}: DeleteAbsenceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleDelete() {
    if (!absence) return

    setIsSubmitting(true)
    try {
      const data = await api<AbsenceListResponse>(
        `/absences/admin/${absence.id}`,
        { method: 'DELETE' },
      )
      onDeleted(data)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir ausência</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir a ausência de{' '}
            <span className='font-medium text-foreground'>
              {absence?.userName}
            </span>
            ? Períodos passados também serão removidos e o cálculo de ocupação
            será atualizado.
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
            onClick={() => void handleDelete()}
            disabled={isSubmitting || !absence}
          >
            {isSubmitting ? 'Excluindo...' : 'Excluir ausência'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
