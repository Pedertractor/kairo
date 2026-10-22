import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Clock3, LogOut, Pause, Play, Search } from 'lucide-react'
import { ActiveTimerProvider } from '@/contexts/active-timer-context'
import { ActiveTimerBar } from '@/components/active-timer-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KairoBrand } from '@/components/kairo-brand'
import { useAuth } from '@/hooks/use-auth'
import { useActiveTimer } from '@/hooks/use-active-timer'
import { useProductionIdle } from '@/hooks/use-production-idle'
import { api } from '@/lib/api-handler'
import { filterProductionActivities, isProductionActivityClosed, sortProductionActivities } from '@/lib/production-idle'
import { cn } from '@/lib/utils'

interface ProductionActivity {
  id: string
  title: string
  teamId: string
  status: string
  lastWorkedAt: string | null
  team: { name: string }
}

function ProductionActivities() {
  const { user, logout } = useAuth()
  const remaining = useProductionIdle()
  const { activeTimer, startTimer, pauseTimer, isStarting, isPausing, isActivityActive } = useActiveTimer()
  const [activities, setActivities] = useState<ProductionActivity[]>([])
  const [recentStarts, setRecentStarts] = useState<Record<string, string>>({})
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    void api<{ activities: ProductionActivity[] }>('/production/activities', { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setActivities(data.activities) })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])
  const activeActivityId = activeTimer?.activity?.id ?? null
  const activeStartedAt = activeTimer?.timeEntry.startedAt
  useEffect(() => {
    if (activeActivityId && activeStartedAt) {
      setRecentStarts((current) => ({ ...current, [activeActivityId]: activeStartedAt }))
    }
  }, [activeActivityId, activeStartedAt])
  const filtered = sortProductionActivities(filterProductionActivities(activities, name), activeActivityId, recentStarts)
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-4">
        <KairoBrand />
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted-foreground sm:block">{user?.name}</span>
          <span role="timer" aria-label="Tempo para sair por inatividade"
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs tabular-nums ${remaining <= 5 ? 'border-destructive text-destructive' : 'text-muted-foreground'}`}>
            <Clock3 className="size-3.5" /> Sair em {remaining}s
          </span>
          <Button variant="outline" size="sm" onClick={() => void logout()}><LogOut /> Sair</Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 pb-28">
        <h1 className="mb-6 text-2xl font-semibold">Atividades</h1>
        <div className="relative mb-6 max-w-lg">
          <Search className="absolute top-3 left-3 size-4 text-muted-foreground" />
          <Input aria-label="Filtrar atividades por nome" placeholder="Filtrar por nome da atividade"
            value={name} onChange={(event) => setName(event.target.value)} className="pl-9" />
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Carregando atividades...</p> : error ?
          <p role="alert" className="text-sm text-destructive">Não foi possível carregar as atividades. Entre novamente para tentar.</p> :
          filtered.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma atividade encontrada.</p> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((activity) => {
                const active = isActivityActive(activity.id)
                const closed = isProductionActivityClosed(activity.status)
                return <article key={activity.id} data-activity-id={activity.id}
                  data-state={closed ? 'closed' : active ? 'active' : 'open'}
                  className={cn('flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm transition-colors',
                    closed && 'bg-muted/40 text-muted-foreground opacity-55 shadow-none',
                    active && !closed && 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/30 dark:border-blue-400 dark:bg-blue-950/40')}>
                  <div className="flex-1">
                    <p className="mb-2 text-xs text-muted-foreground">{activity.team.name}</p>
                    <h2 className="font-medium break-words">{activity.title}</h2>
                  </div>
                  {active ? (
                    <Button variant="outline" disabled={isStarting || isPausing}
                      onClick={() => void pauseTimer().catch(() => {})}>
                      <Pause className="size-4" /> {isPausing ? 'Pausando...' : 'Pausar'}
                    </Button>
                  ) : (
                    <Button disabled={isStarting || isPausing || closed} onClick={() => void startTimer(activity.teamId, activity.id).catch(() => {})}>
                      <Play className="size-4" /> {closed ? 'Encerrada' : 'Iniciar'}
                    </Button>
                  )}
                </article>
              })}
            </div>
          )}
      </main>
      <ActiveTimerBar production />
    </div>
  )
}

export function ProductionPage() {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/producao" replace />
  if (!user?.production) return <Navigate to="/" replace />
  return <ActiveTimerProvider key={user.id}><ProductionActivities /></ActiveTimerProvider>
}
