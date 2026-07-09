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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api-handler'
import type {
  PrintingMachine,
  PrintingMachineResponse,
  UpdatePrintingMachineInput,
} from '@/types/printing-machine'

interface EditPrintingMachineDialogProps {
  machine: PrintingMachine | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (machine: PrintingMachine) => void
}

export function EditPrintingMachineDialog({
  machine,
  open,
  onOpenChange,
  onUpdated,
}: EditPrintingMachineDialogProps) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (machine) {
      setName(machine.name)
      setBusy(machine.busy)
    }
  }, [machine])

  const hasChanges =
    machine !== null &&
    (name.trim() !== machine.name || busy !== machine.busy)

  async function handleConfirm() {
    if (!machine || !hasChanges) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)

    try {
      const payload: UpdatePrintingMachineInput = {
        name: name.trim(),
        busy,
      }

      const data = await api<PrintingMachineResponse>(
        `/printing-machines/${machine.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      )

      onOpenChange(false)
      onUpdated(data.printingMachine)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar impressora</DialogTitle>
          <DialogDescription>
            Atualize os dados da impressora{' '}
            <span className="font-medium text-foreground">{machine?.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="edit-printing-machine-name">Nome</FieldLabel>
            <Input
              id="edit-printing-machine-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </Field>
          <Field orientation="horizontal">
            <input
              id="edit-printing-machine-busy"
              type="checkbox"
              checked={busy}
              onChange={(event) => setBusy(event.target.checked)}
              disabled={isSubmitting}
              className="size-4 accent-primary"
            />
            <FieldLabel htmlFor="edit-printing-machine-busy">Ocupada</FieldLabel>
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
          <Button
            type="button"
            disabled={isSubmitting || !machine || !hasChanges || !name.trim()}
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
