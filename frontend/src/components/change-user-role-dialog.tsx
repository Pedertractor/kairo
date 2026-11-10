import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-handler'
import type { User, UserRole } from '@/types/auth'
import type { UpdateUserRoleInput, UserResponse } from '@/types/user'

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  LEADER: 'Líder',
  USER: 'Usuário',
}

interface ChangeUserRoleDialogProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (user: User) => void
}

export function ChangeUserRoleDialog({
  user,
  open,
  onOpenChange,
  onUpdated,
}: ChangeUserRoleDialogProps) {
  const { user: currentUser } = useAuth()
  const [role, setRole] = useState<UserRole>('USER')
  const [production, setProduction] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const availableRoles = useMemo(() => {
    if (currentUser?.role === 'ADMIN') {
      return (Object.keys(ROLE_LABELS) as UserRole[])
    }

    return (['LEADER', 'USER'] as UserRole[])
  }, [currentUser?.role])

  useEffect(() => {
    if (user) {
      setRole(user.role)
      setProduction(user.production)
    }
  }, [user, open])

  const hasChanges = user !== null && (role !== user.role || production !== user.production)

  async function handleConfirm() {
    if (!user || !hasChanges) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)

    try {
      const payload: UpdateUserRoleInput = {
        role,
        production,
      }

      const data = await api<UserResponse>(`/users/${user.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })

      onOpenChange(false)
      onUpdated(data.user)
      if (user.id === currentUser?.id && data.user.production !== currentUser.production) {
        window.dispatchEvent(new Event('kairo:session-expired'))
      }
    } catch {
      // The API displays the error; keep the draft available for another attempt.
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar função e acesso</DialogTitle>
          <DialogDescription>
            Defina a função e o acesso de{' '}
            <span className="font-medium text-foreground">{user?.name}</span> na
            plataforma.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-role">Função</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as UserRole)}
              disabled={isSubmitting || production}
            >
              <SelectTrigger id="user-role" className="w-full">
                <SelectValue>
                  {(selectedValue) =>
                    ROLE_LABELS[selectedValue as UserRole]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((option) => (
                  <SelectItem key={option} value={option}>
                    {ROLE_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="edit-user-production" className="flex items-center gap-2 text-sm font-medium">
              <input
                id="edit-user-production"
                type="checkbox"
                checked={production}
                disabled={isSubmitting}
                className="size-4 accent-primary"
                onChange={(event) => {
                  setProduction(event.target.checked)
                  if (event.target.checked) setRole('USER')
                }}
              />
              Usuário de produção
            </label>
            <p className="text-sm text-muted-foreground">
              Acesso por cartão e unidade, apenas atividades e saída após 15s sem uso.
              Alterar o acesso encerra as sessões existentes.
            </p>
          </div>
        </FieldGroup>

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
            disabled={isSubmitting || !user || !hasChanges}
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
