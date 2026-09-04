import { useEffect, useState } from 'react'

import { DatePicker } from '@/components/date-picker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useActiveTimer } from '@/hooks/use-active-timer'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-handler'
import { fromDateKey, toDateKey } from '@/lib/date'
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
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)

  const nextAbsent = member ? !member.absent : false

  useEffect(() => {
    if (!open) {
      return
    }

    const today = fromDateKey(toDateKey(new Date()))
    setStartDate(today)
    setEndDate(nextAbsent ? undefined : today)
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
        body.startDate = toDateKey(startDate ?? new Date())
        body.endDate = endDate ? toDateKey(endDate) : null
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
        (!endDate || toDateKey(endDate) >= toDateKey(startDate!))))

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
            <div className='space-y-1.5'>
              <Label htmlFor='member-absence-start'>Data de início</Label>
              <DatePicker
                id='member-absence-start'
                date={startDate}
                onDateChange={setStartDate}
                disabled={isSubmitting}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='member-absence-end'>
                Data de fim (opcional)
              </Label>
              <DatePicker
                id='member-absence-end'
                date={endDate}
                onDateChange={setEndDate}
                disabled={isSubmitting}
                placeholder='Em aberto'
              />
            </div>
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
