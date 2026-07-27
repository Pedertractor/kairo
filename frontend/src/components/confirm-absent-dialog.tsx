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

  async function handleConfirm() {
    setIsSubmitting(true)

    try {
      await api<MeResponse>('/auth/me/absent', {
        method: 'PATCH',
        body: JSON.stringify({ absent }),
      })
      await Promise.all([refreshUser(), refreshTimer()])
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
            {absent ? 'Marcar como ausente' : 'Remover ausência'}
          </DialogTitle>
          <DialogDescription>
            {absent
              ? 'Ao marcar-se como ausente, o apontamento em andamento será pausado e você não poderá iniciar novos apontamentos até remover a ausência.'
              : 'Ao remover a ausência, você voltará a poder iniciar apontamentos normalmente.'}
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
            disabled={isSubmitting}
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
