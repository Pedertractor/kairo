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

interface DeactivateUserDialogProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (user: User) => void
}

export function DeactivateUserDialog({
  user,
  open,
  onOpenChange,
  onUpdated,
}: DeactivateUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    if (!user) {
      return
    }

    setIsSubmitting(true)

    try {
      const data = await api<UserResponse>(`/users/${user.id}/deactivate`, {
        method: 'PATCH',
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
          <DialogTitle>Remover da aplicação</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover{' '}
            <span className="font-medium text-foreground">{user?.name}</span>{' '}
            da aplicação? O usuário não poderá mais fazer login.
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
            variant="destructive"
            disabled={isSubmitting || !user}
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? 'Removendo...' : 'Remover usuário'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
