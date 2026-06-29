import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { TeamMemberAvatars } from '@/components/team-member-avatars'
import { TeamMembersSection } from '@/components/team-members-section'
import { TeamSectionPlaceholder } from '@/components/team-section-placeholder'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api-handler'
import type { TeamResponse } from '@/types/team'

type TeamTab = 'membros' | 'apontamentos' | 'timeline'

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const [team, setTeam] = useState<TeamResponse['team'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TeamTab>('membros')

  useEffect(() => {
    if (!teamId) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function loadTeam() {
      setIsLoading(true)

      try {
        const data = await api<TeamResponse>(`/teams/${teamId}`)
        if (!cancelled) {
          setTeam(data.team)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadTeam()

    return () => {
      cancelled = true
    }
  }, [teamId])

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" render={<Link to="/equipes" />}>
          <ArrowLeft />
          Voltar para equipes
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="min-h-48 flex-1 rounded-xl" />
        </div>
      ) : team ? (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">{team.name}</h1>
            {team.description ? (
              <p className="text-muted-foreground">{team.description}</p>
            ) : null}
            <TeamMemberAvatars members={team.members} />
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as TeamTab)}
            className="flex-1"
          >
            <TabsList>
              <TabsTrigger value="membros">Membros</TabsTrigger>
              <TabsTrigger value="apontamentos">Apontamentos</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="membros">
              <TeamMembersSection members={team.members} />
            </TabsContent>

            <TabsContent value="apontamentos">
              <TeamSectionPlaceholder
                title="Apontamentos"
                description="Os apontamentos de horas desta equipe aparecerão aqui."
              />
            </TabsContent>

            <TabsContent value="timeline">
              <TeamSectionPlaceholder
                title="Timeline"
                description="A linha do tempo de atividades desta equipe aparecerá aqui."
              />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Equipe não encontrada.</p>
      )}
    </div>
  )
}
