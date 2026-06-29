import { useCallback, useEffect, useState } from 'react'

import { CreateTeamDialog } from '@/components/create-team-dialog'
import { TeamCard } from '@/components/team-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-handler'
import type { TeamSummary, TeamsListResponse } from '@/types/team'

export function TeamsPage() {
  const { user } = useAuth()
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const loadTeams = useCallback(async () => {
    setIsLoading(true)

    try {
      const data = await api<TeamsListResponse>('/teams')
      setTeams(data.teams)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTeams()
  }, [loadTeams])

  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Minhas Equipes</h1>
        {isAdmin ? (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            Criar nova equipe
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Você ainda não faz parte de nenhuma equipe.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              isCreator={team.createdById === user?.id}
            />
          ))}
        </div>
      )}

      {isAdmin ? (
        <CreateTeamDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreated={loadTeams}
        />
      ) : null}
    </div>
  )
}
