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
          <DialogTitle>Repor senha</DialogTitle>
          <DialogDescription>
            A senha de{' '}
            <span className="font-medium text-foreground">{user?.name}</span>{' '}
            será reposta para a senha padrão. O usuário deverá definir uma nova
            senha no próximo login.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
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
            {isSubmitting ? 'Repondo...' : 'Repor senha'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
