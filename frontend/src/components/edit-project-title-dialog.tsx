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
  ProjectResponse,
  ProjectSummary,
  UpdateProjectInput,
} from '@/types/card'

interface EditProjectTitleDialogProps {
  teamId: string
  project: ProjectSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (project: ProjectSummary) => void
}

export function EditProjectTitleDialog({
  teamId,
  project,
  open,
  onOpenChange,
  onUpdated,
}: EditProjectTitleDialogProps) {
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && project) {
      setTitle(project.title)
    }
  }, [open, project])

  const hasChanges =
    project !== null && title.trim() !== '' && title.trim() !== project.title

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!project || !hasChanges) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)

    try {
      const payload: UpdateProjectInput = { title: title.trim() }

      const data = await api<ProjectResponse>(
        `/teams/${teamId}/projects/${project.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      )

      onOpenChange(false)
      onUpdated(data.project)
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
              Altere o título do projeto.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="edit-project-title">Título</FieldLabel>
              <Input
                id="edit-project-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Título do projeto"
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
