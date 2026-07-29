import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Clock3,
  FolderKanban,
  Gauge,
  Sparkles,
  TimerReset,
  Users,
  X,
} from 'lucide-react';

import { DatePicker } from '@/components/date-picker';
import { DateRangePicker } from '@/components/date-range-picker';
import { TeamDayTimeline } from '@/components/team-day-timeline';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-handler';
import { fromDateKey, toDateKey } from '@/lib/date';
import { formatDuration } from '@/lib/time-format';
import type { AnalyticsDashboard } from '@/types/analytics';
import type {
  TeamDayDashboard,
  TeamDayTimelineBlock,
} from '@/types/time-entry';

const ALL = 'all';

interface SelectedEmployeeTimeline {
  employeeId: string;
  employeeName: string;
  teamId: string;
}

function utilizationColor(percent: number) {
  if (percent >= 100) return 'from-fuchsia-500 to-pink-500';
  if (percent >= 75) return 'from-emerald-400 to-cyan-500';
  if (percent >= 40) return 'from-amber-400 to-orange-500';
  return 'from-violet-500 to-indigo-500';
}

function getInclusiveDayCount(startDate: string, endDate: string): number {
  const start = fromDateKey(startDate).getTime();
  const end = fromDateKey(endDate).getTime();
  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

export function AnalyticsPage() {
  const todayKey = toDateKey(new Date());
  const [startDate, setStartDate] = useState(todayKey);
  const [endDate, setEndDate] = useState(todayKey);
  const [timelineDate, setTimelineDate] = useState(todayKey);
  const [teamId, setTeamId] = useState(ALL);
  const [employeeId, setEmployeeId] = useState(ALL);
  const [projectId, setProjectId] = useState(ALL);
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeline, setSelectedTimeline] =
    useState<SelectedEmployeeTimeline | null>(null);
  const [timelineBlocks, setTimelineBlocks] = useState<TeamDayTimelineBlock[]>(
    [],
  );
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const timelineSectionRef = useRef<HTMLElement>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (teamId !== ALL) params.set('teamId', teamId);
      if (employeeId !== ALL) params.set('employeeId', employeeId);
      if (projectId !== ALL) params.set('projectId', projectId);

      const data = await api<AnalyticsDashboard>(
        `/analytics?${params.toString()}`,
      );
      setDashboard({
        ...data,
        projects: data.projects ?? [],
        selectedProject: data.selectedProject
          ? {
              ...data.selectedProject,
              teamId:
                data.selectedProject.teamId ??
                data.projects?.find(
                  (project) => project.id === data.selectedProject?.id,
                )?.teamId ??
                '',
            }
          : null,
        rows: (data.rows ?? []).map((row) => ({
          ...row,
          teamId: row.teamId ?? data.teams?.[0]?.id ?? '',
        })),
      });
    } finally {
      setIsLoading(false);
    }
  }, [endDate, employeeId, projectId, startDate, teamId]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const loadEmployeeTimeline = useCallback(async () => {
    if (!selectedTimeline) {
      setTimelineBlocks([]);
      return;
    }

    setIsLoadingTimeline(true);

    try {
      const data = await api<TeamDayDashboard>(
        `/teams/${selectedTimeline.teamId}/time-entries/day?date=${encodeURIComponent(timelineDate)}`,
        { toastOnError: false },
      );
      setTimelineBlocks(
        data.blocks.filter(
          (block) => block.userId === selectedTimeline.employeeId,
        ),
      );
    } catch {
      setTimelineBlocks([]);
    } finally {
      setIsLoadingTimeline(false);
    }
  }, [selectedTimeline, timelineDate]);

  useEffect(() => {
    void loadEmployeeTimeline();
  }, [loadEmployeeTimeline]);

  const previousTimelineEmployeeIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedTimeline) {
      previousTimelineEmployeeIdRef.current = null;
      return;
    }

    if (previousTimelineEmployeeIdRef.current === selectedTimeline.employeeId) {
      return;
    }

    previousTimelineEmployeeIdRef.current = selectedTimeline.employeeId;
    timelineSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [selectedTimeline]);

  function openEmployeeTimeline(
    nextEmployeeId: string,
    employeeName: string,
    nextTeamId: string,
  ) {
    if (!nextTeamId) {
      return;
    }

    setTimelineDate(endDate);
    setSelectedTimeline({
      employeeId: nextEmployeeId,
      employeeName,
      teamId: nextTeamId,
    });
  }

  const summary = dashboard?.summary;
  const selectedProject = dashboard?.selectedProject;
  const selectedProjectTeamId = selectedProject?.teamId ?? '';
  const periodDayCount = getInclusiveDayCount(startDate, endDate);

  return (
    <div className='flex flex-1 flex-col gap-6 pb-4'>
      <section className='relative overflow-hidden rounded-3xl bg-linear-to-br from-blue-800 via-blue-600 to-cyan-500 p-4 text-white shadow-xl shadow-blue-500/15 sm:p-6'>
        <div className='absolute -top-16 -right-12 size-52 rounded-full bg-sky-300/30 blur-2xl' />
        <div className='absolute -bottom-24 left-1/3 size-64 rounded-full bg-cyan-200/20 blur-3xl' />
        <div className='relative flex flex-col gap-6'>
          <div>
            <div className='mb-3 flex size-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur'>
              <BarChart3 className='size-6' />
            </div>
            <h1 className='text-3xl font-bold tracking-tight'>Analytics</h1>
            <p className='mt-1 max-w-xl text-sm text-white/80'>
              Disponibilidade e apontamentos das suas equipes por período.
            </p>
          </div>

          <div className='grid w-full min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            <div className='min-w-0'>
              <Label className='text-white/80'>Período</Label>
              <DateRangePicker
                range={{
                  from: fromDateKey(startDate),
                  to: fromDateKey(endDate),
                }}
                displayFormat='dd-MM-yy'
                numberOfMonths={1}
                className='mt-1 w-full border-white/30 bg-white/95 text-foreground'
                onRangeChange={(nextRange) => {
                  if (!nextRange?.from || !nextRange.to) return;
                  setStartDate(toDateKey(nextRange.from));
                  setEndDate(toDateKey(nextRange.to));
                }}
              />
            </div>
            <div className='min-w-0'>
              <Label className='text-white/80'>Equipe</Label>
              <Select
                value={teamId}
                onValueChange={(value) => {
                  setTeamId(value ?? ALL);
                  setEmployeeId(ALL);
                  setProjectId(ALL);
                  setSelectedTimeline(null);
                }}
              >
                <SelectTrigger className='mt-1 w-full min-w-0 border-white/30 bg-white/95 text-foreground'>
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
            <div className='min-w-0'>
              <Label className='text-white/80'>Projeto</Label>
              <Select
                value={projectId}
                onValueChange={(value) => setProjectId(value ?? ALL)}
              >
                <SelectTrigger className='mt-1 w-full min-w-0 border-white/30 bg-white/95 text-foreground'>
                  <SelectValue>
                    {(value) =>
                      value === ALL
                        ? 'Todos os projetos'
                        : dashboard?.projects?.find(
                            (project) => project.id === value,
                          )?.title
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os projetos</SelectItem>
                  {(dashboard?.projects ?? []).map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title} · {project.teamName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='min-w-0'>
              <Label className='text-white/80'>Funcionário</Label>
              <Select
                value={employeeId}
                onValueChange={(value) => setEmployeeId(value ?? ALL)}
              >
                <SelectTrigger className='mt-1 w-full min-w-0 border-white/30 bg-white/95 text-foreground'>
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
            <p className='mt-1 text-xs opacity-60'>
              {periodDayCount === 1
                ? '8h 48min por funcionário'
                : `8h 48min × ${periodDayCount} dias por funcionário`}
            </p>
          </div>
          <div className='rounded-2xl border border-cyan-200 bg-cyan-50 p-5 text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-100'>
            <Clock3 className='mb-4 size-6 text-cyan-500' />
            <p className='text-xs font-semibold tracking-wide uppercase opacity-60'>
              Horas apontadas
            </p>
            <p className='mt-1 text-2xl font-bold'>
              {formatDuration(summary.loggedSeconds)}
            </p>
            <p className='mt-1 text-xs opacity-60'>Soma dos apontamentos</p>
          </div>
          <div className='rounded-2xl border border-orange-200 bg-orange-50 p-5 text-orange-950 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-100'>
            <TimerReset className='mb-4 size-6 text-orange-500' />
            <p className='text-xs font-semibold tracking-wide uppercase opacity-60'>
              Apontamentos
            </p>
            <p className='mt-1 text-2xl font-bold'>{summary.timeEntryCount}</p>
            <p className='mt-1 text-xs opacity-60'>Registros no período</p>
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

      {selectedProject ? (
        <section className='overflow-hidden rounded-2xl border border-indigo-200 bg-linear-to-br from-indigo-50 via-background to-fuchsia-50 p-5 shadow-sm dark:border-indigo-900 dark:from-indigo-950/30 dark:to-fuchsia-950/20'>
          <div className='flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between'>
            <div className='flex items-center gap-3'>
              <div className='flex size-11 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/20'>
                <FolderKanban className='size-5' />
              </div>
              <div>
                <p className='text-xs font-semibold tracking-wide text-indigo-600 uppercase dark:text-indigo-300'>
                  Projeto selecionado
                </p>
                <h2 className='text-xl font-bold'>{selectedProject.title}</h2>
                <p className='text-xs text-muted-foreground'>
                  {selectedProject.teamName} · horas acumuladas
                </p>
              </div>
            </div>

            <div className='grid grid-cols-3 gap-2 text-center'>
              <div className='rounded-xl bg-indigo-500/10 px-4 py-3'>
                <p className='text-[10px] font-semibold text-indigo-600 uppercase dark:text-indigo-300'>
                  Estimado
                </p>
                <p className='mt-1 font-bold'>
                  {selectedProject.estimatedSeconds === null
                    ? 'Indefinido'
                    : formatDuration(selectedProject.estimatedSeconds)}
                </p>
              </div>
              <div className='rounded-xl bg-cyan-500/10 px-4 py-3'>
                <p className='text-[10px] font-semibold text-cyan-600 uppercase dark:text-cyan-300'>
                  Gasto
                </p>
                <p className='mt-1 font-bold'>
                  {formatDuration(selectedProject.spentSeconds)}
                </p>
              </div>
              <div className='rounded-xl bg-fuchsia-500/10 px-4 py-3'>
                <p className='text-[10px] font-semibold text-fuchsia-600 uppercase dark:text-fuchsia-300'>
                  Do estimado
                </p>
                <p className='mt-1 font-bold'>
                  {selectedProject.estimatedTimePercent === null
                    ? '—'
                    : `${selectedProject.estimatedTimePercent}%`}
                </p>
              </div>
            </div>
          </div>

          {selectedProject.estimatedTimePercent !== null ? (
            <div className='mt-5 h-3 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-950'>
              <div
                className={`h-full rounded-full bg-linear-to-r ${utilizationColor(selectedProject.estimatedTimePercent)}`}
                style={{
                  width: `${Math.min(100, selectedProject.estimatedTimePercent)}%`,
                }}
              />
            </div>
          ) : null}

          <div className='mt-5'>
            <h3 className='mb-3 text-sm font-semibold'>
              Tempo gasto por funcionário
            </h3>
            {selectedProject.users.length === 0 ? (
              <div className='rounded-xl border border-dashed bg-background/60 p-6 text-center text-sm text-muted-foreground'>
                Nenhum apontamento encontrado neste projeto.
              </div>
            ) : (
              <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
                {selectedProject.users.map((user) => (
                  <button
                    key={user.employeeId}
                    type='button'
                    className='rounded-xl border bg-background/80 p-4 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/60 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40'
                    onClick={() =>
                      openEmployeeTimeline(
                        user.employeeId,
                        user.employeeName,
                        selectedProjectTeamId,
                      )
                    }
                  >
                    <div className='flex items-center justify-between gap-3'>
                      <p className='truncate text-sm font-semibold'>
                        {user.employeeName}
                      </p>
                      <span className='rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-300'>
                        {user.estimatedTimePercent === null
                          ? '—'
                          : `${user.estimatedTimePercent}%`}
                      </span>
                    </div>
                    <p className='mt-2 text-lg font-bold'>
                      {formatDuration(user.spentSeconds)}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      do tempo total estimado
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section className='rounded-2xl border bg-card p-5 shadow-sm'>
        <div className='mb-5 flex items-center gap-3'>
          <div className='flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-cyan-400 to-blue-600 text-white'>
            <Sparkles className='size-5' />
          </div>
          <div>
            <h2 className='font-semibold'>Disponibilidade por funcionário</h2>
            <p className='text-sm text-muted-foreground'>
              Clique no nome para ver a timeline do dia.
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
            {dashboard?.rows.map((row) => {
              const isSelected =
                selectedTimeline?.employeeId === row.employeeId;

              return (
                <article
                  key={row.employeeId}
                  className={`overflow-hidden rounded-2xl border bg-linear-to-br from-background to-muted/40 p-5 ${
                    isSelected ? 'border-cyan-400 ring-2 ring-cyan-400/30' : ''
                  }`}
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <button
                        type='button'
                        className='font-semibold hover:underline'
                        onClick={() =>
                          openEmployeeTimeline(
                            row.employeeId,
                            row.employeeName,
                            row.teamId,
                          )
                        }
                      >
                        {row.employeeName}
                      </button>
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
              );
            })}
          </div>
        )}
      </section>

      {selectedTimeline ? (
        <section ref={timelineSectionRef} className='flex flex-col gap-3'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
            <div>
              <h2 className='text-lg font-semibold'>
                Timeline de {selectedTimeline.employeeName}
              </h2>
              <p className='text-sm text-muted-foreground'>
                Apenas os apontamentos deste funcionário no dia selecionado.
              </p>
            </div>

            <div className='flex flex-col gap-2 sm:flex-row sm:items-end'>
              <div className='flex flex-col gap-1.5 sm:w-44'>
                <Label htmlFor='timeline-date'>Dia</Label>
                <DatePicker
                  id='timeline-date'
                  date={fromDateKey(timelineDate)}
                  displayFormat='dd-MM-yy'
                  onDateChange={(nextDate) => {
                    if (nextDate) setTimelineDate(toDateKey(nextDate));
                  }}
                />
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='sm:mb-0.5'
                onClick={() => setSelectedTimeline(null)}
              >
                <X className='size-4' />
                Fechar
              </Button>
            </div>
          </div>

          <TeamDayTimeline
            blocks={timelineBlocks}
            selectedDate={timelineDate}
            onDateChange={setTimelineDate}
            isLoading={isLoadingTimeline}
            showDateOptions={false}
          />
        </section>
      ) : null}
    </div>
  );
}
