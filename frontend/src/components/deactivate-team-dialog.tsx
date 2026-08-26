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
import type { TeamResponse, TeamSummary } from '@/types/team'

interface DeactivateTeamDialogProps {
  team: TeamSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (team: TeamSummary) => void
}

export function DeactivateTeamDialog({
  team,
  open,
  onOpenChange,
  onUpdated,
}: DeactivateTeamDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    if (!team) {
      return
    }

    setIsSubmitting(true)

    try {
      const data = await api<TeamResponse>(`/teams/${team.id}/deactivate`, {
        method: 'PATCH',
      })

      onOpenChange(false)
      onUpdated(data.team)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inativar equipe</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja inativar{' '}
            <span className="font-medium text-foreground">{team?.name}</span>?
            A equipe deixará de aparecer nas listagens e no analytics. Os dados
            são mantidos e ela poderá ser reativada depois.
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
            disabled={isSubmitting || !team}
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? 'Inativando...' : 'Inativar equipe'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
