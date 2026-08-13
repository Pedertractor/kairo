import { useCallback, useEffect, useState } from 'react'

import { CreateTeamDialog } from '@/components/create-team-dialog'
import { TeamCard } from '@/components/team-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-handler'
import type { TeamSummary, TeamsListResponse } from '@/types/team'

export function TeamsPage() {
  const { user, refreshUser } = useAuth()
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

  const handleTeamCreated = useCallback(async () => {
    await Promise.all([loadTeams(), refreshUser()])
  }, [loadTeams, refreshUser])

  const handleTeamUpdated = useCallback((updated: TeamSummary) => {
    setTeams((current) =>
      current.map((team) =>
        team.id === updated.id ? { ...team, ...updated } : team,
      ),
    )
  }, [])

  const canCreateTeam = user?.role === 'ADMIN' || user?.role === 'LEADER'

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Minhas Equipes</h1>
        {canCreateTeam ? (
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
              isAdmin={team.role === 'ADMIN'}
              onUpdated={handleTeamUpdated}
            />
          ))}
        </div>
      )}

      {canCreateTeam ? (
        <CreateTeamDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreated={handleTeamCreated}
        />
      ) : null}
    </div>
  )
}
