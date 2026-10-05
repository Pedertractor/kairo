import { useCallback, useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { subscribeActivityDataInvalidation } from '@/lib/activity-data-invalidation'
import { api } from '@/lib/api-handler'
import { formatDateTime } from '@/lib/time-format'
import { cn } from '@/lib/utils'
import type {
  ActivityHistoryEvent,
  ActivityHistoryResponse,
} from '@/types/card-history'

interface ActivityHistorySectionProps {
  teamId: string
  activityId: string
}

function assigneeLabel(name: string | null) {
  return name ?? 'ninguém'
}

function describeAssigneeChange(event: ActivityHistoryEvent) {
  const from = assigneeLabel(event.fromAssignedToName)
  const to = assigneeLabel(event.toAssignedToName)

  if (!event.fromAssignedToId && event.toAssignedToId) {
    return (
      <>
        <span className="font-medium text-foreground">
          {event.changedByName}
        </span>{' '}
        definiu o responsável como{' '}
        <span className="font-medium text-foreground">{to}</span>
      </>
    )
  }

  if (event.fromAssignedToId && !event.toAssignedToId) {
    return (
      <>
        <span className="font-medium text-foreground">
          {event.changedByName}
        </span>{' '}
        removeu o responsável ({from})
      </>
    )
  }

  return (
    <>
      <span className="font-medium text-foreground">
        {event.changedByName}
      </span>{' '}
      alterou o responsável de{' '}
      <span className="font-medium text-foreground">{from}</span> para{' '}
      <span className="font-medium text-foreground">{to}</span>
    </>
  )
}

export function ActivityHistorySection({
  teamId,
  activityId,
}: ActivityHistorySectionProps) {
  const [history, setHistory] = useState<ActivityHistoryEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [open, setOpen] = useState(true)

  const loadHistory = useCallback(async () => {
    setIsLoading(true)

    try {
      const data = await api<ActivityHistoryResponse>(
        `/teams/${teamId}/activities/${activityId}/history`,
      )
      setHistory(data.history)
    } finally {
      setIsLoading(false)
    }
  }, [teamId, activityId])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  useEffect(
    () => subscribeActivityDataInvalidation(() => void loadHistory()),
    [loadHistory],
  )

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="flex flex-col gap-3"
    >
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium">Histórico</p>
          <CollapsibleTrigger
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={open ? 'Ocultar histórico' : 'Mostrar histórico'}
          >
            <ChevronDown
              className={cn(
                'size-4 transition-transform',
                !open && '-rotate-90',
              )}
            />
          </CollapsibleTrigger>
        </div>
        {open ? (
          <p className="text-sm text-muted-foreground">
            Alterações de responsável nesta atividade.
          </p>
        ) : null}
      </div>

      <CollapsibleContent>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma alteração registrada ainda.
          </p>
        ) : (
          <ol className="relative ml-2 border-l border-border pl-4">
            {history.map((event) => (
              <li key={event.id} className="relative pb-4 last:pb-0">
                <span
                  aria-hidden
                  className="absolute -left-[1.3125rem] top-1.5 size-2.5 rounded-full border-2 border-background bg-sidebar-primary"
                />
                <p className="text-sm text-muted-foreground">
                  {describeAssigneeChange(event)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDateTime(event.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
