import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'
import { getInitials } from '@/lib/initials'
import type { TeamMemberSummary } from '@/types/team'

const ROLE_LABELS: Record<TeamMemberSummary['role'], string> = {
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
}

interface TeamMembersSectionProps {
  members: TeamMemberSummary[]
}

export function TeamMembersSection({ members }: TeamMembersSectionProps) {
  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum membro nesta equipe.
      </p>
    )
  }

  return (
    <ul className="divide-y rounded-xl border bg-card">
      {members.map((member) => (
        <li key={member.id} className="flex items-center gap-3 p-4">
          <Avatar>
            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{member.name}</p>
            <p className="text-xs text-muted-foreground">
              {ROLE_LABELS[member.role]}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
