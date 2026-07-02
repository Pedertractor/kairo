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

interface RemoveTeamMemberDialogProps {
  teamId: string
  member: TeamMemberSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRemoved: (team: TeamSummary) => void
}

export function RemoveTeamMemberDialog({
  teamId,
  member,
  open,
  onOpenChange,
  onRemoved,
}: RemoveTeamMemberDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    if (!member) {
      return
    }

    setIsSubmitting(true)

    try {
      const data = await api<TeamResponse>(
        `/teams/${teamId}/members/${member.id}`,
        { method: 'DELETE' },
      )

      onOpenChange(false)
      onRemoved(data.team)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover membro</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover{' '}
            <span className="font-medium text-foreground">{member?.name}</span>{' '}
            desta equipe? Esta ação não pode ser desfeita.
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
            disabled={isSubmitting || !member}
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? 'Removendo...' : 'Remover membro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
