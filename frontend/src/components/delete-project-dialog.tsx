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
import type { ProjectResponse, ProjectSummary } from '@/types/card'

interface DeleteProjectDialogProps {
  teamId: string
  project: ProjectSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

export function DeleteProjectDialog({
  teamId,
  project,
  open,
  onOpenChange,
  onDeleted,
}: DeleteProjectDialogProps) {
  const { refresh: refreshTimer } = useActiveTimer()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    if (!project) {
      return
    }

    setIsSubmitting(true)

    try {
      await api<ProjectResponse>(
        `/teams/${teamId}/projects/${project.id}`,
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
          <DialogTitle>Excluir projeto</DialogTitle>
          <DialogDescription>
            {project ? (
              <>
                Tem certeza que deseja excluir o projeto{' '}
                <span className="font-medium text-foreground">
                  {project.title}
                </span>
                ? Ele deixará de aparecer nas listas e suas tarefas também
                serão excluídas. Apontamentos ativos serão encerrados.
              </>
            ) : (
              'Tem certeza que deseja excluir este projeto?'
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
            disabled={isSubmitting || !project}
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
