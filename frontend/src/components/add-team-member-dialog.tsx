import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-handler'
import type {
  AddTeamMemberInput,
  AvailableTeamMembersResponse,
  TeamResponse,
  TeamUserOption,
} from '@/types/team'

interface AddTeamMemberDialogProps {
  teamId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: (team: TeamResponse['team']) => void
}

export function AddTeamMemberDialog({
  teamId,
  open,
  onOpenChange,
  onAdded,
}: AddTeamMemberDialogProps) {
  const [users, setUsers] = useState<TeamUserOption[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function resetForm() {
    setSelectedUserId(null)
    setUsers([])
  }

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false

    async function loadUsers() {
      setIsLoadingUsers(true)

      try {
        const data = await api<AvailableTeamMembersResponse>(
          `/teams/${teamId}/available-members`,
          { toastOnError: false },
        )

        if (!cancelled) {
          setUsers(data.users)
        }
      } catch {
        if (!cancelled) {
          setUsers([])
        }
      } finally {
        if (!cancelled) {
          setIsLoadingUsers(false)
        }
      }
    }

    void loadUsers()

    return () => {
      cancelled = true
    }
  }, [open, teamId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedUserId) {
      return
    }

    setIsSubmitting(true)

    try {
      const payload: AddTeamMemberInput = { userId: selectedUserId }
      const data = await api<TeamResponse>(`/teams/${teamId}/members`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      resetForm()
      onOpenChange(false)
      onAdded(data.team)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetForm()
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adicionar membro</DialogTitle>
            <DialogDescription>
              Selecione um usuário da sua unidade para adicionar à equipe.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="member-user">Usuário</FieldLabel>
              {isLoadingUsers ? (
                <Skeleton className="h-8 w-full" />
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum usuário disponível para adicionar.
                </p>
              ) : (
                <Select
                  value={selectedUserId}
                  onValueChange={(value) => setSelectedUserId(value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="member-user" className="w-full">
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
          </FieldGroup>

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
              type="submit"
              disabled={
                isSubmitting ||
                isLoadingUsers ||
                !selectedUserId ||
                users.length === 0
              }
            >
              {isSubmitting ? 'Adicionando...' : 'Adicionar membro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
