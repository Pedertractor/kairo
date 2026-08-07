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
import { useActiveTimer } from '@/hooks/use-active-timer'
import { api } from '@/lib/api-handler'
import { TASK_STATUSES, TASK_STATUS_LABELS } from '@/lib/task-status'
import type { TaskDetailResponse, TaskStatus, TaskSummary } from '@/types/task'

interface UpdateTaskStatusDialogProps {
  projectId: string
  task: TaskSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

export function UpdateTaskStatusDialog({
  projectId,
  task,
  open,
  onOpenChange,
  onUpdated,
}: UpdateTaskStatusDialogProps) {
  const { refresh: refreshTimer } = useActiveTimer()
  const [status, setStatus] = useState<TaskStatus | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && task) {
      setStatus(task.status)
    }
  }, [open, task])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!task || !status || status === task.status) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)

    try {
      await api<TaskDetailResponse>(
        `/projects/${projectId}/tasks/${task.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        },
      )

      await refreshTimer()
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
              {task
                ? `Selecione o novo status para "${task.title}".`
                : 'Selecione o novo status da tarefa.'}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="task-status">Status</FieldLabel>
              <Select
                value={status ?? undefined}
                onValueChange={(value) => setStatus(value as TaskStatus)}
                disabled={isSubmitting || !task}
              >
                <SelectTrigger id="task-status" className="w-full">
                  <SelectValue placeholder="Selecione um status">
                    {(selectedValue) =>
                      TASK_STATUS_LABELS[selectedValue as TaskStatus]
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {TASK_STATUS_LABELS[option]}
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
