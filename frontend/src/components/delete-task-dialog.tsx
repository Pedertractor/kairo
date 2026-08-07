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

interface DeleteTaskDialogProps {
  projectId: string
  task: TaskSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

export function DeleteTaskDialog({
  projectId,
  task,
  open,
  onOpenChange,
  onDeleted,
}: DeleteTaskDialogProps) {
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
          <DialogTitle>Excluir tarefa</DialogTitle>
          <DialogDescription>
            {task ? (
              <>
                Tem certeza que deseja excluir a tarefa{' '}
                <span className="font-medium text-foreground">
                  {task.title}
                </span>
                ? Ela deixará de aparecer nas listas. Apontamentos ativos serão
                encerrados.
              </>
            ) : (
              'Tem certeza que deseja excluir esta tarefa?'
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
            disabled={isSubmitting || !task}
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
