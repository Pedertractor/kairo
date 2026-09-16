import { UsageBarList, UsageDonut } from '@/components/admin-usage-charts'
import { Skeleton } from '@/components/ui/skeleton'
import { STATUS_LABELS } from '@/lib/card-status'
import { cn } from '@/lib/utils'
import type {
  ActivityOverview,
  AnalyticsCardStatus,
  WorkItemStatusOverview,
} from '@/types/analytics'

const STATUS_CHART_COLORS: Record<AnalyticsCardStatus, string> = {
  TODO: '#94a3b8',
  IN_PROGRESS: '#0ea5e9',
  PAUSED: '#f59e0b',
  DONE: '#10b981',
  CANCELED: '#f43f5e',
}

const HIGHLIGHT_STATUSES: AnalyticsCardStatus[] = [
  'IN_PROGRESS',
  'TODO',
  'DONE',
]

export type ActivityOverviewScope = 'period' | 'allTime'

function countByStatus(
  overview: WorkItemStatusOverview,
  status: AnalyticsCardStatus,
) {
  return overview.byStatus.find((item) => item.status === status)?.count ?? 0
}

function WorkItemCard({
  title,
  itemLabel,
  itemLabelPlural,
  createdLabel,
  createdLabelPlural,
  accentClassName,
  overview,
  scope,
}: {
  title: string
  itemLabel: string
  itemLabelPlural: string
  createdLabel: string
  createdLabelPlural: string
  accentClassName: string
  overview: WorkItemStatusOverview
  scope: ActivityOverviewScope
}) {
  return (
    <div className={cn('rounded-2xl border p-4', accentClassName)}>
      <p className='text-[10px] font-semibold tracking-wide uppercase opacity-70'>
        {title}
      </p>
      <p className='mt-1 text-2xl font-bold tabular-nums'>{overview.total}</p>
      <p className='text-xs opacity-70'>
        {scope === 'period' ? (
          <>
            {overview.total === 1 ? itemLabel : itemLabelPlural}{' '}
            {overview.total === 1
              ? `${createdLabel} no período`
              : `${createdLabelPlural} no período`}
          </>
        ) : (
          <>
            {overview.total === 1 ? itemLabel : itemLabelPlural} no total ·{' '}
            {overview.createdInPeriod}{' '}
            {overview.createdInPeriod === 1
              ? createdLabel
              : createdLabelPlural}{' '}
            no período
          </>
        )}
      </p>

      <div className='mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs'>
        {HIGHLIGHT_STATUSES.map((status) => (
          <span key={status} className='flex items-center gap-1.5'>
            <span
              className='size-2 rounded-full'
              style={{ backgroundColor: STATUS_CHART_COLORS[status] }}
            />
            {STATUS_LABELS[status]}{' '}
            <span className='font-semibold tabular-nums'>
              {countByStatus(overview, status)}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

function StatusDonut({
  title,
  overview,
  itemLabel,
  itemLabelPlural,
}: {
  title: string
  overview: WorkItemStatusOverview
  itemLabel: string
  itemLabelPlural: string
}) {
  return (
    <div className='rounded-2xl border p-4'>
      <h3 className='mb-4 text-sm font-semibold'>{title}</h3>
      <UsageDonut
        slices={overview.byStatus.map((item) => ({
          label: STATUS_LABELS[item.status],
          value: item.count,
          color: STATUS_CHART_COLORS[item.status],
        }))}
        emptyLabel={`Nenhum registro de ${itemLabelPlural}.`}
        centerLabel={overview.total === 1 ? itemLabel : itemLabelPlural}
        centerValue={String(overview.total)}
      />
    </div>
  )
}

export function AnalyticsActivityOverview({
  overview,
  isLoading,
  scope = 'period',
}: {
  overview: ActivityOverview | null
  isLoading: boolean
  scope?: ActivityOverviewScope
}) {
  if (isLoading || !overview) {
    return (
      <div className='grid gap-4 lg:grid-cols-2'>
        <Skeleton className='h-56 rounded-2xl' />
        <Skeleton className='h-56 rounded-2xl' />
      </div>
    )
  }

  const grandTotal =
    overview.activities.total + overview.projects.total + overview.tasks.total

  if (grandTotal === 0) {
    return (
      <div className='rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground'>
        {scope === 'period'
          ? 'Nenhuma atividade, projeto ou tarefa criada no período.'
          : 'Nenhuma atividade, projeto ou tarefa cadastrada.'}
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {scope === 'allTime' ? (
        <p className='rounded-xl border border-dashed p-3 text-xs text-muted-foreground'>
          Este bloco mostra o histórico completo das equipes filtradas: cada
          atividade, projeto e tarefa aparece com o status que tem hoje,
          independentemente de quando foi criado. O filtro de datas não remove
          nada daqui — ele apenas define o número de itens{' '}
          <span className='font-semibold'>criados no período</span> exibido em
          cada cartão.
        </p>
      ) : null}

      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
        <WorkItemCard
          title='Atividades'
          itemLabel='atividade'
          itemLabelPlural='atividades'
          createdLabel='criada'
          createdLabelPlural='criadas'
          accentClassName='border-violet-200 bg-violet-500/10 dark:border-violet-900'
          overview={overview.activities}
          scope={scope}
        />
        <WorkItemCard
          title='Projetos'
          itemLabel='projeto'
          itemLabelPlural='projetos'
          createdLabel='criado'
          createdLabelPlural='criados'
          accentClassName='border-indigo-200 bg-indigo-500/10 dark:border-indigo-900'
          overview={overview.projects}
          scope={scope}
        />
        <WorkItemCard
          title='Tarefas'
          itemLabel='tarefa'
          itemLabelPlural='tarefas'
          createdLabel='criada'
          createdLabelPlural='criadas'
          accentClassName='border-emerald-200 bg-emerald-500/10 dark:border-emerald-900'
          overview={overview.tasks}
          scope={scope}
        />
      </div>

      <div className='grid gap-6 xl:grid-cols-3'>
        <StatusDonut
          title='Atividades por status'
          overview={overview.activities}
          itemLabel='atividade'
          itemLabelPlural='atividades'
        />
        <StatusDonut
          title='Projetos por status'
          overview={overview.projects}
          itemLabel='projeto'
          itemLabelPlural='projetos'
        />
        <StatusDonut
          title='Tarefas por status'
          overview={overview.tasks}
          itemLabel='tarefa'
          itemLabelPlural='tarefas'
        />
      </div>

      <div className='rounded-2xl border p-4'>
        <h3 className='mb-1 text-sm font-semibold'>Atividades por etiqueta</h3>
        <p className='mb-4 text-xs text-muted-foreground'>
          {scope === 'period'
            ? 'Atividades criadas no período, agrupadas por etiqueta.'
            : 'Todas as atividades já criadas, agrupadas por etiqueta.'}
        </p>
        <UsageBarList
          items={overview.byTag.map((tag) => ({
            label: tag.tagName,
            value: tag.count,
            hint: tag.byStatus
              .filter((status) => status.count > 0)
              .map((status) => `${STATUS_LABELS[status.status]} ${status.count}`)
              .join(' · '),
          }))}
          emptyLabel='Nenhuma etiqueta cadastrada.'
          valueFormatter={(value) => String(value)}
        />
      </div>

      <div className='space-y-3'>
        <h3 className='text-sm font-semibold'>Status por etiqueta</h3>
        {overview.byTag.map((tag) => (
          <div key={tag.tagId ?? 'none'} className='rounded-2xl border p-4'>
            <div className='mb-2 flex items-center justify-between gap-3'>
              <span className='flex min-w-0 items-center gap-2'>
                <span
                  className={cn(
                    'size-2.5 shrink-0 rounded-full border border-black/10 bg-muted',
                  )}
                  style={
                    tag.tagColor ? { backgroundColor: tag.tagColor } : undefined
                  }
                />
                <p className='truncate font-semibold'>{tag.tagName}</p>
              </span>
              <span className='shrink-0 text-right'>
                <span className='block text-sm font-bold tabular-nums'>
                  {tag.count}
                </span>
                {scope === 'allTime' ? (
                  <span className='block text-[11px] text-muted-foreground'>
                    {tag.createdInPeriod} no período
                  </span>
                ) : null}
              </span>
            </div>
            <div className='flex h-3 overflow-hidden rounded-full bg-muted'>
              {tag.byStatus.map((status) => {
                if (status.count <= 0 || tag.count <= 0) return null

                return (
                  <div
                    key={status.status}
                    className='h-full'
                    style={{
                      width: `${(status.count / tag.count) * 100}%`,
                      backgroundColor: STATUS_CHART_COLORS[status.status],
                    }}
                    title={`${STATUS_LABELS[status.status]}: ${status.count}`}
                  />
                )
              })}
            </div>
            <div className='mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground'>
              {tag.byStatus
                .filter((status) => status.count > 0)
                .map((status) => (
                  <span key={status.status} className='flex items-center gap-1.5'>
                    <span
                      className='size-2 rounded-full'
                      style={{
                        backgroundColor: STATUS_CHART_COLORS[status.status],
                      }}
                    />
                    {STATUS_LABELS[status.status]} {status.count}
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
