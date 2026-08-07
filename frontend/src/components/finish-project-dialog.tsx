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
import { api } from '@/lib/api-handler'
import type { ProjectResponse, ProjectSummary } from '@/types/card'

interface FinishProjectDialogProps {
  teamId: string
  project: ProjectSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onFinished: () => void
}

export function FinishProjectDialog({
  teamId,
  project,
  open,
  onOpenChange,
  onFinished,
}: FinishProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    if (!project) {
      return
    }

    setIsSubmitting(true)

    try {
      await api<ProjectResponse>(`/teams/${teamId}/projects/${project.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'DONE' }),
      })
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
          <DialogTitle>Finalizar projeto</DialogTitle>
          <DialogDescription>
            {project ? (
              <>
                Tem certeza que deseja finalizar o projeto{' '}
                <span className="font-medium text-foreground">
                  {project.title}
                </span>
                ? Ele deixará de aparecer nas listas por padrão.
              </>
            ) : (
              'Tem certeza que deseja finalizar este projeto?'
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
            disabled={isSubmitting || !project}
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? 'Finalizando...' : 'Finalizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
