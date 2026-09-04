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
import type { User } from '@/types/auth'
import type { UserResponse } from '@/types/user'

interface ResetUserPasswordDialogProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (user: User) => void
}

export function ResetUserPasswordDialog({
  user,
  open,
  onOpenChange,
  onUpdated,
}: ResetUserPasswordDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    if (!user) {
      return
    }

    setIsSubmitting(true)

    try {
      const data = await api<UserResponse>(`/users/${user.id}/reset-password`, {
        method: 'POST',
      })

      onOpenChange(false)
      onUpdated(data.user)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resetar senha</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja resetar a senha de{' '}
            <span className="font-medium text-foreground">{user?.name}</span>? A
            senha passará a ser 123 e o usuário deverá definir uma nova senha no
            próximo login.
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
            disabled={isSubmitting || !user}
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? 'Resetando...' : 'Resetar senha'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
