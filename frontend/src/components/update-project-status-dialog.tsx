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
import { api } from '@/lib/api-handler'
import { CARD_STATUSES, STATUS_LABELS } from '@/lib/card-status'
import type { CardStatus, ProjectResponse, ProjectSummary } from '@/types/card'

interface UpdateProjectStatusDialogProps {
  teamId: string
  project: ProjectSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

export function UpdateProjectStatusDialog({
  teamId,
  project,
  open,
  onOpenChange,
  onUpdated,
}: UpdateProjectStatusDialogProps) {
  const [status, setStatus] = useState<CardStatus | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && project) {
      setStatus(project.status)
    }
  }, [open, project])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!project || !status || status === project.status) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)

    try {
      await api<ProjectResponse>(
        `/teams/${teamId}/projects/${project.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        },
      )

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
              {project
                ? `Selecione o novo status para "${project.title}".`
                : 'Selecione o novo status do projeto.'}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="project-status">Status</FieldLabel>
              <Select
                value={status ?? undefined}
                onValueChange={(value) => setStatus(value as CardStatus)}
                disabled={isSubmitting || !project}
              >
                <SelectTrigger id="project-status" className="w-full">
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  {CARD_STATUSES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {STATUS_LABELS[option]}
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
