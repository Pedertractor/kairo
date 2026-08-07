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
import type { ActivityResponse, ActivitySummary } from '@/types/card'

interface FinishActivityDialogProps {
  teamId: string
  activity: ActivitySummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onFinished: () => void
}

export function FinishActivityDialog({
  teamId,
  activity,
  open,
  onOpenChange,
  onFinished,
}: FinishActivityDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    if (!activity) {
      return
    }

    setIsSubmitting(true)

    try {
      await api<ActivityResponse>(
        `/teams/${teamId}/activities/${activity.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'DONE' }),
        },
      )
      onOpenChange(false)
      onFinished()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finalizar atividade</DialogTitle>
          <DialogDescription>
            {activity ? (
              <>
                Tem certeza que deseja finalizar a atividade{' '}
                <span className="font-medium text-foreground">
                  {activity.title}
                </span>
                ? Ela deixará de aparecer nas listas por padrão.
              </>
            ) : (
              'Tem certeza que deseja finalizar esta atividade?'
            )}
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
            disabled={isSubmitting || !activity}
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? 'Finalizando...' : 'Finalizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
