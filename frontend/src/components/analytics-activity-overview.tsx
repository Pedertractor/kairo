import { UsageBarList, UsageDonut } from '@/components/admin-usage-charts'
import { Skeleton } from '@/components/ui/skeleton'
import { STATUS_LABELS } from '@/lib/card-status'
import { cn } from '@/lib/utils'
import type {
  ActivityOverview,
  AnalyticsCardStatus,
} from '@/types/analytics'

const STATUS_CHART_COLORS: Record<AnalyticsCardStatus, string> = {
  TODO: '#94a3b8',
  IN_PROGRESS: '#0ea5e9',
  PAUSED: '#f59e0b',
  DONE: '#10b981',
  CANCELED: '#f43f5e',
}

export function AnalyticsActivityOverview({
  overview,
  isLoading,
}: {
  overview: ActivityOverview | null
  isLoading: boolean
}) {
  if (isLoading || !overview) {
    return (
      <div className='grid gap-4 lg:grid-cols-2'>
        <Skeleton className='h-56 rounded-2xl' />
        <Skeleton className='h-56 rounded-2xl' />
      </div>
    )
  }

  if (overview.total === 0) {
    return (
      <div className='rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground'>
        Nenhuma atividade criada neste período.
      </div>
    )
  }

  const doneCount =
    overview.byStatus.find((item) => item.status === 'DONE')?.count ?? 0
  const inProgressCount =
    overview.byStatus.find((item) => item.status === 'IN_PROGRESS')?.count ?? 0
  const todoCount =
    overview.byStatus.find((item) => item.status === 'TODO')?.count ?? 0

  return (
    <div className='space-y-6'>
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <div className='rounded-xl bg-muted/40 p-4'>
          <p className='text-[10px] font-semibold tracking-wide text-muted-foreground uppercase'>
            Criadas no período
          </p>
          <p className='mt-1 text-2xl font-bold tabular-nums'>
            {overview.total}
          </p>
        </div>
        <div className='rounded-xl bg-sky-500/10 p-4'>
          <p className='text-[10px] font-semibold tracking-wide text-sky-700 uppercase dark:text-sky-300'>
            Em andamento
          </p>
          <p className='mt-1 text-2xl font-bold tabular-nums'>
            {inProgressCount}
          </p>
        </div>
        <div className='rounded-xl bg-muted p-4'>
          <p className='text-[10px] font-semibold tracking-wide text-muted-foreground uppercase'>
            A fazer
          </p>
          <p className='mt-1 text-2xl font-bold tabular-nums'>{todoCount}</p>
        </div>
        <div className='rounded-xl bg-emerald-500/10 p-4'>
          <p className='text-[10px] font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-300'>
            Concluídas
          </p>
          <p className='mt-1 text-2xl font-bold tabular-nums'>{doneCount}</p>
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-2'>
        <div className='rounded-2xl border p-4'>
          <h3 className='mb-4 text-sm font-semibold'>Por status</h3>
          <UsageDonut
            slices={overview.byStatus.map((item) => ({
              label: STATUS_LABELS[item.status],
              value: item.count,
              color: STATUS_CHART_COLORS[item.status],
            }))}
            emptyLabel='Nenhuma atividade neste período.'
            centerLabel={overview.total === 1 ? 'atividade' : 'atividades'}
            centerValue={String(overview.total)}
          />
        </div>
        <div className='rounded-2xl border p-4'>
          <h3 className='mb-4 text-sm font-semibold'>Por etiqueta</h3>
          <UsageBarList
            items={overview.byTag.map((tag) => ({
              label: tag.tagName,
              value: tag.count,
              hint: tag.byStatus
                .filter((status) => status.count > 0)
                .map(
                  (status) =>
                    `${STATUS_LABELS[status.status]} ${status.count}`,
                )
                .join(' · '),
            }))}
            emptyLabel='Nenhuma etiqueta neste período.'
            valueFormatter={(value) => String(value)}
          />
        </div>
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
              <span className='shrink-0 text-sm font-bold tabular-nums'>
                {tag.count}
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
