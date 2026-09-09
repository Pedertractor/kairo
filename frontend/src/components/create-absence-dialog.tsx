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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api-handler'
import type {
  AbsenceListResponse,
  AbsenceUserOption,
} from '@/types/absence'

interface CreateAbsenceDialogProps {
  open: boolean
  users: AbsenceUserOption[]
  currentUserId: string
  onOpenChange: (open: boolean) => void
  onCreated: (data: AbsenceListResponse) => void
}

export function CreateAbsenceDialog({
  open,
  users,
  currentUserId,
  onOpenChange,
  onCreated,
}: CreateAbsenceDialogProps) {
  const [userId, setUserId] = useState(currentUserId)
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return

    setUserId(
      users.some((user) => user.id === currentUserId)
        ? currentUserId
        : (users[0]?.id ?? ''),
    )
    setStartDate(new Date().toISOString())
    setEndDate(null)
  }, [open, users, currentUserId])

  const isScheduled = Boolean(startDate) && new Date(startDate!) > new Date()

  const canSubmit =
    !isSubmitting &&
    Boolean(userId) &&
    Boolean(startDate) &&
    (!endDate || new Date(endDate) > new Date(startDate!))

  async function handleSubmit() {
    if (!canSubmit || !startDate) return

    setIsSubmitting(true)
    try {
      const data = await api<AbsenceListResponse>('/absences', {
        method: 'POST',
        body: JSON.stringify({ userId, startDate, endDate }),
      })
      onCreated(data)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova ausência</DialogTitle>
          <DialogDescription>
            Informe a pessoa e o período que deve ser descontado da
            disponibilidade.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {users.length > 1 ? (
            <div className='space-y-2'>
              <label className='text-sm font-medium' htmlFor='absence-user'>
                Usuário
              </label>
              <Select
                value={userId}
                onValueChange={(value) => setUserId(value ?? '')}
              >
                <SelectTrigger id='absence-user' className='w-full'>
                  <SelectValue placeholder='Selecione um usuário'>
                    {(value) =>
                      users.find((user) => user.id === value)?.name ??
                      'Selecione um usuário'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <DateTimePickerField
            id='absence-start'
            label='Início da ausência'
            value={startDate}
            onChange={setStartDate}
            disabled={isSubmitting}
          />
          <DateTimePickerField
            id='absence-end'
            label='Fim da ausência'
            value={endDate}
            onChange={setEndDate}
            optional
            openEndedLabel={
              isScheduled ? 'Fim indeterminado' : 'Em andamento'
            }
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
            {isSubmitting ? 'Salvando...' : 'Criar ausência'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
