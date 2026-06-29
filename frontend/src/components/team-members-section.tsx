import { useState } from 'react'
import { Crown, X } from 'lucide-react'

import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-handler'
import { getInitials } from '@/lib/initials'
import type { TeamMemberSummary, TeamResponse, TeamRole, TeamSummary } from '@/types/team'

const ROLE_LABELS: Record<TeamMemberSummary['role'], string> = {
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
}

interface TeamMembersSectionProps {
  teamId: string
  members: TeamMemberSummary[]
  currentUserRole: TeamRole
  onTeamUpdated: (team: TeamSummary) => void
}

export function TeamMembersSection({
  teamId,
  members,
  currentUserRole,
  onTeamUpdated,
}: TeamMembersSectionProps) {
  const { user } = useAuth()
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const canManageMembers = currentUserRole === 'ADMIN'

  async function handleRemoveMember(memberId: string) {
    setRemovingMemberId(memberId)

    try {
      const data = await api<TeamResponse>(
        `/teams/${teamId}/members/${memberId}`,
        { method: 'DELETE' },
      )
      onTeamUpdated(data.team)
    } finally {
      setRemovingMemberId(null)
    }
  }

  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum membro nesta equipe.
      </p>
    )
  }

  return (
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
                disabled={removingMemberId === member.id}
                aria-label={`Remover ${member.name}`}
                onClick={() => void handleRemoveMember(member.id)}
              >
                <X />
              </Button>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
