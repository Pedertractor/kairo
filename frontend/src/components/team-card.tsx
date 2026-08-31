import { useState, type ReactNode } from 'react'
import { Crown, EllipsisIcon, Info, UserMinus, UserCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import { DeactivateTeamDialog } from '@/components/deactivate-team-dialog'
import { ReactivateTeamDialog } from '@/components/reactivate-team-dialog'
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

function TeamCardShell({
  team,
  isAdmin,
  children,
}: {
  team: TeamSummary
  isAdmin: boolean
  children: ReactNode
}) {
  return (
    <Card
      className={cn(
        'transition-colors',
        team.active && 'hover:bg-muted/50',
        !team.active && 'opacity-80',
        isAdmin && 'pt-5',
      )}
    >
      {children}
    </Card>
  )
}

export function TeamCard({ team, isAdmin, onUpdated }: TeamCardProps) {
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false)
  const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false)

  const cardBody = (
    <>
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
              {isAdmin && team.active ? (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setIsDeactivateDialogOpen(true)
                  }}
                >
                  <UserMinus />
                  Inativar equipe
                </DropdownMenuItem>
              ) : null}
              {isAdmin && !team.active ? (
                <DropdownMenuItem
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setIsReactivateDialogOpen(true)
                  }}
                >
                  <UserCheck />
                  Reativar equipe
                </DropdownMenuItem>
              ) : null}
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
    </>
  )

  return (
    <div className="relative pt-3">
      {isAdmin ? (
        <div className="absolute top-0 left-1/2 z-10 -translate-x-1/2">
          <Crown className="size-5 text-amber-500" aria-label="Administrador da equipe" />
        </div>
      ) : null}
      {team.active ? (
        <Link to={`/equipes/${team.id}`} className="block">
          <TeamCardShell team={team} isAdmin={isAdmin}>
            {cardBody}
          </TeamCardShell>
        </Link>
      ) : (
        <TeamCardShell team={team} isAdmin={isAdmin}>
          {cardBody}
        </TeamCardShell>
      )}

      <TeamDetailsDialog
        team={team}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        onUpdated={(updated) => onUpdated?.(updated)}
      />
      <DeactivateTeamDialog
        team={team}
        open={isDeactivateDialogOpen}
        onOpenChange={setIsDeactivateDialogOpen}
        onUpdated={(updated) => onUpdated?.(updated)}
      />
      <ReactivateTeamDialog
        team={team}
        open={isReactivateDialogOpen}
        onOpenChange={setIsReactivateDialogOpen}
        onUpdated={(updated) => onUpdated?.(updated)}
      />
    </div>
  )
}
