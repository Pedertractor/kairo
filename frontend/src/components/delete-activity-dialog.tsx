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
import { useActiveTimer } from '@/hooks/use-active-timer'
import { api } from '@/lib/api-handler'
import type { ActivityResponse, ActivitySummary } from '@/types/card'

interface DeleteActivityDialogProps {
  teamId: string
  activity: ActivitySummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

export function DeleteActivityDialog({
  teamId,
  activity,
  open,
  onOpenChange,
  onDeleted,
}: DeleteActivityDialogProps) {
  const { refresh: refreshTimer } = useActiveTimer()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    if (!activity) {
      return
    }

    setIsSubmitting(true)

    try {
      await api<ActivityResponse>(
        `/teams/${teamId}/activities/${activity.id}`,
        { method: 'DELETE' },
      )
      await refreshTimer()
      onOpenChange(false)
      onDeleted()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir atividade</DialogTitle>
          <DialogDescription>
            {activity ? (
              <>
                Tem certeza que deseja excluir a atividade{' '}
                <span className="font-medium text-foreground">
                  {activity.title}
                </span>
                ? Ela deixará de aparecer nas listas. Apontamentos ativos serão
                encerrados.
              </>
            ) : (
              'Tem certeza que deseja excluir esta atividade?'
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
            variant="destructive"
            disabled={isSubmitting || !activity}
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
