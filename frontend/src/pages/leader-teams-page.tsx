import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { BackButton } from '@/components/back-button'
import { TeamCard } from '@/components/team-card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-handler'
import type {
  SupervisorLeaderSummary,
  SupervisorLeaderTeamsResponse,
  TeamSummary,
} from '@/types/team'

/** Read-only list of one leader's teams, opened from the supervisor's leader cards. */
export function LeaderTeamsPage() {
  const { leaderId } = useParams<{ leaderId: string }>()
  const [leader, setLeader] = useState<SupervisorLeaderSummary | null>(null)
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!leaderId) {
      return
    }

    let cancelled = false
    setIsLoading(true)
    setNotFound(false)

    api<SupervisorLeaderTeamsResponse>(
      `/supervisor/leaders/${encodeURIComponent(leaderId)}/teams`,
      { toastOnError: false },
    )
      .then((data) => {
        if (!cancelled) {
          setLeader(data.leader)
          setTeams(data.teams)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotFound(true)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [leaderId])

  const groups = leader
    ? [...new Set(leader.costCenters.map((item) => item.group ?? item.costCenter))]
    : []

  return (
    <div className='flex flex-1 flex-col gap-6'>
      <div>
        <BackButton fallbackTo='/equipes' fallbackLabel='Líderes' />
      </div>

      {isLoading ? (
        <div className='flex flex-col gap-3'>
          <Skeleton className='h-8 w-56' />
          <Skeleton className='h-4 w-72' />
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className='h-32 rounded-xl' />
            ))}
          </div>
        </div>
      ) : notFound || !leader ? (
        <p className='text-sm text-muted-foreground'>
          Líder não encontrado ou fora da sua supervisão.
        </p>
      ) : (
        <>
          <div className='flex flex-col gap-2'>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='text-2xl font-bold'>Equipes de {leader.name}</h1>
              <span className='rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground'>
                Somente leitura
              </span>
            </div>
            {groups.length > 0 ? (
              <p className='text-sm text-muted-foreground'>{groups.join(' · ')}</p>
            ) : null}
          </div>

          {teams.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              Este líder não tem equipes ativas.
            </p>
          ) : (
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {teams.map((team) => (
                <TeamCard key={team.id} team={team} isAdmin={false} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
