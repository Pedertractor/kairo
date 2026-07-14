import { useState, type FormEvent } from 'react'

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
  CreatePrintingMachineInput,
  PrintingMachine,
  PrintingMachineResponse,
} from '@/types/printing-machine'

interface CreatePrintingMachineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (machine: PrintingMachine) => void
}

export function CreatePrintingMachineDialog({
  open,
  onOpenChange,
  onCreated,
}: CreatePrintingMachineDialogProps) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function resetForm() {
    setName('')
    setBusy(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const payload: CreatePrintingMachineInput = {
        name: name.trim(),
        busy,
      }

      const data = await api<PrintingMachineResponse>('/printing-machines', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      resetForm()
      onOpenChange(false)
      onCreated(data.printingMachine)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetForm()
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Criar impressora</DialogTitle>
            <DialogDescription>
              Preencha os dados para cadastrar uma nova impressora 3D.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="printing-machine-name">Nome</FieldLabel>
              <Input
                id="printing-machine-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nome da impressora"
                required
                disabled={isSubmitting}
              />
            </Field>
            <Field orientation="horizontal">
              <input
                id="printing-machine-busy"
                type="checkbox"
                checked={busy}
                onChange={(event) => setBusy(event.target.checked)}
                disabled={isSubmitting}
                className="size-4 accent-primary"
              />
              <FieldLabel htmlFor="printing-machine-busy">Ocupada</FieldLabel>
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
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Criando...' : 'Criar impressora'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
