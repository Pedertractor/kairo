import { useEffect, useState } from 'react'

import { DateTimePickerField } from '@/components/datetime-picker-field'
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
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)

  const nextAbsent = member ? !member.absent : false

  useEffect(() => {
    if (!open) {
      return
    }

    setStartDate(new Date().toISOString())
    setEndDate(null)
  }, [open, nextAbsent])

  async function handleConfirm() {
    if (!member) {
      return
    }

    setIsSubmitting(true)

    try {
      const body: {
        absent: boolean
        startDate?: string
        endDate?: string | null
      } = { absent: nextAbsent }

      if (nextAbsent) {
        body.startDate = startDate ?? new Date().toISOString()
        body.endDate = endDate
      }

      const data = await api<TeamResponse>(
        `/teams/${teamId}/members/${member.id}/absent`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
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

  const canSubmit =
    !isSubmitting &&
    Boolean(member) &&
    (!nextAbsent ||
      (Boolean(startDate) &&
        (!endDate || new Date(endDate) > new Date(startDate!))))

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

        {nextAbsent ? (
          <div className='space-y-3'>
            <DateTimePickerField
              id='member-absence-start'
              label='Início da ausência'
              value={startDate}
              onChange={setStartDate}
              disabled={isSubmitting}
            />
            <DateTimePickerField
              id='member-absence-end'
              label='Fim da ausência'
              value={endDate}
              onChange={setEndDate}
              optional
              disabled={isSubmitting}
            />
          </div>
        ) : null}

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
            disabled={!canSubmit}
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
