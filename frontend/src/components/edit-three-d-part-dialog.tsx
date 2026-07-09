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
  ThreeDPart,
  ThreeDPartResponse,
  UpdateThreeDPartInput,
} from '@/types/three-d-part'

interface EditThreeDPartDialogProps {
  part: ThreeDPart | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (part: ThreeDPart) => void
}

export function EditThreeDPartDialog({
  part,
  open,
  onOpenChange,
  onUpdated,
}: EditThreeDPartDialogProps) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [timeToPrint, setTimeToPrint] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (part) {
      setName(part.name)
      setCode(part.code)
      setTimeToPrint(String(part.timeToPrint))
    }
  }, [part])

  const parsedTimeToPrint = Number.parseInt(timeToPrint, 10)
  const isTimeValid =
    timeToPrint.trim() !== '' &&
    Number.isInteger(parsedTimeToPrint) &&
    parsedTimeToPrint > 0

  const hasChanges =
    part !== null &&
    (name.trim() !== part.name ||
      code.trim() !== part.code ||
      parsedTimeToPrint !== part.timeToPrint)

  async function handleConfirm() {
    if (!part || !hasChanges || !isTimeValid) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)

    try {
      const payload: UpdateThreeDPartInput = {
        name: name.trim(),
        code: code.trim(),
        timeToPrint: parsedTimeToPrint,
      }

      const data = await api<ThreeDPartResponse>(`/three-d-parts/${part.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })

      onOpenChange(false)
      onUpdated(data.threeDPart)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar peça 3D</DialogTitle>
          <DialogDescription>
            Atualize os dados da peça{' '}
            <span className="font-medium text-foreground">{part?.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="edit-three-d-part-name">Nome</FieldLabel>
            <Input
              id="edit-three-d-part-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-three-d-part-code">Código</FieldLabel>
            <Input
              id="edit-three-d-part-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-three-d-part-time">
              Tempo de impressão (min)
            </FieldLabel>
            <Input
              id="edit-three-d-part-time"
              type="number"
              min={1}
              step={1}
              value={timeToPrint}
              onChange={(event) => setTimeToPrint(event.target.value)}
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
            type="button"
            disabled={
              isSubmitting ||
              !part ||
              !hasChanges ||
              !name.trim() ||
              !code.trim() ||
              !isTimeValid
            }
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
