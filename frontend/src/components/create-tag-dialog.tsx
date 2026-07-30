import { useEffect, useState, type FormEvent } from 'react'

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
import { cn } from '@/lib/utils'
import { TAG_COLOR_SWATCHES } from '@/lib/tag-colors'
import type { CreateTagInput, TagResponse, TagSummary } from '@/types/tag'

interface CreateTagDialogProps {
  teamId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (tag: TagSummary) => void
}

export function CreateTagDialog({
  teamId,
  open,
  onOpenChange,
  onCreated,
}: CreateTagDialogProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(TAG_COLOR_SWATCHES[0])
  const [isSubmitting, setIsSubmitting] = useState(false)

  function resetForm() {
    setName('')
    setColor(TAG_COLOR_SWATCHES[0])
  }

  useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }

    setIsSubmitting(true)

    try {
      const payload: CreateTagInput = {
        name: trimmedName,
        color,
      }

      const data = await api<TagResponse>(`/teams/${teamId}/tags`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      onOpenChange(false)
      onCreated(data.tag)
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
            <DialogTitle>Nova tag</DialogTitle>
            <DialogDescription>
              Crie uma tag com nome e cor para organizar as atividades desta
              equipe.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="tag-name">Nome</FieldLabel>
              <Input
                id="tag-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nome da tag"
                required
                disabled={isSubmitting}
              />
            </Field>
            <Field>
              <FieldLabel>Cor</FieldLabel>
              <div className="flex flex-wrap gap-2" role="listbox" aria-label="Cor da tag">
                {TAG_COLOR_SWATCHES.map((swatch) => {
                  const isSelected = color === swatch

                  return (
                    <button
                      key={swatch}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      aria-label={`Cor ${swatch}`}
                      disabled={isSubmitting}
                      onClick={() => setColor(swatch)}
                      className={cn(
                        'size-8 rounded-full border-2 transition-shadow',
                        isSelected
                          ? 'border-foreground ring-2 ring-ring/40'
                          : 'border-transparent hover:ring-2 hover:ring-ring/20',
                      )}
                      style={{ backgroundColor: swatch }}
                    />
                  )
                })}
              </div>
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
              {isSubmitting ? 'Criando...' : 'Criar tag'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
