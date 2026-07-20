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
import type {
  ActivityResponse,
  ActivitySummary,
  UpdateActivityInput,
} from '@/types/card'

interface EditActivityTitleDialogProps {
  teamId: string
  activity: ActivitySummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (activity: ActivitySummary) => void
}

export function EditActivityTitleDialog({
  teamId,
  activity,
  open,
  onOpenChange,
  onUpdated,
}: EditActivityTitleDialogProps) {
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && activity) {
      setTitle(activity.title)
    }
  }, [open, activity])

  const hasChanges =
    activity !== null && title.trim() !== '' && title.trim() !== activity.title

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!activity || !hasChanges) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)

    try {
      const payload: UpdateActivityInput = { title: title.trim() }

      const data = await api<ActivityResponse>(
        `/teams/${teamId}/activities/${activity.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      )

      onOpenChange(false)
      onUpdated(data.activity)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar título</DialogTitle>
            <DialogDescription>
              Altere o título da atividade.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="edit-activity-title">Título</FieldLabel>
              <Input
                id="edit-activity-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Título da atividade"
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
              disabled={isSubmitting || !hasChanges}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
