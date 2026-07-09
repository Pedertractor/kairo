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
import type { PrintingMachine } from '@/types/printing-machine'

interface DeletePrintingMachineDialogProps {
  machine: PrintingMachine | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: (machineId: string) => void
}

export function DeletePrintingMachineDialog({
  machine,
  open,
  onOpenChange,
  onDeleted,
}: DeletePrintingMachineDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    if (!machine) {
      return
    }

    setIsSubmitting(true)

    try {
      await api<null>(`/printing-machines/${machine.id}`, {
        method: 'DELETE',
      })

      onOpenChange(false)
      onDeleted(machine.id)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover impressora</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover a impressora{' '}
            <span className="font-medium text-foreground">{machine?.name}</span>?
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
            disabled={isSubmitting || !machine}
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? 'Removendo...' : 'Remover impressora'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
