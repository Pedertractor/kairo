import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import dayjs from 'dayjs'
import {
  Activity,
  BriefcaseBusiness,
  Clock3,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  ListTodo,
  Timer,
  Users,
} from 'lucide-react'

import {
  UsageBarList,
  UsageDonut,
  UsageLineChart,
} from '@/components/admin-usage-charts'
import { DateRangePicker } from '@/components/date-range-picker'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-handler'
import { fromDateKey, toDateKey } from '@/lib/date'
import { STATUS_LABELS } from '@/lib/card-status'
import { TASK_STATUS_LABELS } from '@/lib/task-status'
import { formatDateTime, formatDuration } from '@/lib/time-format'
import type { AdminDashboard } from '@/types/admin-dashboard'
import type { CardStatus } from '@/types/card'
import type { TaskStatus } from '@/types/task'

type UserFilterOption = {
  value: string
  label: string
}

const STATUS_COLORS: Record<string, string> = {
  TODO: '#94a3b8',
  IN_PROGRESS: '#38bdf8',
  PAUSED: '#fbbf24',
  DONE: '#34d399',
  CANCELED: '#fb7185',
}

const ITEM_KIND_LABELS = {
  activity: 'Atividade',
  task: 'Tarefa',
  project: 'Projeto',
} as const

function cardStatusLabel(status: string) {
  return STATUS_LABELS[status as CardStatus] ?? status
}

function taskStatusLabel(status: string) {
  return TASK_STATUS_LABELS[status as TaskStatus] ?? status
}

function defaultStartDate() {
  return toDateKey(dayjs().subtract(29, 'day').toDate())
}

