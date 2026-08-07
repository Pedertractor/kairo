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
import type { TaskDetailResponse, TaskSummary } from '@/types/task'

interface FinishTaskDialogProps {
  projectId: string
  task: TaskSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onFinished: () => void
}

export function FinishTaskDialog({
  projectId,
  task,
  open,
  onOpenChange,
  onFinished,
}: FinishTaskDialogProps) {
  const { refresh: refreshTimer } = useActiveTimer()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    if (!task) {
      return
    }

    setIsSubmitting(true)

    try {
      await api<TaskDetailResponse>(
        `/projects/${projectId}/tasks/${task.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'DONE' }),
        },
      )
      await refreshTimer()
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
          <DialogTitle>Finalizar tarefa</DialogTitle>
          <DialogDescription>
            {task ? (
              <>
                Tem certeza que deseja finalizar a tarefa{' '}
                <span className="font-medium text-foreground">
                  {task.title}
                </span>
                ? Ela deixará de aparecer nas listas por padrão. Apontamentos
                ativos serão encerrados.
              </>
            ) : (
              'Tem certeza que deseja finalizar esta tarefa?'
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
            disabled={isSubmitting || !task}
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? 'Finalizando...' : 'Finalizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
