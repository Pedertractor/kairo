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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api-handler'
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '@/lib/time-format'
import type {
  TaskTimeEntrySummary,
  UpdateTaskTimeEntryResponse,
} from '@/types/time-entry'

interface EditTaskTimeEntryDialogProps {
  projectId: string
  taskId: string
  entry: TaskTimeEntrySummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (entry: TaskTimeEntrySummary) => void
}

export function EditTaskTimeEntryDialog({
  projectId,
  taskId,
  entry,
  open,
  onOpenChange,
  onUpdated,
}: EditTaskTimeEntryDialogProps) {
  const [startedAt, setStartedAt] = useState('')
  const [endedAt, setEndedAt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (entry) {
      setStartedAt(toDatetimeLocalValue(entry.startedAt))
      setEndedAt(entry.endedAt ? toDatetimeLocalValue(entry.endedAt) : '')
    }
  }, [entry])

  async function handleConfirm() {
    if (!entry || !startedAt) {
      return
    }

    setIsSubmitting(true)

    try {
      const data = await api<UpdateTaskTimeEntryResponse>(
        `/projects/${projectId}/tasks/${taskId}/time-entries/${entry.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            startedAt: fromDatetimeLocalValue(startedAt),
            endedAt: endedAt ? fromDatetimeLocalValue(endedAt) : null,
          }),
        },
      )

      onOpenChange(false)
      onUpdated(data.timeEntry)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar apontamento</DialogTitle>
          <DialogDescription>
            Ajuste o horário de início e fim deste apontamento.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="started-at">Início</Label>
            <Input
              id="started-at"
              type="datetime-local"
              value={startedAt}
              onChange={(event) => setStartedAt(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ended-at">Fim</Label>
            <Input
              id="ended-at"
              type="datetime-local"
              value={endedAt}
              onChange={(event) => setEndedAt(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Deixe em branco se o apontamento ainda estiver em andamento.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isSubmitting || !startedAt}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
