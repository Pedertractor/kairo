import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronDown, RefreshCw, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-handler'
import { formatLoggedDuration } from '@/lib/format-duration'
import { filterInfractionsByLeader } from '@/lib/infraction-filters'
import type { InfractionLeader, InfractionPerson, InfractionsReport } from '@/types/infraction'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const UNIT_LABELS: Record<string, string> = { TRACTOR: 'Tractor', PEDERTRACTOR: 'Pedertractor' }
const TYPE_LABELS: Record<string, string> = {
  EXCESS: 'Excesso', BELOW_70: 'Abaixo de 70%', NONE: 'Sem apontamento',
}
const TYPE_STYLES: Record<string, string> = {
  EXCESS: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  BELOW_70: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  NONE: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
}
const percentFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

function percent(value: number | null) {
  if (value === null) return '—'
  return `${percentFormatter.format(value)}%`
}

function PersonInfractions({ person }: { person: InfractionPerson }) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="min-w-0 rounded-xl border bg-card">
      <CollapsibleTrigger
        aria-label={`Infrações de ${person.name}, ${UNIT_LABELS[person.unit] ?? person.unit}, cartão ${person.cardNumber}`}
        className="flex w-full items-center gap-3 rounded-xl p-4 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
      >
        <div className="min-w-0 flex-1">
          <h2 className="break-words font-semibold">{person.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {UNIT_LABELS[person.unit] ?? person.unit} · Cartão {person.cardNumber}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-medium">
              {person.infractionCount} {person.infractionCount === 1 ? 'infração' : 'infrações'}
            </span>
            <span className="text-muted-foreground">
              Média mensal: <span className="font-medium text-foreground">{percent(person.monthlyAverage.percent)}</span>
            </span>
          </div>
        </div>
        <ChevronDown aria-hidden="true" className={`size-5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t p-4 sm:p-5">
          <dl className="mb-5 grid gap-3 rounded-lg bg-muted/50 p-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Horas trabalhadas no mês</dt>
              <dd className="mt-1 font-medium tabular-nums">{formatLoggedDuration(person.monthlyAverage.workedSeconds)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Horas apontadas no mês</dt>
              <dd className="mt-1 font-medium tabular-nums">{formatLoggedDuration(person.monthlyAverage.loggedSeconds)}</dd>
            </div>
          </dl>
          {person.infractions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma infração para este colaborador no período.</p>
          ) : (
            <ul className="space-y-3" aria-label={`Ocorrências de ${person.name}`}>
              {person.infractions.map((infraction, index) => (
                <li key={`${infraction.date}:${infraction.type}:${index}`} className="rounded-lg border p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <time dateTime={infraction.date} className="text-sm font-semibold">
                      {infraction.date.split('-').reverse().join('/')}
                    </time>
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${TYPE_STYLES[infraction.type] ?? 'bg-muted text-muted-foreground'}`}>
                      {TYPE_LABELS[infraction.type] ?? infraction.type}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-muted-foreground">Horas trabalhadas</dt>
                      <dd className="mt-1 font-medium tabular-nums">{formatLoggedDuration(infraction.workedSeconds)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Horas apontadas</dt>
                      <dd className="mt-1 font-medium tabular-nums">{formatLoggedDuration(infraction.loggedSeconds)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Percentual apontado</dt>
                      <dd className="mt-1 font-medium tabular-nums">{percent(infraction.percent)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function InfractionsPage() {
  const [month, setMonth] = useState(() => String(new Date().getMonth() + 1))
  const [year, setYear] = useState(() => String(new Date().getFullYear()))
  const [report, setReport] = useState<InfractionsReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [leaders, setLeaders] = useState<InfractionLeader[]>([])
  const [leaderId, setLeaderId] = useState('all')
  const [leadersState, setLeadersState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [leadersAttempt, setLeadersAttempt] = useState(0)
  const validYear = /^\d+$/.test(year) && Number.isSafeInteger(Number(year)) && Number(year) > 0
  const period = `${year}-${month}`
  const selectedLeader = leaders.find((leader) => leader.id === leaderId) ?? null
  const visibleReport = report ? filterInfractionsByLeader(report, selectedLeader) : null

  useEffect(() => {
    let current = true
    const controller = new AbortController()
    setLeadersState('loading')
    void api<{ leaders: InfractionLeader[] }>('/infractions/leaders', {
      signal: controller.signal, toastOnError: false, toastOnSuccess: false,
    }).then((data) => {
      if (!current) return
      setLeaders(data.leaders)
      setLeaderId((value) => value === 'all' || data.leaders.some((leader) => leader.id === value) ? value : 'all')
      setLeadersState('ready')
    }).catch(() => { if (current) setLeadersState('error') })
    return () => { current = false; controller.abort() }
  }, [leadersAttempt])

  useEffect(() => {
    let current = true
    const controller = new AbortController()
    setReport(null)
    setError(false)
    setIsLoading(validYear)

    if (validYear) {
      const params = new URLSearchParams({ month, year })
      void api<InfractionsReport>(`/infractions?${params}`, {
        signal: controller.signal, toastOnError: false, toastOnSuccess: false,
      }).then((data) => {
        if (current) setReport(data)
      }).catch(() => {
        if (current) setError(true)
      }).finally(() => {
        if (current) setIsLoading(false)
      })
    }

    return () => {
      current = false
      controller.abort()
    }
  }, [month, year, validYear, attempt])

  return (
    <div className="flex min-w-0 flex-col gap-6 pb-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Infrações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Confira as infrações de apontamento dos colaboradores registradas no P5.</p>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="grid w-full gap-2 sm:w-72">
          <Label htmlFor="infractions-leader">Líder</Label>
          <Select value={leaderId} onValueChange={(value) => { if (value) setLeaderId(value) }} disabled={leadersState !== 'ready'} items={[
            { value: 'all', label: 'Todos os líderes' },
            ...leaders.map((leader) => ({ value: leader.id, label: leader.name })),
          ]}>
            <SelectTrigger id="infractions-leader" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os líderes</SelectItem>
              {leaders.map((leader) => <SelectItem key={leader.id} value={leader.id}>{leader.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Colaboradores das equipes ativas administradas pelo líder.</p>
          {leadersState === 'error' && <div role="alert" className="text-sm text-destructive">
            Não foi possível carregar os líderes.
            <Button variant="link" onClick={() => setLeadersAttempt((value) => value + 1)}>Tentar carregar líderes novamente</Button>
          </div>}
        </div>
        <div className="grid w-full gap-2 sm:w-48">
          <Label htmlFor="infractions-month">Mês</Label>
          <Select value={month} onValueChange={(value) => { if (value) setMonth(value) }} items={MONTHS.map((label, index) => ({ value: String(index + 1), label }))}>
            <SelectTrigger id="infractions-month" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((label, index) => <SelectItem key={label} value={String(index + 1)}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-full gap-2 sm:w-32">
          <Label htmlFor="infractions-year">Ano</Label>
          <Input id="infractions-year" type="number" min="1" step="1" value={year} onChange={(event) => setYear(event.target.value)} aria-invalid={!validYear} aria-describedby={!validYear ? 'infractions-year-error' : undefined} />
          {!validYear && <p id="infractions-year-error" className="text-xs text-destructive">Informe um ano inteiro positivo.</p>}
        </div>
      </div>

      <div aria-live="polite" aria-busy={isLoading}>
        {isLoading ? (
          <div className="space-y-4" aria-label="Carregando infrações">
            <span className="sr-only">Carregando infrações...</span>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : error ? (
          <div role="alert" className="rounded-xl border p-6 text-center">
            <AlertTriangle aria-hidden="true" className="mx-auto mb-3 size-6 text-muted-foreground" />
            <p className="font-medium">Não foi possível carregar as infrações.</p>
            <p className="mt-1 text-sm text-muted-foreground">Tente novamente em alguns instantes.</p>
            <Button variant="outline" className="mt-4" onClick={() => setAttempt((value) => value + 1)}>
              <RefreshCw aria-hidden="true" /> Tentar novamente
            </Button>
          </div>
        ) : visibleReport ? (
          <div className="space-y-5">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border bg-card p-5">
                <dt className="flex items-center gap-2 text-sm text-muted-foreground"><Users aria-hidden="true" className="size-4" />Colaboradores</dt>
                <dd className="mt-2 text-3xl font-semibold tabular-nums">{visibleReport.totalPeople}</dd>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <dt className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle aria-hidden="true" className="size-4" />Infrações no período</dt>
                <dd className="mt-2 text-3xl font-semibold tabular-nums">{visibleReport.totalInfractions}</dd>
              </div>
            </dl>
            {visibleReport.people.length === 0 ? (
              <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{selectedLeader ? 'Nenhuma infração encontrada para este líder no período selecionado.' : 'Nenhuma infração encontrada para o período selecionado.'}</p>
            ) : (
              <div className="space-y-3">
                {visibleReport.people.map((person) => <PersonInfractions key={JSON.stringify([period, person.unit, person.cardNumber])} person={person} />)}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
