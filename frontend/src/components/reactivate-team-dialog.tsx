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

interface ReactivateTeamDialogProps {
  team: TeamSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (team: TeamSummary) => void
}

export function ReactivateTeamDialog({
  team,
  open,
  onOpenChange,
  onUpdated,
}: ReactivateTeamDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    if (!team) {
      return
    }

    setIsSubmitting(true)

    try {
      const data = await api<TeamResponse>(`/teams/${team.id}/reactivate`, {
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
          <DialogTitle>Reativar equipe</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja reativar{' '}
            <span className="font-medium text-foreground">{team?.name}</span>?
            Ela voltará a aparecer nas listagens e no analytics.
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
            disabled={isSubmitting || !team}
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? 'Reativando...' : 'Reativar equipe'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
