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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api-handler'
import { CARD_STATUSES, STATUS_LABELS } from '@/lib/card-status'
import type { ActivityResponse, ActivitySummary, CardStatus } from '@/types/card'

interface UpdateActivityStatusDialogProps {
  teamId: string
  activity: ActivitySummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

export function UpdateActivityStatusDialog({
  teamId,
  activity,
  open,
  onOpenChange,
  onUpdated,
}: UpdateActivityStatusDialogProps) {
  const [status, setStatus] = useState<CardStatus | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && activity) {
      setStatus(activity.status)
    }
  }, [open, activity])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!activity || !status || status === activity.status) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)

    try {
      await api<ActivityResponse>(
        `/teams/${teamId}/activities/${activity.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        },
      )

      onOpenChange(false)
      onUpdated()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Alterar status</DialogTitle>
            <DialogDescription>
              {activity
                ? `Selecione o novo status para "${activity.title}".`
                : 'Selecione o novo status da atividade.'}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="activity-status">Status</FieldLabel>
              <Select
                value={status ?? undefined}
                onValueChange={(value) => setStatus(value as CardStatus)}
                disabled={isSubmitting || !activity}
              >
                <SelectTrigger id="activity-status" className="w-full">
                  <SelectValue placeholder="Selecione um status">
                    {(selectedValue) =>
                      STATUS_LABELS[selectedValue as CardStatus]
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CARD_STATUSES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {STATUS_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button type="submit" disabled={isSubmitting || !status}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
