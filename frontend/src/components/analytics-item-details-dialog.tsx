import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { ActivityHistorySection } from '@/components/activity-history-section'
import { CardTimeBudget } from '@/components/card-time-budget'
import { TaskTimeEntriesSection } from '@/components/task-time-entries-section'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-handler'
import { STATUS_LABELS } from '@/lib/card-status'
import { COMPLEXITY_LEVEL_LABELS } from '@/lib/complexity-level'
import { formatDateTime } from '@/lib/time-format'
import type { ActivityTagItem } from '@/types/analytics'
import type { ActivityResponse, ActivitySummary } from '@/types/card'
import type { TaskDetail, TaskDetailResponse } from '@/types/task'

type Detail =
  | { type: 'ACTIVITY'; value: ActivitySummary }
  | { type: 'TASK'; value: TaskDetail }

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='min-w-0 space-y-1'>
      <dt className='text-xs text-muted-foreground'>{label}</dt>
      <dd className='break-words text-sm font-medium'>{children}</dd>
    </div>
  )
}

export function AnalyticsItemDetailsDialog({
  item, scope, onClose,
}: { item: ActivityTagItem; scope: 'period' | 'allTime'; onClose: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setDetail(null)
    setError(null)

    async function load() {
      try {
        let result: Detail
        if (item.type === 'ACTIVITY') {
          const data = await api<ActivityResponse>(
            `/teams/${item.teamId}/activities/${item.id}`, { toastOnError: false },
          )
          result = { type: 'ACTIVITY', value: data.activity }
        } else {
          const data = await api<TaskDetailResponse>(
            `/projects/${item.projectId}/tasks/${item.id}`, { toastOnError: false },
          )
          result = { type: 'TASK', value: data.task }
        }
        if (!cancelled) setDetail(result)
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os detalhes.')
      }
    }
    void load()
    return () => { cancelled = true }
  }, [item.id, item.type, item.teamId, item.projectId, attempt])

  const value = detail?.value
  const displayedStatus = scope === 'period' ? item.status : value?.status
  const displayedCompletion = scope === 'period' ? item.completedAt : value?.completedAt
  const href = item.type === 'ACTIVITY'
    ? `/equipes/${item.teamId}/atividades/${item.id}`
    : `/projetos/${item.projectId}/tarefas/${item.id}`

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className='max-h-[85vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl'>
        <DialogHeader className='pr-8'>
          <DialogTitle>{value?.title ?? item.title}</DialogTitle>
          <DialogDescription>
            {item.type === 'TASK' ? 'Detalhes da tarefa de projeto' : 'Detalhes da atividade'}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div role='alert' className='space-y-3 rounded-xl border p-4'>
            <p className='text-sm text-muted-foreground'>{error}</p>
            <Button variant='outline' onClick={() => setAttempt((current) => current + 1)}>Tentar novamente</Button>
          </div>
        ) : !value || !detail ? (
          <div aria-label='Carregando detalhes' className='space-y-3'>
            <Skeleton className='h-24 w-full' />
            <Skeleton className='h-40 w-full' />
          </div>
        ) : (
          <div className='space-y-5'>
            <dl className='grid grid-cols-1 gap-4 rounded-xl border p-4 sm:grid-cols-2'>
              <DetailField label={scope === 'period' ? 'Status no fim do período' : 'Status atual'}>
                {STATUS_LABELS[displayedStatus!]}
              </DetailField>
              <DetailField label='Responsável'>{value.assignedToName ?? 'Sem responsável'}</DetailField>
              <DetailField label='Etiqueta'>{value.tag?.name ?? 'Sem etiqueta'}</DetailField>
              <DetailField label='Complexidade'>
                {value.complexityLevel ? COMPLEXITY_LEVEL_LABELS[value.complexityLevel] : 'Não definida'}
              </DetailField>
              <DetailField label='Projeto'>
                {detail.type === 'TASK' ? (
                  <Link className='text-primary underline underline-offset-4' to={`/projetos/${detail.value.cardId}`}>
                    {detail.value.projectTitle}
                  </Link>
                ) : 'Atividade avulsa, sem vínculo com projeto'}
              </DetailField>
              <DetailField label='Criada por'>{value.createdByName ?? 'Não informado'}</DetailField>
              {detail.type === 'ACTIVITY' ? (
                <DetailField label='Cliente'>{detail.value.client?.name ?? 'Sem cliente'}</DetailField>
              ) : null}
              <DetailField label='Máquina'>{value.machine?.name ?? 'Sem máquina'}</DetailField>
              <DetailField label='Criada em'>{formatDateTime(value.createdAt)}</DetailField>
              <DetailField label='Última atualização'>{formatDateTime(value.updatedAt)}</DetailField>
              {displayedStatus === 'DONE' ? (
                <DetailField label='Concluída em'>
                  {displayedCompletion ? formatDateTime(displayedCompletion) : 'Data de conclusão não registrada'}
                  {(scope === 'period' ? item.completionDateEstimated : detail.type === 'ACTIVITY' && detail.value.completionDateEstimated) && displayedCompletion ? ' (estimada)' : null}
                </DetailField>
              ) : null}
            </dl>
            {scope === 'period' ? (
              <p className='text-xs text-muted-foreground'>
                O status e a conclusão respeitam o fim do período filtrado. Os demais dados cadastrais e o histórico abaixo mostram as informações atuais e completas.
              </p>
            ) : null}
            <section className='space-y-2'>
              <h3 className='text-sm font-semibold'>Descrição</h3>
              <p className='whitespace-pre-wrap break-words text-sm text-muted-foreground'>
                {value.description || 'Sem descrição.'}
              </p>
            </section>
            <CardTimeBudget loggedSeconds={value.loggedSeconds} estimatedHours={value.estimatedHours} />
            <div className='border-t pt-4'>
              {detail.type === 'ACTIVITY' ? (
                <ActivityHistorySection key={item.id} teamId={item.teamId} activityId={item.id} />
              ) : (
                <div className='space-y-4'>
                  <section className='space-y-2'>
                    <h3 className='text-sm font-semibold'>Histórico da tarefa</h3>
                    <p className='text-xs text-muted-foreground'>
                      As datas registradas aparecem acima. O sistema não registra histórico de alterações de status de tarefas.
                    </p>
                  </section>
                  <TaskTimeEntriesSection projectId={detail.value.cardId} taskId={item.id} />
                </div>
              )}
            </div>
            <div className='flex justify-end'>
              <Link className='text-sm font-medium text-primary underline underline-offset-4' to={href}>
                Abrir página completa
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
