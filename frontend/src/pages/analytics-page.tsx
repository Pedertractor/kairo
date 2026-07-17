import { useCallback, useEffect, useState } from 'react'
import {
  BarChart3,
  Clock3,
  Gauge,
  Sparkles,
  TimerReset,
  Users,
} from 'lucide-react'

import { DatePicker } from '@/components/date-picker'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-handler'
import { fromDateKey, toDateKey } from '@/lib/date'
import { formatDuration } from '@/lib/time-format'
import type { AnalyticsDashboard } from '@/types/analytics'

const ALL = 'all'

function utilizationColor(percent: number) {
  if (percent >= 100) return 'from-fuchsia-500 to-pink-500'
  if (percent >= 75) return 'from-emerald-400 to-cyan-500'
  if (percent >= 40) return 'from-amber-400 to-orange-500'
  return 'from-violet-500 to-indigo-500'
}

export function AnalyticsPage() {
  const [date, setDate] = useState(toDateKey(new Date()))
  const [teamId, setTeamId] = useState(ALL)
  const [employeeId, setEmployeeId] = useState(ALL)
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)

    try {
      const params = new URLSearchParams({ date })
      if (teamId !== ALL) params.set('teamId', teamId)
      if (employeeId !== ALL) params.set('employeeId', employeeId)

      const data = await api<AnalyticsDashboard>(
        `/analytics?${params.toString()}`,
      )
      setDashboard(data)
    } finally {
      setIsLoading(false)
    }
  }, [date, employeeId, teamId])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const summary = dashboard?.summary

  return (
    <div className='flex flex-1 flex-col gap-6 pb-4'>
      <section className='relative overflow-hidden rounded-3xl bg-linear-to-br from-violet-600 via-fuchsia-500 to-orange-400 p-6 text-white shadow-xl shadow-fuchsia-500/15'>
        <div className='absolute -top-16 -right-12 size-52 rounded-full bg-cyan-300/30 blur-2xl' />
        <div className='absolute -bottom-24 left-1/3 size-64 rounded-full bg-yellow-300/25 blur-3xl' />
        <div className='relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between'>
          <div>
            <div className='mb-3 flex size-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur'>
              <BarChart3 className='size-6' />
            </div>
            <h1 className='text-3xl font-bold tracking-tight'>Analytics</h1>
            <p className='mt-1 max-w-xl text-sm text-white/80'>
              Disponibilidade e apontamentos diários das suas equipes.
            </p>
          </div>

          <div className='grid gap-3 sm:grid-cols-3'>
            <div>
              <Label className='text-white/80'>Dia</Label>
              <DatePicker
                date={fromDateKey(date)}
                displayFormat='dd-MM-yy'
                className='mt-1 w-full border-white/30 bg-white/95 text-foreground sm:w-44'
                onDateChange={(nextDate) => {
                  if (nextDate) setDate(toDateKey(nextDate))
                }}
              />
            </div>
            <div>
              <Label className='text-white/80'>Equipe</Label>
              <Select
                value={teamId}
                onValueChange={(value) => {
                  setTeamId(value ?? ALL)
                  setEmployeeId(ALL)
                }}
              >
                <SelectTrigger className='mt-1 w-full border-white/30 bg-white/95 text-foreground sm:w-48'>
                  <SelectValue>
                    {(value) =>
                      value === ALL
                        ? 'Todas as equipes'
                        : dashboard?.teams.find((team) => team.id === value)
                            ?.name
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as equipes</SelectItem>
                  {dashboard?.teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='text-white/80'>Funcionário</Label>
              <Select
                value={employeeId}
                onValueChange={(value) => setEmployeeId(value ?? ALL)}
              >
                <SelectTrigger className='mt-1 w-full border-white/30 bg-white/95 text-foreground sm:w-48'>
                  <SelectValue>
                    {(value) =>
                      value === ALL
                        ? 'Todos os funcionários'
                        : dashboard?.employees.find(
                            (employee) => employee.id === value,
                          )?.name
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os funcionários</SelectItem>
                  {dashboard?.employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {isLoading || !summary ? (
        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className='h-32 rounded-2xl' />
          ))}
        </div>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          <div className='rounded-2xl border border-violet-200 bg-violet-50 p-5 text-violet-950 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100'>
            <Users className='mb-4 size-6 text-violet-500' />
            <p className='text-xs font-semibold tracking-wide uppercase opacity-60'>
              Disponibilidade
            </p>
            <p className='mt-1 text-2xl font-bold'>
              {formatDuration(summary.availabilitySeconds)}
            </p>
            <p className='mt-1 text-xs opacity-60'>8h 48min por funcionário</p>
          </div>
          <div className='rounded-2xl border border-cyan-200 bg-cyan-50 p-5 text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-100'>
            <Clock3 className='mb-4 size-6 text-cyan-500' />
            <p className='text-xs font-semibold tracking-wide uppercase opacity-60'>
              Horas apontadas
            </p>
            <p className='mt-1 text-2xl font-bold'>
              {formatDuration(summary.loggedSeconds)}
            </p>
            <p className='mt-1 text-xs opacity-60'>Soma dos time entries</p>
          </div>
          <div className='rounded-2xl border border-orange-200 bg-orange-50 p-5 text-orange-950 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-100'>
            <TimerReset className='mb-4 size-6 text-orange-500' />
            <p className='text-xs font-semibold tracking-wide uppercase opacity-60'>
              Apontamentos
            </p>
            <p className='mt-1 text-2xl font-bold'>
              {summary.timeEntryCount}
            </p>
            <p className='mt-1 text-xs opacity-60'>Registros no dia</p>
          </div>
          <div className='rounded-2xl border border-pink-200 bg-pink-50 p-5 text-pink-950 dark:border-pink-900 dark:bg-pink-950/40 dark:text-pink-100'>
            <Gauge className='mb-4 size-6 text-pink-500' />
            <p className='text-xs font-semibold tracking-wide uppercase opacity-60'>
              Ocupação
            </p>
            <p className='mt-1 text-2xl font-bold'>
              {summary.utilizationPercent}%
            </p>
            <p className='mt-1 text-xs opacity-60'>
              {formatDuration(summary.remainingSeconds)} disponíveis
            </p>
          </div>
        </div>
      )}

      <section className='rounded-2xl border bg-card p-5 shadow-sm'>
        <div className='mb-5 flex items-center gap-3'>
          <div className='flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-cyan-400 to-blue-600 text-white'>
            <Sparkles className='size-5' />
          </div>
          <div>
            <h2 className='font-semibold'>Disponibilidade por funcionário</h2>
            <p className='text-sm text-muted-foreground'>
              Comparativo entre a jornada disponível e as horas apontadas.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className='space-y-3'>
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className='h-28 rounded-2xl' />
            ))}
          </div>
        ) : dashboard?.rows.length === 0 ? (
          <div className='rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground'>
            Nenhum funcionário encontrado para estes filtros.
          </div>
        ) : (
          <div className='grid gap-4 lg:grid-cols-2'>
            {dashboard?.rows.map((row) => (
              <article
                key={row.employeeId}
                className='overflow-hidden rounded-2xl border bg-linear-to-br from-background to-muted/40 p-5'
              >
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <h3 className='font-semibold'>{row.employeeName}</h3>
                    <p className='text-xs text-muted-foreground'>
                      {row.teamNames.join(' · ')}
                    </p>
                  </div>
                  <span className='rounded-full bg-foreground px-3 py-1 text-xs font-bold text-background'>
                    {row.utilizationPercent}%
                  </span>
                </div>

                <div className='mt-5 h-3 overflow-hidden rounded-full bg-muted'>
                  <div
                    className={`h-full rounded-full bg-linear-to-r ${utilizationColor(row.utilizationPercent)}`}
                    style={{
                      width: `${Math.min(100, row.utilizationPercent)}%`,
                    }}
                  />
                </div>

                <div className='mt-4 grid grid-cols-3 gap-2 text-center'>
                  <div className='rounded-xl bg-violet-500/10 p-3'>
                    <p className='text-[10px] font-semibold text-violet-600 uppercase dark:text-violet-300'>
                      Disponível
                    </p>
                    <p className='mt-1 text-sm font-bold'>
                      {formatDuration(row.availabilitySeconds)}
                    </p>
                  </div>
                  <div className='rounded-xl bg-cyan-500/10 p-3'>
                    <p className='text-[10px] font-semibold text-cyan-600 uppercase dark:text-cyan-300'>
                      Apontado
                    </p>
                    <p className='mt-1 text-sm font-bold'>
                      {formatDuration(row.loggedSeconds)}
                    </p>
                  </div>
                  <div className='rounded-xl bg-orange-500/10 p-3'>
                    <p className='text-[10px] font-semibold text-orange-600 uppercase dark:text-orange-300'>
                      Registros
                    </p>
                    <p className='mt-1 text-sm font-bold'>
                      {row.timeEntryCount}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
