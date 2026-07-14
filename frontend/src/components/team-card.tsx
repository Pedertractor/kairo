import { Crown } from 'lucide-react'
import { Link } from 'react-router-dom'

import { TeamMemberAvatars } from '@/components/team-member-avatars'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { TeamSummary } from '@/types/team'

interface TeamCardProps {
  team: TeamSummary
  isCreator: boolean
}

export function TeamCard({ team, isCreator }: TeamCardProps) {
  return (
    <div className="relative pt-3">
      {isCreator ? (
        <div className="absolute top-0 left-1/2 z-10 -translate-x-1/2">
          <Crown className="size-5 text-amber-500" aria-label="Criador da equipe" />
        </div>
      ) : null}
      <Link to={`/equipes/${team.id}`} className="block">
        <Card
          className={cn(
            'transition-colors hover:bg-muted/50',
            isCreator && 'pt-5',
          )}
        >
          <CardHeader>
            <CardTitle>{team.name}</CardTitle>
            {team.description ? (
              <CardDescription className="line-clamp-2">
                {team.description}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            <TeamMemberAvatars members={team.members} />
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}
