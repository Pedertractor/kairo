import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-handler'
import type { TeamResponse } from '@/types/team'

function formatMemberCount(count: number) {
  return count === 1 ? '1 membro' : `${count} membros`
}

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const [team, setTeam] = useState<TeamResponse['team'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
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
          <Skeleton className="h-4 w-24" />
        </div>
      ) : team ? (
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">{team.name}</h1>
          {team.description ? (
            <p className="text-muted-foreground">{team.description}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {formatMemberCount(team.memberCount)}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Equipe não encontrada.</p>
      )}

      <div className="min-h-48 flex-1 rounded-xl border border-dashed bg-muted/30" />
    </div>
  )
}
