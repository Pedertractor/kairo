import { useState } from 'react'
import { Crown, EllipsisIcon, Info } from 'lucide-react'
import { Link } from 'react-router-dom'

import { TeamDetailsDialog } from '@/components/team-details-dialog'
import { TeamMemberAvatars } from '@/components/team-member-avatars'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { TeamSummary } from '@/types/team'

interface TeamCardProps {
  team: TeamSummary
  isAdmin: boolean
  onUpdated?: (team: TeamSummary) => void
}

export function TeamCard({ team, isAdmin, onUpdated }: TeamCardProps) {
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)

  return (
    <div className="relative pt-3">
      {isAdmin ? (
        <div className="absolute top-0 left-1/2 z-10 -translate-x-1/2">
          <Crown className="size-5 text-amber-500" aria-label="Administrador da equipe" />
        </div>
      ) : null}
      <Link to={`/equipes/${team.id}`} className="block">
        <Card
          className={cn(
            'transition-colors hover:bg-muted/50',
            isAdmin && 'pt-5',
          )}
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle>{team.name}</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="-mt-1 shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label={`Ações para ${team.name}`}
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                      }}
                    />
                  }
                >
                  <EllipsisIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                  }}
                >
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setIsDetailsDialogOpen(true)
                    }}
                  >
                    <Info />
                    Detalhes
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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

      <TeamDetailsDialog
        team={team}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        onUpdated={(updated) => onUpdated?.(updated)}
      />
    </div>
  )
}
