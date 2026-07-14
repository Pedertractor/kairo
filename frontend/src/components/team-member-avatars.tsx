import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from '@/components/ui/avatar'
import { getInitials } from '@/lib/initials'
import type { TeamMemberSummary } from '@/types/team'

const MAX_VISIBLE = 4

interface TeamMemberAvatarsProps {
  members: TeamMemberSummary[]
}

export function TeamMemberAvatars({ members }: TeamMemberAvatarsProps) {
  const visible = members.slice(0, MAX_VISIBLE)
  const overflow = members.length - MAX_VISIBLE

  return (
    <AvatarGroup>
      {visible.map((member) => (
        <Avatar key={member.id}>
          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 ? (
        <AvatarGroupCount>+{overflow}</AvatarGroupCount>
      ) : null}
    </AvatarGroup>
  )
}
