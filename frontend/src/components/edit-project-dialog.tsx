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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCanEditEstimatedHours } from '@/hooks/use-can-edit-estimated-hours'
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

function toHoursInput(estimatedHours: string | null) {
  if (!estimatedHours) {
    return ''
  }

  const parsed = Number.parseFloat(estimatedHours)

  return Number.isFinite(parsed) ? String(parsed) : ''
}

function toHoursValue(input: string) {
  const parsed = Number.parseFloat(input)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function EditProjectDialog({
  teamId,
  project,
  open,
  onOpenChange,
  onUpdated,
}: EditProjectDialogProps) {
  const canEditEstimatedHours = useCanEditEstimatedHours(
    teamId,
    project?.createdById,
    open && project !== null,
  )
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !project) {
      return
    }

    setTitle(project.title)
    setDescription(project.description ?? '')
    setEstimatedHours(toHoursInput(project.estimatedHours))
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

    if (canEditEstimatedHours) {
      const nextHours = toHoursValue(estimatedHours)
      if (nextHours !== toHoursValue(current.estimatedHours ?? '')) {
        payload.estimatedHours = nextHours
      }
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
              {canEditEstimatedHours
                ? 'Altere o nome, a descrição e as horas estimadas do projeto.'
                : 'Altere o nome e a descrição do projeto.'}
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

            {canEditEstimatedHours ? (
              <Field>
                <FieldLabel htmlFor="edit-project-estimated-hours">
                  Horas estimadas
                </FieldLabel>
                <Input
                  id="edit-project-estimated-hours"
                  type="number"
                  min="0"
                  step="0.25"
                  value={estimatedHours}
                  onChange={(event) => setEstimatedHours(event.target.value)}
                  placeholder="Ex.: 40"
                  disabled={isSubmitting}
                />
                <FieldDescription>
                  Deixe em branco para tempo indefinido.
                </FieldDescription>
              </Field>
            ) : null}
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
