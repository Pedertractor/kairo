import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { CreateTeamDialog } from '@/components/create-team-dialog'
import { SupervisorLeaderCard } from '@/components/supervisor-leader-card'
import { NoTeamMessage } from '@/components/no-team-message'
import { TeamCard } from '@/components/team-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-handler'
import type {
  SupervisorLeaderSummary,
  SupervisorLeadersResponse,
  TeamSummary,
  TeamsListResponse,
} from '@/types/team'

type TeamsFilter = 'ativas' | 'inativas'

function MyTeamsView({
  autoOpenSingleTeam = true,
  showTitle = true,
}: {
  autoOpenSingleTeam?: boolean
  showTitle?: boolean
}) {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const showAllTeams = searchParams.get('todas') === '1'
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [filter, setFilter] = useState<TeamsFilter>('ativas')
  const singleTeamResolved = useRef(false)

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

  // Com uma unica equipe ativa, abre direto os detalhes dela. A decisao e
  // tomada uma vez por montagem: assim, ao voltar para a lista (?todas=1) o
  // usuario continua nela mesmo clicando em "Equipes" na sidebar.
  useEffect(() => {
    if (isLoading || singleTeamResolved.current) {
      return
    }

    singleTeamResolved.current = true

    if (
      !autoOpenSingleTeam ||
      showAllTeams ||
      filter !== 'ativas' ||
      teams.length !== 1
    ) {
      return
    }

    setIsRedirecting(true)
    navigate(`/equipes/${teams[0].id}?unica=1`, { replace: true })
  }, [autoOpenSingleTeam, filter, isLoading, navigate, showAllTeams, teams])

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

  const canCreateTeam =
    user?.role === 'ADMIN' ||
    user?.role === 'LEADER' ||
    user?.role === 'SUPERVISOR'

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        {showTitle ? (
          <h1 className="text-2xl font-bold">Minhas Equipes</h1>
        ) : (
          <span />
        )}
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
          {isLoading || isRedirecting ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : teams.length === 0 ? (
            filter === 'ativas' ? (
              <NoTeamMessage
                onCreateTeam={() => setIsCreateDialogOpen(true)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma equipe inativa.
              </p>
            )
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

type SupervisorView = 'lideres' | 'minhas'

function SupervisorLeadersView() {
  const [leaders, setLeaders] = useState<SupervisorLeaderSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    api<SupervisorLeadersResponse>('/supervisor/leaders')
      .then((data) => {
        if (!cancelled) setLeaders(data.leaders)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-36 rounded-xl" />
        ))}
      </div>
    )
  }

  if (leaders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum líder vinculado a você nos centros de custo.
      </p>
    )
  }

  // Leaders with teams first, then the ones still without teams or accounts.
  const sorted = [...leaders].sort(
    (a, b) => Number(b.teamCount > 0) - Number(a.teamCount > 0),
  )

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((leader) => (
        <SupervisorLeaderCard key={leader.cardNumber} leader={leader} />
      ))}
    </div>
  )
}

function SupervisorTeamsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const view: SupervisorView =
    searchParams.get('visao') === 'minhas' ? 'minhas' : 'lideres'

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-2xl font-bold">Equipes</h1>
      <Tabs
        value={view}
        onValueChange={(value) => {
          setSearchParams(
            (current) => {
              const next = new URLSearchParams(current)
              next.set('visao', value as SupervisorView)
              return next
            },
            { replace: true },
          )
        }}
      >
        <TabsList>
          <TabsTrigger value="lideres">Líderes</TabsTrigger>
          <TabsTrigger value="minhas">Minhas equipes</TabsTrigger>
        </TabsList>
        <TabsContent value="lideres">
          <SupervisorLeadersView />
        </TabsContent>
        <TabsContent value="minhas">
          <MyTeamsView autoOpenSingleTeam={false} showTitle={false} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function TeamsPage() {
  const { user } = useAuth()

  if (user?.role === 'SUPERVISOR') {
    return <SupervisorTeamsPage />
  }

  return <MyTeamsView />
}
