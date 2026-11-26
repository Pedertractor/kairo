import { useEffect, useMemo, useState } from 'react'

import { DateTimePickerField } from '@/components/datetime-picker-field'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api-handler'
import type {
  AdminTimeEntry,
  AdminTimeEntryResponse,
  AdminTimeEntryUserOption,
  AdminWorkItem,
  AdminWorkItemsResponse,
} from '@/types/admin-time-entry'

const MAX_DURATION_MS = 24 * 60 * 60 * 1000
const FUTURE_TOLERANCE_MS = 60_000

type UserOption = { value: string; label: string }

function workItemLabel(item: AdminWorkItem) {
  const parent = item.parentTitle ? `${item.parentTitle} › ` : ''
  return `${parent}${item.title}`
}

function itemFromEntry(entry: AdminTimeEntry): AdminWorkItem | null {
  if (entry.kind === 'TASK' && entry.taskId) {
    return {
      kind: 'TASK',
      id: entry.taskId,
      title: entry.title,
      parentTitle: entry.parentTitle,
      status: '',
      teamId: entry.teamId,
      teamName: entry.teamName,
    }
  }

  if (entry.kind === 'ACTIVITY' && entry.activityId) {
    return {
      kind: 'ACTIVITY',
      id: entry.activityId,
      title: entry.title,
      parentTitle: null,
      status: '',
      teamId: entry.teamId,
      teamName: entry.teamName,
    }
  }

  return null
}

