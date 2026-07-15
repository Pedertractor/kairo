import { useState, type FormEvent } from 'react'

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
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api-handler'
import type { CreateTaskInput, TaskResponse } from '@/types/task'

interface CreateTaskDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function CreateTaskDialog({
  projectId,
  open,
  onOpenChange,
  onCreated,
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [indefiniteTime, setIndefiniteTime] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function resetForm() {
    setTitle('')
    setDescription('')
    setEstimatedHours('')
    setIndefiniteTime(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const payload: CreateTaskInput = { title: title.trim() }
      const trimmedDescription = description.trim()
      const parsedHours =
        !indefiniteTime && estimatedHours.trim()
          ? Number.parseFloat(estimatedHours)
          : undefined

      if (trimmedDescription) {
        payload.description = trimmedDescription
      }

      if (parsedHours !== undefined && !Number.isNaN(parsedHours)) {
        payload.estimatedHours = parsedHours
      }

      await api<TaskResponse>(`/projects/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      resetForm()
      onOpenChange(false)
      onCreated()
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
            <DialogTitle>Criar nova tarefa</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar uma tarefa neste projeto.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="task-title">Título</FieldLabel>
              <Input
                id="task-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Título da tarefa"
                required
                disabled={isSubmitting}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="task-description">Descrição</FieldLabel>
              <Textarea
                id="task-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descrição opcional"
                disabled={isSubmitting}
                rows={3}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="task-estimated-hours">
                Horas estimadas
              </FieldLabel>
              <Input
                id="task-estimated-hours"
                type="number"
                min="0"
                step="0.25"
                value={estimatedHours}
                onChange={(event) => setEstimatedHours(event.target.value)}
                placeholder="Ex.: 4"
                disabled={isSubmitting || indefiniteTime}
              />
            </Field>
            <Field orientation="horizontal">
              <input
                id="task-indefinite-time"
                type="checkbox"
                checked={indefiniteTime}
                onChange={(event) => {
                  const checked = event.target.checked
                  setIndefiniteTime(checked)
                  if (checked) {
                    setEstimatedHours('')
                  }
                }}
                disabled={isSubmitting}
                className="size-4 accent-primary"
              />
              <FieldLabel htmlFor="task-indefinite-time">
                Tempo indefinido
              </FieldLabel>
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
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? 'Criando...' : 'Criar tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
