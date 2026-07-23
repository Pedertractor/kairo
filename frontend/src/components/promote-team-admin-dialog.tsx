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

interface PromoteTeamAdminDialogProps {
  teamId: string
  member: TeamMemberSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPromoted: (team: TeamSummary) => void
}

export function PromoteTeamAdminDialog({
  teamId,
  member,
  open,
  onOpenChange,
  onPromoted,
}: PromoteTeamAdminDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    if (!member) {
      return
    }

    setIsSubmitting(true)

    try {
      const data = await api<TeamResponse>(
        `/teams/${teamId}/members/${member.id}/admin`,
        { method: 'PATCH' },
      )

      onOpenChange(false)
      onPromoted(data.team)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promover a administrador</DialogTitle>
          <DialogDescription>
            Deseja tornar{' '}
            <span className="font-medium text-foreground">{member?.name}</span>{' '}
            administrador desta equipe?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Ao confirmar,{' '}
            <span className="font-medium text-foreground">{member?.name}</span>{' '}
            poderá gerenciar a equipe (por exemplo, adicionar e remover
            membros).
          </p>
          <p>
            Você continua como administrador. A equipe pode ter mais de um
            administrador.
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
            {isSubmitting ? 'Promovendo...' : 'Promover administrador'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
