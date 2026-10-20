import { useEffect, useMemo, useState } from 'react'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api-handler'
import type {
  AbsenceListItem,
  AbsenceListResponse,
  AbsenceUserOption,
} from '@/types/absence'

interface EditAbsenceDialogProps {
  absence: AbsenceListItem | null
  users: AbsenceUserOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (data: AbsenceListResponse) => void
}

export function EditAbsenceDialog({
  absence,
  users,
  open,
  onOpenChange,
  onUpdated,
}: EditAbsenceDialogProps) {
  const [userId, setUserId] = useState('')
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !absence) return

    setUserId(absence.userId)
    setStartDate(absence.startedAt)
    setEndDate(absence.endedAt)
  }, [open, absence])

  const selectableUsers = useMemo(() => {
    if (!absence) return users
    if (users.some((user) => user.id === absence.userId)) return users
    return [
      { id: absence.userId, name: absence.userName },
      ...users,
    ]
  }, [absence, users])

  const isScheduled = Boolean(startDate) && new Date(startDate!) > new Date()

  const canSubmit =
    !isSubmitting &&
    Boolean(userId) &&
    Boolean(startDate) &&
    (!endDate || new Date(endDate) > new Date(startDate!))

  async function handleSubmit() {
    if (!canSubmit || !absence || !startDate) return

    setIsSubmitting(true)
    try {
      const data = await api<AbsenceListResponse>(
        `/absences/admin/${absence.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ userId, startDate, endDate }),
        },
      )
      onUpdated(data)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar ausência</DialogTitle>
          <DialogDescription>
            Altere o colaborador e o período desta ausência. Alterações em
            períodos passados afetam o cálculo de ocupação.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <label className='text-sm font-medium' htmlFor='edit-absence-user'>
              Colaborador
            </label>
            <Select
              value={userId}
              onValueChange={(value) => setUserId(value ?? '')}
            >
              <SelectTrigger id='edit-absence-user' className='w-full'>
                <SelectValue placeholder='Selecione um usuário'>
                  {(value) =>
                    selectableUsers.find((user) => user.id === value)?.name ??
                    'Selecione um usuário'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {selectableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DateTimePickerField
            id='edit-absence-start'
            label='Início da ausência'
            value={startDate}
            onChange={setStartDate}
            disabled={isSubmitting}
          />
          <DateTimePickerField
            id='edit-absence-end'
            label='Fim da ausência'
            value={endDate}
            onChange={setEndDate}
            optional
            openEndedLabel={isScheduled ? 'Fim indeterminado' : 'Em andamento'}
            disabled={isSubmitting}
          />
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='cancel'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type='button'
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
          >
            {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
