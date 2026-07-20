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
  TaskDetail,
  TaskDetailResponse,
  UpdateTaskInput,
} from '@/types/task'

interface EditTaskTitleDialogProps {
  projectId: string
  task: TaskDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (task: TaskDetail) => void
}

export function EditTaskTitleDialog({
  projectId,
  task,
  open,
  onOpenChange,
  onUpdated,
}: EditTaskTitleDialogProps) {
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && task) {
      setTitle(task.title)
    }
  }, [open, task])

  const hasChanges =
    task !== null && title.trim() !== '' && title.trim() !== task.title

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!task || !hasChanges) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)

    try {
      const payload: UpdateTaskInput = { title: title.trim() }

      const data = await api<TaskDetailResponse>(
        `/projects/${projectId}/tasks/${task.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      )

      onOpenChange(false)
      onUpdated(data.task)
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
            <DialogDescription>Altere o título da tarefa.</DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="edit-task-title">Título</FieldLabel>
              <Input
                id="edit-task-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Título da tarefa"
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