export function AdminDashboardPage() {
  const [startDate, setStartDate] = useState(defaultStartDate)
  const [endDate, setEndDate] = useState(() => toDateKey(new Date()))
  const [selectedUser, setSelectedUser] = useState<UserFilterOption | null>(null)
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)

    try {
      const params = new URLSearchParams({ startDate, endDate })
      if (selectedUser) {
        params.set('userId', selectedUser.value)
      }

      const data = await api<AdminDashboard>(
        `/admin/dashboard?${params.toString()}`,
        { toastOnSuccess: false },
      )
      setDashboard(data)
    } finally {
      setIsLoading(false)
    }
  }, [endDate, selectedUser, startDate])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const userOptions = useMemo<UserFilterOption[]>(
    () =>
      (dashboard?.users ?? []).map((user) => ({
        value: user.id,
        label: user.name,
      })),
    [dashboard?.users],
  )

  useEffect(() => {
    if (!selectedUser || !dashboard) return

    const stillExists = dashboard.users.some(
      (user) => user.id === selectedUser.value,
    )
    if (!stillExists) {
      setSelectedUser(null)
    }
  }, [dashboard, selectedUser])

  const summary = dashboard?.summary
  const dailyPoints = (dashboard?.daily ?? []).map((day) => ({
    label: dayjs(day.date).format('DD/MM'),
    value: day.loggedSeconds,
    secondary: `${day.activeUserCount} pessoas`,
  }))

  return (
    <div className="flex flex-1 flex-col gap-6 pb-4">
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-indigo-800 to-cyan-500 p-4 text-white shadow-xl shadow-indigo-500/15 sm:p-6">
        <div className="absolute -top-16 -right-12 size-52 rounded-full bg-sky-300/20 blur-2xl" />
        <div className="absolute -bottom-24 left-1/3 size-64 rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-6">
          <div>
            <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <LayoutDashboard className="size-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Painel</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/80">
              Uso da aplicação em todas as equipes: horas, cadastros, ocupação e
              atividade por pessoa.
            </p>
          </div>

          <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <Label className="text-white/80">Período</Label>
              <DateRangePicker
                range={{
                  from: fromDateKey(startDate),
                  to: fromDateKey(endDate),
                }}
                displayFormat="dd-MM-yy"
                numberOfMonths={1}
                className="mt-1 w-full border-white/30 bg-white/95 text-foreground"
                onRangeChange={(nextRange) => {
                  if (!nextRange?.from || !nextRange.to) return
                  setStartDate(toDateKey(nextRange.from))
                  setEndDate(toDateKey(nextRange.to))
                }}
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor="admin-user-filter" className="text-white/80">
                Filtrar por nome
              </Label>
              <Combobox
                items={userOptions}
                value={selectedUser}
                onValueChange={setSelectedUser}
                itemToStringLabel={(item) => item.label}
                isItemEqualToValue={(a, b) => a.value === b.value}
              >
                <ComboboxInput
                  id="admin-user-filter"
                  className="mt-1 w-full border-white/30 bg-white/95 text-foreground"
                  placeholder="Buscar usuário..."
                  showClear
                />
                <ComboboxContent>
                  <ComboboxEmpty>Nenhum usuário encontrado.</ComboboxEmpty>
                  <ComboboxList>
                    {(item) => (
                      <ComboboxItem key={item.value} value={item}>
                        {item.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
          </div>
        </div>
      </section>

      {isLoading || !summary ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<Clock3 className="size-5" />}
              tone="cyan"
              label="Horas apontadas"
              value={formatDuration(summary.loggedSeconds)}
              hint={`${summary.timeEntryCount} apontamentos`}
            />
            <StatCard
              icon={<Gauge className="size-5" />}
              tone="pink"
              label="Ocupação"
              value={`${summary.utilizationPercent}%`}
              hint={`${formatDuration(summary.remainingSeconds)} disponíveis`}
            />
            <StatCard
              icon={<Users className="size-5" />}
              tone="violet"
              label="Usuários ativos"
              value={String(summary.activeUsers)}
              hint={`${summary.usersWithEntries} com apontamento · ${summary.absentUsers} ausentes`}
            />
            <StatCard
              icon={<Timer className="size-5" />}
              tone="orange"
              label="Timers em andamento"
              value={String(summary.runningTimerCount)}
              hint={`Média ${formatDuration(summary.averageEntrySeconds)} por apontamento`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MiniStat
              label="Equipes"
              value={summary.activeTeams}
              hint={`${summary.inactiveTeams} inativas`}
            />
            <MiniStat
              label="Projetos"
              value={summary.projectCount}
              hint={`${summary.createdProjects} criados no período`}
            />
            <MiniStat
              label="Atividades"
              value={summary.activityCount}
              hint={`${summary.createdActivities} criadas no período`}
            />
            <MiniStat
              label="Tarefas"
              value={summary.taskCount}
              hint={`${summary.createdTasks} criadas no período`}
            />
            <MiniStat
              label="Clientes"
              value={summary.clientCount}
              hint={`${summary.documentCount} documentos`}
            />
            <MiniStat
              label="Primeiro acesso pendente"
              value={summary.pendingFirstLogin}
              hint={`${summary.inactiveUsers} usuários inativos`}
            />
            <MiniStat
              label="Novos usuários"
              value={summary.createdUsers}
              hint="Cadastros no período"
            />
            <MiniStat
              label="Disponibilidade"
              value={formatDuration(summary.availabilitySeconds)}
              hint="8h 48min por dia, menos ausências"
            />
          </div>
        </>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border bg-card p-5 shadow-sm xl:col-span-2">
          <h2 className="font-semibold">Horas apontadas por dia</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Evolução do tempo registrado no período selecionado.
          </p>
          {isLoading ? (
            <Skeleton className="h-52 rounded-xl" />
          ) : (
            <UsageLineChart
              points={dailyPoints}
              emptyLabel="Nenhum apontamento neste período."
            />
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Tipo de apontamento</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Timer em tempo real versus lançamento manual.
          </p>
          {isLoading || !dashboard ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : (
            <UsageDonut
              slices={dashboard.entryTypes.map((entry) => ({
                label: entry.type === 'TIMER' ? 'Timer' : 'Manual',
                value: entry.count,
                color: entry.type === 'TIMER' ? '#22d3ee' : '#a78bfa',
              }))}
              emptyLabel="Nenhum apontamento neste período."
              centerLabel="registros"
              centerValue={String(summary?.timeEntryCount ?? 0)}
            />
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Tempo por pessoa</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Quem mais apontou horas no período. Busque pelo nome no filtro
            acima para detalhar uma pessoa.
          </p>
          {isLoading || !dashboard ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : (
            <UsageBarList
              emptyLabel="Nenhum apontamento de usuários neste período."
              items={dashboard.topUsers.map((user) => ({
                label: user.name,
                value: user.loggedSeconds,
                hint: `${user.timeEntryCount} registros · ${user.utilizationPercent}% de ocupação`,
              }))}
            />
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Tempo por equipe</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Distribuição de horas entre as equipes da unidade.
          </p>
          {isLoading || !dashboard ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : (
            <UsageBarList
              emptyLabel="Nenhuma equipe com apontamento neste período."
              items={(dashboard.teams.some((team) => team.loggedSeconds > 0)
                ? dashboard.teams.filter((team) => team.loggedSeconds > 0)
                : dashboard.teams
              )
                .slice(0, 12)
                .map((team) => ({
                  label: team.name,
                  value: team.loggedSeconds,
                  hint: `${team.memberCount} membros · ${team.projectCount} projetos · ${team.activityCount} atividades`,
                }))}
            />
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Users className="size-4 text-violet-500" />
            <h2 className="font-semibold">Usuários por perfil</h2>
          </div>
          {isLoading || !dashboard ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : (
            <UsageDonut
              slices={dashboard.usersByRole.map((item, index) => ({
                label: item.label,
                value: item.count,
                color: ['#818cf8', '#38bdf8', '#34d399'][index],
              }))}
              emptyLabel="Nenhum usuário."
              centerLabel="usuários"
              centerValue={String(summary?.userCount ?? 0)}
            />
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BriefcaseBusiness className="size-4 text-amber-500" />
            <h2 className="font-semibold">Usuários por unidade</h2>
          </div>
          {isLoading || !dashboard ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : (
            <UsageDonut
              slices={dashboard.usersByUnit.map((item, index) => ({
                label: item.label,
                value: item.count,
                color: ['#fbbf24', '#22d3ee'][index],
              }))}
              emptyLabel="Nenhum usuário."
              centerLabel="usuários"
              centerValue={String(summary?.userCount ?? 0)}
            />
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FolderKanban className="size-4 text-indigo-500" />
            <h2 className="font-semibold">Status dos projetos</h2>
          </div>
          {isLoading || !dashboard ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : (
            <UsageDonut
              slices={dashboard.projectStatus.map((item) => ({
                label: cardStatusLabel(item.status),
                value: item.count,
                color: STATUS_COLORS[item.status],
              }))}
              emptyLabel="Nenhum projeto."
              centerLabel="projetos"
              centerValue={String(summary?.projectCount ?? 0)}
            />
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="size-4 text-emerald-500" />
            <h2 className="font-semibold">Status das atividades</h2>
          </div>
          {isLoading || !dashboard ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : (
            <UsageBarList
              valueFormatter={(value) => String(value)}
              emptyLabel="Nenhuma atividade."
              items={dashboard.activityStatus.map((item) => ({
                label: cardStatusLabel(item.status),
                value: item.count,
              }))}
            />
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ListTodo className="size-4 text-sky-500" />
            <h2 className="font-semibold">Status das tarefas</h2>
          </div>
          {isLoading || !dashboard ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : (
            <UsageBarList
              valueFormatter={(value) => String(value)}
              emptyLabel="Nenhuma tarefa."
              items={dashboard.taskStatus.map((item) => ({
                label: taskStatusLabel(item.status),
                value: item.count,
              }))}
            />
          )}
        </section>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="font-semibold">Timers em andamento</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Quem está com o cronômetro ligado agora.
        </p>
        {isLoading ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : !dashboard || dashboard.runningTimers.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum timer ativo no momento.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dashboard.runningTimers.map((timer) => (
              <article key={timer.id} className="rounded-xl border p-4">
                <p className="truncate font-semibold">{timer.userName}</p>
                <p className="mt-1 truncate text-sm">{timer.itemTitle}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {ITEM_KIND_LABELS[timer.itemKind]} · desde{' '}
                  {formatDateTime(timer.startedAt)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({
  icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: ReactNode
  tone: 'cyan' | 'pink' | 'violet' | 'orange'
  label: string
  value: string
  hint: string
}) {
  const tones = {
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-100',
    pink: 'border-pink-200 bg-pink-50 text-pink-950 dark:border-pink-900 dark:bg-pink-950/40 dark:text-pink-100',
    violet:
      'border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100',
    orange:
      'border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-100',
  }

  return (
    <div className={`rounded-2xl border p-5 ${tones[tone]}`}>
      <div className="mb-3 opacity-80">{icon}</div>
      <p className="text-xs font-semibold tracking-wide uppercase opacity-60">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs opacity-60">{hint}</p>
    </div>
  )
}

function MiniStat({
  label,
  value,
  hint,
}: {
  label: string
  value: number | string
  hint: string
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
