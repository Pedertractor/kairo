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
import type { TeamMemberSummary, TeamResponse, TeamSummary } from '@/types/team'

interface DemoteTeamAdminDialogProps {
  teamId: string
  member: TeamMemberSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDemoted: (team: TeamSummary) => void
}

export function DemoteTeamAdminDialog({
  teamId,
  member,
  open,
  onOpenChange,
  onDemoted,
}: DemoteTeamAdminDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    if (!member) {
      return
    }

    setIsSubmitting(true)

    try {
      const data = await api<TeamResponse>(
        `/teams/${teamId}/members/${member.id}/admin`,
        { method: 'DELETE' },
      )

      onOpenChange(false)
      onDemoted(data.team)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover administrador</DialogTitle>
          <DialogDescription>
            Deseja remover o cargo de administrador de{' '}
            <span className="font-medium text-foreground">{member?.name}</span>
            ?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Ao confirmar,{' '}
            <span className="font-medium text-foreground">{member?.name}</span>{' '}
            passará a ser um membro comum e perderá permissões de
            gerenciamento da equipe.
          </p>
        </div>

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
            disabled={isSubmitting || !member}
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? 'Removendo...' : 'Remover administrador'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
