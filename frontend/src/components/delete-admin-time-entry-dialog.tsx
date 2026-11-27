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
import { formatDateTime } from '@/lib/time-format'
import type { AdminTimeEntry } from '@/types/admin-time-entry'

interface DeleteAdminTimeEntryDialogProps {
  entry: AdminTimeEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: (timeEntryId: string) => void
}

export function DeleteAdminTimeEntryDialog({
  entry,
  open,
  onOpenChange,
  onDeleted,
}: DeleteAdminTimeEntryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleDelete() {
    if (!entry) return

    setIsSubmitting(true)
    try {
      await api(`/admin/time-entries/${entry.id}`, { method: 'DELETE' })
      onDeleted(entry.id)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir apontamento</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir o apontamento de{' '}
            <span className='font-medium text-foreground'>
              {entry?.userName}
            </span>{' '}
            em <span className='font-medium text-foreground'>{entry?.title}</span>
            {entry ? ` iniciado em ${formatDateTime(entry.startedAt)}` : ''}?
            A exclusão fica registrada no histórico, mas o apontamento não pode
            ser restaurado.
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
            disabled={isSubmitting || !entry}
          >
            {isSubmitting ? 'Excluindo...' : 'Excluir apontamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
