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
import type { DocumentSummary } from '@/types/document'

interface DeleteDocumentDialogProps {
  teamId: string
  document: DocumentSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

export function DeleteDocumentDialog({
  teamId,
  document,
  open,
  onOpenChange,
  onDeleted,
}: DeleteDocumentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    if (!document) {
      return
    }

    setIsSubmitting(true)

    try {
      await api(`/teams/${teamId}/documents/${document.id}`, {
        method: 'DELETE',
      })
      onOpenChange(false)
      onDeleted()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir documento</DialogTitle>
          <DialogDescription>
            {document ? (
              <>
                Tem certeza que deseja excluir{' '}
                <span className='font-medium text-foreground'>
                  {document.originalName}
                </span>
                ? Esta ação não pode ser desfeita.
              </>
            ) : (
              'Tem certeza que deseja excluir este documento?'
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type='button'
            variant='cancel'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type='button'
            variant='destructive'
            disabled={isSubmitting || !document}
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
