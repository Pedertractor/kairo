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
import type { ThreeDPart } from '@/types/three-d-part'

interface DeleteThreeDPartDialogProps {
  part: ThreeDPart | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: (partId: string) => void
}

export function DeleteThreeDPartDialog({
  part,
  open,
  onOpenChange,
  onDeleted,
}: DeleteThreeDPartDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    if (!part) {
      return
    }

    setIsSubmitting(true)

    try {
      await api<null>(`/three-d-parts/${part.id}`, {
        method: 'DELETE',
      })

      onOpenChange(false)
      onDeleted(part.id)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover peça 3D</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover a peça{' '}
            <span className="font-medium text-foreground">{part?.name}</span>?
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="cancel"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isSubmitting || !part}
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? 'Removendo...' : 'Remover peça'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
