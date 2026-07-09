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
  CreateThreeDPartInput,
  ThreeDPart,
  ThreeDPartResponse,
} from '@/types/three-d-part'

interface CreateThreeDPartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (part: ThreeDPart) => void
}

export function CreateThreeDPartDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateThreeDPartDialogProps) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [timeToPrint, setTimeToPrint] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function resetForm() {
    setName('')
    setCode('')
    setTimeToPrint('')
  }

  const parsedTimeToPrint = Number.parseInt(timeToPrint, 10)
  const isTimeValid =
    timeToPrint.trim() !== '' &&
    Number.isInteger(parsedTimeToPrint) &&
    parsedTimeToPrint > 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isTimeValid) {
      return
    }

    setIsSubmitting(true)

    try {
      const payload: CreateThreeDPartInput = {
        name: name.trim(),
        code: code.trim(),
        timeToPrint: parsedTimeToPrint,
      }

      const data = await api<ThreeDPartResponse>('/three-d-parts', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      resetForm()
      onOpenChange(false)
      onCreated(data.threeDPart)
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
            <DialogTitle>Criar peça 3D</DialogTitle>
            <DialogDescription>
              Preencha os dados para cadastrar uma nova peça 3D.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="three-d-part-name">Nome</FieldLabel>
              <Input
                id="three-d-part-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nome da peça"
                required
                disabled={isSubmitting}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="three-d-part-code">Código</FieldLabel>
              <Input
                id="three-d-part-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Código da peça"
                required
                disabled={isSubmitting}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="three-d-part-time">
                Tempo de impressão (min)
              </FieldLabel>
              <Input
                id="three-d-part-time"
                type="number"
                min={1}
                step={1}
                value={timeToPrint}
                onChange={(event) => setTimeToPrint(event.target.value)}
                placeholder="Ex.: 120"
                required
                disabled={isSubmitting}
              />
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
              type="submit"
              disabled={
                isSubmitting || !name.trim() || !code.trim() || !isTimeValid
              }
            >
              {isSubmitting ? 'Criando...' : 'Criar peça'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
