import { useCallback, useEffect, useMemo, useState } from 'react'
import { EllipsisIcon, History, Pencil, Plus, Trash2 } from 'lucide-react'

import { AdminTimeEntryAuditDialog } from '@/components/admin-time-entry-audit-dialog'
import { AdminTimeEntryFormDialog } from '@/components/admin-time-entry-form-dialog'
import { DatePicker } from '@/components/date-picker'
import { DeleteAdminTimeEntryDialog } from '@/components/delete-admin-time-entry-dialog'
import { FilterField, ResponsiveFilters } from '@/components/responsive-filters'
import { TimeEntryDuration } from '@/components/time-entry-duration'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-handler'
import { toDateKey } from '@/lib/date'
import { formatDateTime } from '@/lib/time-format'
import type {
  AdminTimeEntriesResponse,
  AdminTimeEntry,
  AdminTimeEntryUserOption,
  AdminTimeEntryUsersResponse,
} from '@/types/admin-time-entry'
import type { RecentWorkItemKind } from '@/types/time-entry'

const PAGE_SIZE = 20
const ALL = 'all'

type StatusFilter = 'all' | 'active' | 'TIMER' | 'MANUAL'
type UserFilterOption = { value: string; label: string }

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'Todos',
  active: 'Em andamento',
  TIMER: 'Cronômetro',
  MANUAL: 'Manual',
}

const KIND_LABELS: Record<RecentWorkItemKind, string> = {
  ACTIVITY: 'Atividade',
  PROJECT: 'Projeto',
  TASK: 'Tarefa',
}

