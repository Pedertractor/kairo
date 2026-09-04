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
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)

  useEffect(() => {
    if (!open) {
      return
    }

    const today = fromDateKey(toDateKey(new Date()))
    setStartDate(today)
    setEndDate(absent ? undefined : today)
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
        body.startDate = toDateKey(startDate ?? new Date())
        body.endDate = endDate ? toDateKey(endDate) : null
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

  const canSubmit =
    !isSubmitting &&
    (!absent ||
      (Boolean(startDate) &&
        (!endDate || toDateKey(endDate) >= toDateKey(startDate!))))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {absent ? 'Marcar como ausente' : 'Remover ausência'}
          </DialogTitle>
          <DialogDescription>
            {absent
              ? 'Ao marcar-se como ausente, o apontamento em andamento será pausado e você não poderá iniciar novos apontamentos até remover a ausência.'
              : 'Ao remover a ausência, você voltará a poder iniciar apontamentos normalmente.'}
          </DialogDescription>
        </DialogHeader>

        {absent ? (
          <div className='space-y-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='self-absence-start'>Data de início</Label>
              <DatePicker
                id='self-absence-start'
                date={startDate}
                onDateChange={setStartDate}
                disabled={isSubmitting}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='self-absence-end'>
                Data de fim (opcional)
              </Label>
              <DatePicker
                id='self-absence-end'
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
              : absent
                ? 'Confirmar ausência'
                : 'Confirmar disponibilidade'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
