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
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-handler'
import type { TeamMemberSummary, TeamResponse, TeamSummary } from '@/types/team'

interface SetMemberAbsentDialogProps {
  teamId: string
  member: TeamMemberSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (team: TeamSummary) => void
}

export function SetMemberAbsentDialog({
  teamId,
  member,
  open,
  onOpenChange,
  onUpdated,
}: SetMemberAbsentDialogProps) {
  const { user, refreshUser } = useAuth()
  const { refresh: refreshTimer } = useActiveTimer()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const nextAbsent = member ? !member.absent : false

  async function handleConfirm() {
    if (!member) {
      return
    }

    setIsSubmitting(true)

    try {
      const data = await api<TeamResponse>(
        `/teams/${teamId}/members/${member.id}/absent`,
        {
          method: 'PATCH',
          body: JSON.stringify({ absent: nextAbsent }),
        },
      )

      onUpdated(data.team)

      if (member.id === user?.id) {
        await Promise.all([refreshUser(), refreshTimer()])
      }

      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {nextAbsent ? 'Marcar como ausente' : 'Remover ausência'}
          </DialogTitle>
          <DialogDescription>
            {nextAbsent ? (
              <>
                Tem certeza que deseja marcar{' '}
                <span className='font-medium text-foreground'>
                  {member?.name}
                </span>{' '}
                como ausente? O apontamento em andamento será pausado e a pessoa
                não poderá iniciar novos apontamentos.
              </>
            ) : (
              <>
                Tem certeza que deseja remover a ausência de{' '}
                <span className='font-medium text-foreground'>
                  {member?.name}
                </span>
                ? A pessoa voltará a poder iniciar apontamentos.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type='button'
            variant='cancel'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type='button'
            disabled={isSubmitting || !member}
            onClick={() => void handleConfirm()}
          >
            {isSubmitting
              ? 'Salvando...'
              : nextAbsent
                ? 'Confirmar ausência'
                : 'Confirmar disponibilidade'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
