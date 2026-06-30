import { useState } from 'react'
import { Crown, UserPlus, X } from 'lucide-react'

import { AddTeamMemberDialog } from '@/components/add-team-member-dialog'
import { RemoveTeamMemberDialog } from '@/components/remove-team-member-dialog'
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { getInitials } from '@/lib/initials'
import type { TeamMemberSummary, TeamRole, TeamSummary } from '@/types/team'

const ROLE_LABELS: Record<TeamMemberSummary['role'], string> = {
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
}

interface TeamMembersSectionProps {
  teamId: string
  createdById: string
  members: TeamMemberSummary[]
  currentUserRole: TeamRole
  onTeamUpdated: (team: TeamSummary) => void
}

export function TeamMembersSection({
  teamId,
  createdById,
  members,
  currentUserRole,
  onTeamUpdated,
}: TeamMembersSectionProps) {
  const { user } = useAuth()
  const [memberToRemove, setMemberToRemove] = useState<TeamMemberSummary | null>(
    null,
  )
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const canManageMembers = currentUserRole === 'ADMIN'
  const isCreator = user?.id === createdById

  return (
    <div className="flex flex-col gap-3">
      {isCreator ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <UserPlus />
            Adicionar membro
          </Button>
          <AddTeamMemberDialog
            teamId={teamId}
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            onAdded={onTeamUpdated}
          />
        </div>
      ) : null}

      <RemoveTeamMemberDialog
        teamId={teamId}
        member={memberToRemove}
        open={memberToRemove !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMemberToRemove(null)
          }
        }}
        onRemoved={onTeamUpdated}
      />

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum membro nesta equipe.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => {
            const canRemove =
              canManageMembers && user?.id !== member.id

            return (
              <li
                key={member.id}
                className="flex items-center gap-2 rounded-lg border bg-card px-2 py-1.5"
              >
                <Avatar size="sm">
                  <AvatarFallback className="text-xs">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-sm font-medium">{member.name}</p>
                    {member.role === 'ADMIN' ? (
                      <Crown
                        className="size-3 shrink-0 text-sidebar-primary"
                        aria-label="Administrador"
                      />
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[member.role]}
                  </p>
                </div>

                {canRemove ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Remover ${member.name}`}
                    onClick={() => setMemberToRemove(member)}
                  >
                    <X />
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
