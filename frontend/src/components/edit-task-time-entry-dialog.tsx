import { useEffect, useState } from 'react'

import { DateTimePickerField } from '@/components/datetime-picker-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import { api } from '@/lib/api-handler'
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
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const [endedAt, setEndedAt] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (entry) {
      setStartedAt(entry.startedAt)
      setEndedAt(entry.endedAt)
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
            startedAt,
            endedAt,
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

        <FieldGroup className="py-2">
          <DateTimePickerField
            id="started-at"
            label="Início"
            value={startedAt}
            onChange={setStartedAt}
            disabled={isSubmitting}
          />

          <DateTimePickerField
            id="ended-at"
            label="Fim"
            value={endedAt}
            onChange={setEndedAt}
            optional
            disabled={isSubmitting}
            description="Selecione em andamento quando o apontamento ainda não tiver sido finalizado."
          />
        </FieldGroup>

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
