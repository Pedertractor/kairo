import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-handler'
import { formatDateTime, formatDuration } from '@/lib/time-format'
import type {
  AdminTimeEntry,
  AdminTimeEntryAuditAction,
  AdminTimeEntryAuditLog,
  AdminTimeEntryAuditResponse,
  AdminTimeEntryAuditSnapshot,
} from '@/types/admin-time-entry'

const ACTION_LABELS: Record<AdminTimeEntryAuditAction, string> = {
  CREATE: 'Criou',
  UPDATE: 'Editou',
  DELETE: 'Excluiu',
}

function describeSnapshot(snapshot: AdminTimeEntryAuditSnapshot) {
  const end = snapshot.endedAt ? formatDateTime(snapshot.endedAt) : 'em andamento'
  const duration =
    snapshot.durationSeconds !== null
      ? ` (${formatDuration(snapshot.durationSeconds)})`
      : ''
  return `${formatDateTime(snapshot.startedAt)} → ${end}${duration}`
}

function changes(log: AdminTimeEntryAuditLog): string[] {
  const { before, after } = log

  if (!before && after) return [describeSnapshot(after)]
  if (before && !after) return [describeSnapshot(before)]
  if (!before || !after) return []

  const lines: string[] = []
  if (before.startedAt !== after.startedAt || before.endedAt !== after.endedAt) {
    lines.push(`${describeSnapshot(before)}  ⇒  ${describeSnapshot(after)}`)
  }
  if (before.cardId !== after.cardId || before.taskId !== after.taskId) {
    lines.push('Item do apontamento alterado')
  }
  if (before.note !== after.note) {
    lines.push(`Observação: “${before.note ?? ''}” ⇒ “${after.note ?? ''}”`)
  }
  return lines
}

interface AdminTimeEntryAuditDialogProps {
  entry: AdminTimeEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AdminTimeEntryAuditDialog({
  entry,
  open,
  onOpenChange,
}: AdminTimeEntryAuditDialogProps) {
  const [logs, setLogs] = useState<AdminTimeEntryAuditLog[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open || !entry) return

    let cancelled = false
    setIsLoading(true)
    api<AdminTimeEntryAuditResponse>(`/admin/time-entries/${entry.id}/audit`)
      .then((data) => {
        if (!cancelled) setLogs(data.auditLogs)
      })
      .catch(() => {
        if (!cancelled) setLogs([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [entry, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>Histórico do apontamento</DialogTitle>
          <DialogDescription>
            Alterações feitas por administradores no apontamento de{' '}
            <span className='font-medium text-foreground'>
              {entry?.userName}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className='max-h-96 space-y-3 overflow-y-auto'>
          {isLoading ? (
            Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} className='h-16 rounded-lg' />
            ))
          ) : logs.length === 0 ? (
            <p className='rounded-lg border border-dashed bg-muted/30 p-4 text-center text-sm text-muted-foreground'>
              Nenhuma alteração administrativa registrada. O apontamento está
              como foi registrado pelo colaborador.
            </p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className='rounded-lg border p-3 text-sm'>
                <div className='flex flex-wrap items-baseline justify-between gap-2'>
                  <span>
                    <span className='font-medium'>{log.actorName}</span>{' '}
                    {ACTION_LABELS[log.action].toLowerCase()} o apontamento
                  </span>
                  <span className='text-xs text-muted-foreground'>
                    {formatDateTime(log.createdAt)}
                  </span>
                </div>
                <ul className='mt-1 space-y-0.5 text-muted-foreground'>
                  {changes(log).map((line) => (
                    <li key={line} className='break-words'>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='cancel'
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