export function GestaoApontamentosPage() {
  const [entries, setEntries] = useState<AdminTimeEntry[]>([])
  const [users, setUsers] = useState<AdminTimeEntryUserOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [userFilter, setUserFilter] = useState(ALL)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [fromDate, setFromDate] = useState<Date | undefined>()
  const [toDate, setToDate] = useState<Date | undefined>()
  const [formEntry, setFormEntry] = useState<AdminTimeEntry | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [toDelete, setToDelete] = useState<AdminTimeEntry | null>(null)
  const [auditEntry, setAuditEntry] = useState<AdminTimeEntry | null>(null)

  const hasFilters =
    userFilter !== ALL ||
    statusFilter !== 'all' ||
    fromDate !== undefined ||
    toDate !== undefined

  useEffect(() => {
    void api<AdminTimeEntryUsersResponse>('/admin/time-entries/users').then(
      (data) => setUsers(data.users),
    )
  }, [])

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      })
      if (userFilter !== ALL) params.set('userId', userFilter)
      if (statusFilter === 'active') params.set('activeOnly', 'true')
      if (statusFilter === 'TIMER' || statusFilter === 'MANUAL') {
        params.set('type', statusFilter)
      }
      if (fromDate) params.set('from', toDateKey(fromDate))
      if (toDate) params.set('to', toDateKey(toDate))

      const data = await api<AdminTimeEntriesResponse>(
        `/admin/time-entries?${params.toString()}`,
      )
      setEntries(data.timeEntries)
      setTotal(data.pagination.total)
      setTotalPages(data.pagination.totalPages)
    } finally {
      setIsLoading(false)
    }
  }, [fromDate, page, statusFilter, toDate, userFilter])

  useEffect(() => {
    void load()
  }, [load])

  // Any filter change goes back to the first page (in the same render, so the
  // list is fetched once).
  function withPageReset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  const userFilterOptions = useMemo<UserFilterOption[]>(
    () =>
      users.map((user) => ({
        value: user.id,
        label: user.active ? user.name : `${user.name} (inativo)`,
      })),
    [users],
  )
  const selectedUserFilter =
    userFilterOptions.find((option) => option.value === userFilter) ?? null

  function openCreate() {
    setFormEntry(null)
    setIsFormOpen(true)
  }

  function openEdit(entry: AdminTimeEntry) {
    setFormEntry(entry)
    setIsFormOpen(true)
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>
            Gestão de apontamentos
          </h1>
          <p className='text-sm text-muted-foreground'>
            Consulte, corrija, crie ou exclua apontamentos de qualquer
            colaborador. Toda alteração fica registrada no histórico.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className='size-4' />
          Novo apontamento
        </Button>
      </div>

      <div className='flex flex-wrap items-end gap-3'>
        <ResponsiveFilters
          description='Filtrar apontamentos por colaborador, tipo e período.'
          hasActiveFilters={hasFilters}
          fieldClassName='w-56 shrink-0'
        >
          {(idPrefix, itemClassName) => (
            <>
              <FilterField
                id={`${idPrefix}-user`}
                label='Colaborador'
                className={itemClassName}
              >
                <Combobox
                  items={userFilterOptions}
                  value={selectedUserFilter}
                  onValueChange={(option) =>
                    withPageReset(setUserFilter)(option?.value ?? ALL)
                  }
                  itemToStringLabel={(item) => item.label}
                  isItemEqualToValue={(a, b) => a.value === b.value}
                >
                  <ComboboxInput
                    id={`${idPrefix}-user`}
                    className='w-full'
                    placeholder='Todos'
                    showClear={userFilter !== ALL}
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
              </FilterField>

              <FilterField
                id={`${idPrefix}-status`}
                label='Tipo'
                className={itemClassName}
              >
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    withPageReset(setStatusFilter)((value as StatusFilter) ?? 'all')
                  }
                >
                  <SelectTrigger id={`${idPrefix}-status`} className='w-full'>
                    <SelectValue>
                      {(value) => STATUS_LABELS[value as StatusFilter]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {STATUS_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField
                id={`${idPrefix}-from`}
                label='De'
                className={itemClassName}
              >
                <DatePicker
                  id={`${idPrefix}-from`}
                  date={fromDate}
                  onDateChange={withPageReset(setFromDate)}
                  placeholder='Início'
                  displayFormat='P'
                  className='w-full'
                />
              </FilterField>

              <FilterField
                id={`${idPrefix}-to`}
                label='Até'
                className={itemClassName}
              >
                <DatePicker
                  id={`${idPrefix}-to`}
                  date={toDate}
                  onDateChange={withPageReset(setToDate)}
                  placeholder='Fim'
                  displayFormat='P'
                  className='w-full'
                />
              </FilterField>
            </>
          )}
        </ResponsiveFilters>

        {hasFilters ? (
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              setUserFilter(ALL)
              setStatusFilter('all')
              setFromDate(undefined)
              setToDate(undefined)
              setPage(1)
            }}
          >
            Limpar filtros
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className='flex flex-col gap-2'>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className='h-14 rounded-xl' />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className='flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center'>
          <p className='text-sm font-medium'>Nenhum apontamento encontrado</p>
          <p className='max-w-sm text-sm text-muted-foreground'>
            Ajuste os filtros ou crie um apontamento manual.
          </p>
        </div>
      ) : (
        <>
          <div className='overflow-hidden rounded-xl border bg-card'>
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[960px] text-sm'>
                <thead>
                  <tr className='border-b bg-brand-soft text-left text-xs text-sidebar-primary'>
                    <th className='px-4 py-3 font-medium'>Colaborador</th>
                    <th className='px-4 py-3 font-medium'>Item</th>
                    <th className='px-4 py-3 font-medium'>Equipe</th>
                    <th className='px-4 py-3 font-medium'>Início</th>
                    <th className='px-4 py-3 font-medium'>Fim</th>
                    <th className='px-4 py-3 font-medium'>Duração</th>
                    <th className='px-4 py-3 font-medium'>Tipo</th>
                    <th
                      className='sticky right-0 bg-brand-soft px-4 py-3'
                      aria-label='Ações'
                    />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className='border-b last:border-b-0'>
                      <td className='px-4 py-3 font-medium'>{entry.userName}</td>
                      <td className='px-4 py-3'>
                        <div className='flex flex-col gap-0.5'>
                          <span className='text-xs text-muted-foreground'>
                            {KIND_LABELS[entry.kind]}
                          </span>
                          <span className='font-medium'>{entry.title}</span>
                          {entry.parentTitle ? (
                            <span className='text-xs text-muted-foreground'>
                              {entry.parentTitle}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className='px-4 py-3 text-muted-foreground'>
                        {entry.teamName}
                      </td>
                      <td className='px-4 py-3 text-muted-foreground'>
                        {formatDateTime(entry.startedAt)}
                      </td>
                      <td className='px-4 py-3 text-muted-foreground'>
                        {entry.endedAt
                          ? formatDateTime(entry.endedAt)
                          : 'Em andamento'}
                      </td>
                      <td className='px-4 py-3'>
                        <TimeEntryDuration
                          id={entry.id}
                          startedAt={entry.startedAt}
                          endedAt={entry.endedAt}
                          durationSeconds={entry.durationSeconds}
                        />
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={
                            entry.type === 'MANUAL'
                              ? 'rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700'
                              : 'rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'
                          }
                        >
                          {entry.type === 'MANUAL' ? 'Manual' : 'Cronômetro'}
                        </span>
                      </td>
                      <td className='sticky right-0 bg-card px-4 py-3 text-right'>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon-sm'
                                aria-label={`Ações para o apontamento de ${entry.userName}`}
                              />
                            }
                          >
                            <EllipsisIcon />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' className='min-w-44'>
                            <DropdownMenuItem onClick={() => openEdit(entry)}>
                              <Pencil />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setAuditEntry(entry)}
                            >
                              <History />
                              Histórico
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant='destructive'
                              onClick={() => setToDelete(entry)}
                            >
                              <Trash2 />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-sm text-muted-foreground'>
              {`Página ${page} de ${Math.max(totalPages, 1)} (${total} apontamento${total === 1 ? '' : 's'})`}
            </p>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Anterior
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={page >= totalPages || totalPages === 0}
                onClick={() => setPage((current) => current + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}

      <AdminTimeEntryFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        entry={formEntry}
        users={users}
        onSaved={() => void load()}
      />
      <DeleteAdminTimeEntryDialog
        entry={toDelete}
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        onDeleted={() => void load()}
      />
      <AdminTimeEntryAuditDialog
        entry={auditEntry}
        open={auditEntry !== null}
        onOpenChange={(open) => {
          if (!open) setAuditEntry(null)
        }}
      />
    </div>
  )
}
