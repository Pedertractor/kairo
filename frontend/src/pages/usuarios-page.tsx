import { useCallback, useEffect, useState } from 'react'
import {
  Crown,
  EllipsisIcon,
  KeyRound,
  Plus,
  Shield,
  UserCheck,
  UserX,
} from 'lucide-react'

import { ChangeUserRoleDialog } from '@/components/change-user-role-dialog'
import { CreateUserDialog } from '@/components/create-user-dialog'
import { DeactivateUserDialog } from '@/components/deactivate-user-dialog'
import { ResetUserPasswordDialog } from '@/components/reset-user-password-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-handler'
import { getInitials } from '@/lib/initials'
import { cn } from '@/lib/utils'
import type { User, UserRole, UnitType } from '@/types/auth'
import type { UsersListResponse } from '@/types/user'

const UNIT_LABELS: Record<UnitType, string> = {
  PEDERTRACTOR: 'Pedertractor',
  TRACTOR: 'Tractor',
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  USER: 'Usuário',
}

type UserAction = 'role' | 'reset-password' | 'deactivate'

export function UsuariosPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [activeAction, setActiveAction] = useState<UserAction | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const loadUsers = useCallback(async () => {
    setIsLoading(true)

    try {
      const data = await api<UsersListResponse>('/users')
      setUsers(data.users)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  function handleUserUpdated(updatedUser: User) {
    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === updatedUser.id ? updatedUser : user,
      ),
    )
  }

  function openAction(user: User, action: UserAction) {
    setSelectedUser(user)
    setActiveAction(action)
  }

  function closeActionDialog(open: boolean) {
    if (!open) {
      setSelectedUser(null)
      setActiveAction(null)
    }
  }

  async function handleReactivate(user: User) {
    const data = await api<{ user: User }>(`/users/${user.id}/reactivate`, {
      method: 'PATCH',
    })

    handleUserUpdated(data.user)
  }

  const isCurrentUser = (user: User) => user.id === currentUser?.id

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os usuários da plataforma.
          </p>
        </div>
        <Button type="button" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus />
          Criar usuário
        </Button>
      </div>

      <CreateUserDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={(user) => {
          setUsers((currentUsers) =>
            [user, ...currentUsers].sort((a, b) => {
              if (a.active !== b.active) {
                return a.active ? -1 : 1
              }

              return a.name.localeCompare(b.name, 'pt-BR')
            }),
          )
        }}
      />

      <ChangeUserRoleDialog
        user={selectedUser}
        open={activeAction === 'role'}
        onOpenChange={closeActionDialog}
        onUpdated={handleUserUpdated}
      />

      <ResetUserPasswordDialog
        user={selectedUser}
        open={activeAction === 'reset-password'}
        onOpenChange={closeActionDialog}
        onUpdated={handleUserUpdated}
      />

      <DeactivateUserDialog
        user={selectedUser}
        open={activeAction === 'deactivate'}
        onOpenChange={closeActionDialog}
        onUpdated={handleUserUpdated}
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium">Nenhum usuário encontrado</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Os usuários cadastrados na plataforma aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-sm">
              <thead>
                <tr className="border-b bg-brand-soft text-left text-xs text-sidebar-primary">
                  <th className="px-4 py-3 font-medium">Usuário</th>
                  <th className="px-4 py-3 font-medium">Cartão</th>
                  <th className="px-4 py-3 font-medium">Unidade</th>
                  <th className="px-4 py-3 font-medium">Função</th>
                  <th className="px-4 py-3 font-medium">Operador</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className={cn(
                      'border-b last:border-b-0',
                      !user.active && 'bg-muted/20 text-muted-foreground',
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          <AvatarFallback className="text-xs">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate font-medium text-foreground">
                              {user.name}
                            </p>
                            {user.role === 'ADMIN' ? (
                              <Crown
                                className="size-3.5 shrink-0 text-sidebar-primary"
                                aria-label="Administrador"
                              />
                            ) : null}
                            {isCurrentUser(user) ? (
                              <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                Você
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {user.employeeId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{user.cardNumber}</td>
                    <td className="px-4 py-3">{UNIT_LABELS[user.unit]}</td>
                    <td className="px-4 py-3">{ROLE_LABELS[user.role]}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-md px-2 py-0.5 text-xs',
                          user.printerOperator
                            ? 'bg-sidebar-primary/10 text-sidebar-primary'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {user.printerOperator ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-md px-2 py-0.5 text-xs',
                          user.active
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {user.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Ações para ${user.name}`}
                            />
                          }
                        >
                          <EllipsisIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {user.active ? (
                            <>
                              <DropdownMenuItem
                                onClick={() => openAction(user, 'role')}
                              >
                                <Shield />
                                Alterar função
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  openAction(user, 'reset-password')
                                }
                              >
                                <KeyRound />
                                Repor senha
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={isCurrentUser(user)}
                                onClick={() => openAction(user, 'deactivate')}
                              >
                                <UserX />
                                Remover da aplicação
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => void handleReactivate(user)}
                            >
                              <UserCheck />
                              Reativar usuário
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
