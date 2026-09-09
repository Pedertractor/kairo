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
import type { MeResponse } from '@/types/auth'

interface ConfirmAbsentDialogProps {
  open: boolean
  absent: boolean
  onOpenChange: (open: boolean) => void
}

export function ConfirmAbsentDialog({
  open,
  absent,
  onOpenChange,
}: ConfirmAbsentDialogProps) {
  const { refreshUser } = useAuth()
  const { refresh: refreshTimer } = useActiveTimer()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    setStartDate(new Date().toISOString())
    setEndDate(null)
  }, [open, absent])

  async function handleConfirm() {
    setIsSubmitting(true)

    try {
      const body: {
        absent: boolean
        startDate?: string
        endDate?: string | null
      } = { absent }

      if (absent) {
        body.startDate = startDate ?? new Date().toISOString()
        body.endDate = endDate
      }

      await api<MeResponse>('/auth/me/absent', {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      await Promise.all([refreshUser(), refreshTimer()])
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isScheduled = Boolean(startDate) && new Date(startDate!) > new Date()

  const canSubmit =
    !isSubmitting &&
    (!absent ||
      (Boolean(startDate) &&
        (!endDate || new Date(endDate) > new Date(startDate!))))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {absent ? 'Marcar como ausente' : 'Remover ausência'}
          </DialogTitle>
          <DialogDescription>
            {absent
              ? isScheduled
                ? 'A ausência ficará agendada e só passará a valer no início informado. Até lá, você continua apontando normalmente.'
                : 'Ao marcar-se como ausente, o apontamento em andamento será pausado. Se você iniciar um apontamento antes do fim da ausência, o horário de término será ajustado para o início desse apontamento.'
              : 'Ao remover a ausência, o período atual será encerrado neste momento.'}
          </DialogDescription>
        </DialogHeader>

        {absent ? (
          <div className='space-y-3'>
            <DateTimePickerField
              id='self-absence-start'
              label='Início da ausência'
              value={startDate}
              onChange={setStartDate}
              disabled={isSubmitting}
            />
            <DateTimePickerField
              id='self-absence-end'
              label='Fim da ausência'
              value={endDate}
              onChange={setEndDate}
              optional
              openEndedLabel={
                isScheduled ? 'Fim indeterminado' : 'Em andamento'
              }
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
              : absent
                ? 'Confirmar ausência'
                : 'Confirmar disponibilidade'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
