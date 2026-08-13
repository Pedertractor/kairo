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
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api-handler'
import type {
  ProjectResponse,
  ProjectSummary,
  UpdateProjectInput,
} from '@/types/card'

interface EditProjectDialogProps {
  teamId: string
  project: ProjectSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (project: ProjectSummary) => void
}

export function EditProjectDialog({
  teamId,
  project,
  open,
  onOpenChange,
  onUpdated,
}: EditProjectDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && project) {
      setTitle(project.title)
      setDescription(project.description ?? '')
    }
  }, [open, project])

  function buildPayload(current: ProjectSummary): UpdateProjectInput {
    const payload: UpdateProjectInput = {}

    const nextTitle = title.trim()
    if (nextTitle && nextTitle !== current.title) {
      payload.title = nextTitle
    }

    const nextDescription = description.trim() || null
    if (nextDescription !== (current.description ?? null)) {
      payload.description = nextDescription
    }

    return payload
  }

  const hasChanges =
    project !== null &&
    title.trim() !== '' &&
    Object.keys(buildPayload(project)).length > 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!project || !hasChanges) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)

    try {
      const data = await api<ProjectResponse>(
        `/teams/${teamId}/projects/${project.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(buildPayload(project)),
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
            <DialogTitle>Editar projeto</DialogTitle>
            <DialogDescription>
              Altere o nome e a descrição do projeto.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="edit-project-title">Nome</FieldLabel>
              <Input
                id="edit-project-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Título do projeto"
                required
                disabled={isSubmitting}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-project-description">
                Descrição
              </FieldLabel>
              <Textarea
                id="edit-project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descrição opcional"
                rows={3}
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
            <Button type="submit" disabled={isSubmitting || !hasChanges}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