interface AdminTimeEntryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` creates a new manual entry. */
  entry: AdminTimeEntry | null
  users: AdminTimeEntryUserOption[]
  onSaved: (entry: AdminTimeEntry) => void
}

export function AdminTimeEntryFormDialog({
  open,
  onOpenChange,
  entry,
  users,
  onSaved,
}: AdminTimeEntryFormDialogProps) {
  const isEdit = entry !== null
  const isRunning = isEdit && entry.endedAt === null

  const [userId, setUserId] = useState('')
  const [workItem, setWorkItem] = useState<AdminWorkItem | null>(null)
  const [itemChanged, setItemChanged] = useState(false)
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const [endedAt, setEndedAt] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [search, setSearch] = useState('')
  const [workItems, setWorkItems] = useState<AdminWorkItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return

    setUserId(entry?.userId ?? '')
    setWorkItem(entry ? itemFromEntry(entry) : null)
    setItemChanged(false)
    setStartedAt(entry?.startedAt ?? null)
    setEndedAt(entry?.endedAt ?? null)
    setNote(entry?.note ?? '')
    setSearch('')
  }, [entry, open])

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const timeout = window.setTimeout(async () => {
      setIsSearching(true)
      try {
        const params = new URLSearchParams()
        if (search.trim()) params.set('search', search.trim())
        const data = await api<AdminWorkItemsResponse>(
          `/admin/time-entries/work-items?${params.toString()}`,
          { toastOnError: false },
        )
        if (!cancelled) setWorkItems(data.workItems)
      } catch {
        if (!cancelled) setWorkItems([])
      } finally {
        if (!cancelled) setIsSearching(false)
      }
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [open, search])

  const userOptions = useMemo<UserOption[]>(
    () =>
      users.map((user) => ({
        value: user.id,
        label: user.active ? user.name : `${user.name} (inativo)`,
      })),
    [users],
  )
  const selectedUser =
    userOptions.find((option) => option.value === userId) ?? null

  // Keep the current selection visible even when the search does not return it.
  const workItemOptions = useMemo(() => {
    if (!workItem || workItems.some((item) => item.id === workItem.id)) {
      return workItems
    }
    return [workItem, ...workItems]
  }, [workItem, workItems])

  const validationError = useMemo(() => {
    if (!startedAt) return null
    const start = new Date(startedAt).getTime()
    const limit = Date.now() + FUTURE_TOLERANCE_MS

    if (start > limit) return 'O início não pode estar no futuro.'
    if (!endedAt) return null

    const end = new Date(endedAt).getTime()
    if (end > limit) return 'O fim não pode estar no futuro.'
    if (end <= start) return 'O fim deve ser depois do início.'
    if (end - start > MAX_DURATION_MS) {
      return 'O apontamento não pode passar de 24 horas.'
    }
    return null
  }, [endedAt, startedAt])

  const canSubmit =
    !isSubmitting &&
    Boolean(userId) &&
    Boolean(workItem) &&
    Boolean(startedAt) &&
    (Boolean(endedAt) || isRunning) &&
    validationError === null

  async function handleSubmit() {
    if (!canSubmit || !workItem || !startedAt) return

    const itemPayload =
      !isEdit || itemChanged
        ? workItem.kind === 'TASK'
          ? { taskId: workItem.id }
          : { cardId: workItem.id }
        : {}

    setIsSubmitting(true)
    try {
      const data = isEdit
        ? await api<AdminTimeEntryResponse>(
            `/admin/time-entries/${entry.id}`,
            {
              method: 'PATCH',
              body: JSON.stringify({
                ...itemPayload,
                startedAt,
                endedAt,
                note: note.trim() || null,
              }),
            },
          )
        : await api<AdminTimeEntryResponse>('/admin/time-entries', {
            method: 'POST',
            body: JSON.stringify({
              userId,
              ...itemPayload,
              startedAt,
              endedAt,
              note: note.trim() || null,
            }),
          })
      onSaved(data.timeEntry)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar apontamento' : 'Novo apontamento'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Corrija o período, o item ou a observação deste apontamento. A alteração fica registrada no histórico.'
              : 'Registre um apontamento manual para um colaborador. Ele não pode se sobrepor a outro apontamento da mesma pessoa.'}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <label className='text-sm font-medium' htmlFor='admin-entry-user'>
              Colaborador
            </label>
            <Combobox
              items={userOptions}
              value={selectedUser}
              onValueChange={(option) => setUserId(option?.value ?? '')}
              itemToStringLabel={(item) => item.label}
              isItemEqualToValue={(a, b) => a.value === b.value}
              disabled={isEdit || isSubmitting}
            >
              <ComboboxInput
                id='admin-entry-user'
                className='w-full'
                placeholder='Selecione um colaborador'
                disabled={isEdit || isSubmitting}
              />
              <ComboboxContent>
                <ComboboxEmpty>Nenhum colaborador encontrado.</ComboboxEmpty>
                <ComboboxList>
                  {(item) => (
                    <ComboboxItem key={item.value} value={item}>
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          <div className='space-y-2'>
            <label className='text-sm font-medium' htmlFor='admin-entry-item'>
              Atividade ou tarefa
            </label>
            <Combobox
              items={workItemOptions}
              filter={null}
              value={workItem}
              onValueChange={(item) => {
                setWorkItem(item)
                setItemChanged(true)
              }}
              onInputValueChange={(value, details) => {
                if (details.reason === 'input-change') setSearch(value)
              }}
              itemToStringLabel={workItemLabel}
              isItemEqualToValue={(a, b) => a.kind === b.kind && a.id === b.id}
              disabled={isSubmitting}
            >
              <ComboboxInput
                id='admin-entry-item'
                className='w-full'
                placeholder='Buscar por título'
                disabled={isSubmitting}
              />
              <ComboboxContent>
                <ComboboxEmpty>
                  {isSearching ? 'Buscando...' : 'Nenhum item encontrado.'}
                </ComboboxEmpty>
                <ComboboxList>
                  {(item: AdminWorkItem) => (
                    <ComboboxItem key={`${item.kind}-${item.id}`} value={item}>
                      <div className='flex min-w-0 flex-col'>
                        <span className='truncate font-medium'>
                          {item.title}
                        </span>
                        <span className='truncate text-xs text-muted-foreground'>
                          {item.kind === 'TASK' ? 'Tarefa' : 'Atividade'} ·{' '}
                          {item.parentTitle ? `${item.parentTitle} · ` : ''}
                          {item.teamName}
                        </span>
                      </div>
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          <DateTimePickerField
            id='admin-entry-start'
            label='Início'
            value={startedAt}
            onChange={setStartedAt}
            disabled={isSubmitting}
          />
          <DateTimePickerField
            id='admin-entry-end'
            label='Fim'
            value={endedAt}
            onChange={setEndedAt}
            optional={isRunning}
            disabled={isSubmitting}
            description={
              isRunning
                ? 'Apontamento em andamento: defina o fim para encerrá-lo.'
                : undefined
            }
          />

          <div className='space-y-2'>
            <label className='text-sm font-medium' htmlFor='admin-entry-note'>
              Observação
            </label>
            <Textarea
              id='admin-entry-note'
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder='Motivo do ajuste (opcional)'
              maxLength={2000}
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {validationError ? (
            <p className='text-sm text-destructive'>{validationError}</p>
          ) : null}
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
            {isSubmitting
              ? 'Salvando...'
              : isEdit
                ? 'Salvar alterações'
                : 'Criar apontamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
