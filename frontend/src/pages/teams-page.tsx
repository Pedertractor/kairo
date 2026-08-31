import { useCallback, useEffect, useState } from 'react'

import { CreateTeamDialog } from '@/components/create-team-dialog'
import { TeamCard } from '@/components/team-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-handler'
import type { TeamSummary, TeamsListResponse } from '@/types/team'

type TeamsFilter = 'ativas' | 'inativas'

export function TeamsPage() {
  const { user, refreshUser } = useAuth()
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [filter, setFilter] = useState<TeamsFilter>('ativas')

  const loadTeams = useCallback(async () => {
    setIsLoading(true)

    try {
      const path =
        filter === 'inativas' ? '/teams?active=false' : '/teams'
      const data = await api<TeamsListResponse>(path)
      setTeams(data.teams)
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void loadTeams()
  }, [loadTeams])

  const handleTeamCreated = useCallback(async () => {
    await Promise.all([loadTeams(), refreshUser()])
  }, [loadTeams, refreshUser])

  const handleTeamUpdated = useCallback(
    async (updated: TeamSummary) => {
      if (updated.active === (filter === 'ativas')) {
        setTeams((current) =>
          current.map((team) =>
            team.id === updated.id ? { ...team, ...updated } : team,
          ),
        )
        return
      }

      setTeams((current) => current.filter((team) => team.id !== updated.id))
      await refreshUser()
    },
    [filter, refreshUser],
  )

  const canCreateTeam = user?.role === 'ADMIN' || user?.role === 'LEADER'
  const emptyMessage =
    filter === 'inativas'
      ? 'Nenhuma equipe inativa.'
      : 'Você ainda não faz parte de nenhuma equipe.'

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

      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as TeamsFilter)}
      >
        <TabsList>
          <TabsTrigger value="ativas">Ativas</TabsTrigger>
          <TabsTrigger value="inativas">Inativas</TabsTrigger>
        </TabsList>

        <TabsContent value={filter}>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  isAdmin={team.role === 'ADMIN'}
                  onUpdated={(updated) => {
                    void handleTeamUpdated(updated)
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
