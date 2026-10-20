import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { CalendarOff, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

import { CancelAbsenceDialog } from '@/components/cancel-absence-dialog'
import { CreateAbsenceDialog } from '@/components/create-absence-dialog'
import { DatePicker } from '@/components/date-picker'
import { DeleteAbsenceDialog } from '@/components/delete-absence-dialog'
import { EditAbsenceDialog } from '@/components/edit-absence-dialog'
import { FilterField, ResponsiveFilters } from '@/components/responsive-filters'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { markAbsencesSeen } from '@/hooks/use-unseen-absences'
import { api } from '@/lib/api-handler'
import type {
  AbsenceListItem,
  AbsenceListResponse,
  AbsenceUnseenCountResponse,
  AbsenceUserOption,
} from '@/types/absence'

const ALL_USERS = 'all'
const ALL_STATUSES = 'all'

type AbsenceStatusFilter = 'all' | 'scheduled' | 'ongoing' | 'finished'

type UserFilterOption = {
  value: string
  label: string
}

const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const STATUS_LABELS: Record<Exclude<AbsenceStatusFilter, 'all'>, string> = {
  scheduled: 'Agendada',
  ongoing: 'Em andamento',
  finished: 'Concluída',
}

function getStatus(absence: AbsenceListItem) {
  const now = Date.now()
  const start = new Date(absence.startedAt).getTime()
  const end = absence.endedAt ? new Date(absence.endedAt).getTime() : null

  if (start > now) {
    return { label: 'Agendada', className: 'bg-blue-500/10 text-blue-700' }
  }

  if (end === null || end > now) {
    return { label: 'Em andamento', className: 'bg-amber-500/10 text-amber-700' }
  }

  return { label: 'Concluída', className: 'bg-muted text-muted-foreground' }
}

function isNewAbsence(
  absence: AbsenceListItem,
  currentUserId: string,
  seenAt: string | null,
) {
  if (absence.createdById === currentUserId) {
    return false
  }

  if (seenAt === null) {
    return true
  }

  return new Date(absence.createdAt).getTime() > new Date(seenAt).getTime()
}

function toRangeStartIso(date: Date | undefined) {
  if (!date) return undefined
  return dayjs(date).startOf('day').toISOString()
}

function toRangeEndIso(date: Date | undefined) {
  if (!date) return undefined
  return dayjs(date).add(1, 'day').startOf('day').toISOString()
}

export function AbsencesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [absences, setAbsences] = useState<AbsenceListItem[]>([])
  const [users, setUsers] = useState<AbsenceUserOption[]>([])
  const [createUsers, setCreateUsers] = useState<AbsenceUserOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [userFilter, setUserFilter] = useState(ALL_USERS)
  const [createdByFilter, setCreatedByFilter] = useState(ALL_USERS)
  const [statusFilter, setStatusFilter] =
    useState<AbsenceStatusFilter>(ALL_STATUSES)
  const [fromDate, setFromDate] = useState<Date | undefined>()
  const [toDate, setToDate] = useState<Date | undefined>()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [toCancel, setToCancel] = useState<AbsenceListItem | null>(null)
  const [toEdit, setToEdit] = useState<AbsenceListItem | null>(null)
  const [toDelete, setToDelete] = useState<AbsenceListItem | null>(null)
  const [highlightSeenAt, setHighlightSeenAt] = useState<
    string | null | undefined
  >(undefined)
  const markedSeenRef = useRef(false)

  const applyData = useCallback((data: AbsenceListResponse) => {
    setAbsences(data.absences)
    setUsers(data.users)
  }, [])

  const hasAdminFilters =
    userFilter !== ALL_USERS ||
    createdByFilter !== ALL_USERS ||
    statusFilter !== ALL_STATUSES ||
    fromDate !== undefined ||
    toDate !== undefined

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setIsLoading(true)
      }

      try {
        if (isAdmin) {
          const params = new URLSearchParams()

          if (userFilter !== ALL_USERS) {
            params.set('userId', userFilter)
          }

          if (createdByFilter !== ALL_USERS) {
            params.set('createdById', createdByFilter)
          }

          if (statusFilter !== ALL_STATUSES) {
            params.set('status', statusFilter)
          }

          const from = toRangeStartIso(fromDate)
          if (from) {
            params.set('from', from)
          }

          const to = toRangeEndIso(toDate)
          if (to) {
            params.set('to', to)
          }

          const queryString = params.toString()
          applyData(
            await api<AbsenceListResponse>(
              `/absences/admin${queryString ? `?${queryString}` : ''}`,
            ),
          )
          return
        }

        applyData(await api<AbsenceListResponse>('/absences'))
      } finally {
        if (!options?.silent) {
          setIsLoading(false)
        }
      }
    },
    [
      applyData,
      createdByFilter,
      fromDate,
      isAdmin,
      statusFilter,
      toDate,
      userFilter,
    ],
  )

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!isAdmin) {
      setCreateUsers(users)
      return
    }

    void (async () => {
      try {
        const data = await api<AbsenceListResponse>('/absences', {
          toastOnError: false,
        })
        setCreateUsers(data.users)
      } catch {
        setCreateUsers(users)
      }
    })()
  }, [isAdmin, users])

  useEffect(() => {
    if (!user?.hasOwnedTeams || isLoading || markedSeenRef.current) {
      return
    }

    markedSeenRef.current = true

    void (async () => {
      try {
        const unseen = await api<AbsenceUnseenCountResponse>(
          '/absences/unseen-count',
          { toastOnError: false },
        )
        setHighlightSeenAt(unseen.absencesSeenAt)
      } catch {
        setHighlightSeenAt(null)
      }

      await markAbsencesSeen()
    })()
  }, [user?.hasOwnedTeams, isLoading])

  const filtered = useMemo(() => {
    if (isAdmin) return absences

    const normalized = query.trim().toLocaleLowerCase('pt-BR')
    if (!normalized) return absences

    return absences.filter(
      (absence) =>
        absence.userName.toLocaleLowerCase('pt-BR').includes(normalized) ||
        absence.createdByName
          .toLocaleLowerCase('pt-BR')
          .includes(normalized),
    )
  }, [absences, isAdmin, query])

  const userFilterOptions = useMemo<UserFilterOption[]>(
    () => users.map((item) => ({ value: item.id, label: item.name })),
    [users],
  )

  const selectedUserFilter =
    userFilter === ALL_USERS
      ? null
      : (userFilterOptions.find((option) => option.value === userFilter) ??
        null)

  const selectedCreatedByFilter =
    createdByFilter === ALL_USERS
      ? null
      : (userFilterOptions.find((option) => option.value === createdByFilter) ??
        null)

  const subtitle = isAdmin
    ? 'Consulte, edite ou exclua todas as ausências da plataforma.'
    : user?.hasOwnedTeams
      ? 'Consulte e agende ausências dos membros das suas equipes.'
      : 'Agende e consulte os seus períodos de ausência.'

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Ausências</h1>
          <p className='text-sm text-muted-foreground'>{subtitle}</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className='size-4' />
          Nova ausência
        </Button>
      </div>

      {isAdmin ? (
        <div className='flex flex-wrap items-end gap-3'>
          <ResponsiveFilters
            description='Filtrar ausências por colaborador, solicitante, status e período.'
            hasActiveFilters={hasAdminFilters}
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
                      setUserFilter(option?.value ?? ALL_USERS)
                    }
                    itemToStringLabel={(item) => item.label}
                    isItemEqualToValue={(a, b) => a.value === b.value}
                  >
                    <ComboboxInput
                      id={`${idPrefix}-user`}
                      className='w-full'
                      placeholder='Todos'
                      showClear={userFilter !== ALL_USERS}
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
                  id={`${idPrefix}-created-by`}
                  label='Solicitante'
                  className={itemClassName}
                >
                  <Combobox
                    items={userFilterOptions}
                    value={selectedCreatedByFilter}
                    onValueChange={(option) =>
                      setCreatedByFilter(option?.value ?? ALL_USERS)
                    }
                    itemToStringLabel={(item) => item.label}
                    isItemEqualToValue={(a, b) => a.value === b.value}
                  >
                    <ComboboxInput
                      id={`${idPrefix}-created-by`}
                      className='w-full'
                      placeholder='Todos'
                      showClear={createdByFilter !== ALL_USERS}
                    />
                    <ComboboxContent>
                      <ComboboxEmpty>Nenhum solicitante encontrado.</ComboboxEmpty>
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
                  label='Status'
                  className={itemClassName}
                >
                  <Select
                    value={statusFilter}
                    onValueChange={(value) =>
                      setStatusFilter(
                        (value as AbsenceStatusFilter) ?? ALL_STATUSES,
                      )
                    }
                  >
                    <SelectTrigger id={`${idPrefix}-status`} className='w-full'>
                      <SelectValue placeholder='Todos'>
                        {(value) =>
                          value === ALL_STATUSES
                            ? 'Todos'
                            : STATUS_LABELS[
                                value as Exclude<AbsenceStatusFilter, 'all'>
                              ]
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_STATUSES}>Todos</SelectItem>
                      <SelectItem value='scheduled'>Agendada</SelectItem>
                      <SelectItem value='ongoing'>Em andamento</SelectItem>
                      <SelectItem value='finished'>Concluída</SelectItem>
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
                    onDateChange={setFromDate}
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
                    onDateChange={setToDate}
                    placeholder='Fim'
                    displayFormat='P'
                    className='w-full'
                  />
                </FilterField>
              </>
            )}
          </ResponsiveFilters>

          {hasAdminFilters ? (
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => {
                setUserFilter(ALL_USERS)
                setCreatedByFilter(ALL_USERS)
                setStatusFilter(ALL_STATUSES)
                setFromDate(undefined)
                setToDate(undefined)
              }}
            >
              Limpar filtros
            </Button>
          ) : null}
        </div>
      ) : users.length > 1 ? (
        <div className='relative max-w-md'>
          <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Buscar por usuário ou criador'
            className='pl-9'
          />
        </div>
      ) : null}

      {isLoading ? (
        <div className='space-y-3'>
          {Array.from({ length: isAdmin ? 5 : 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className={
                isAdmin ? 'h-14 w-full rounded-xl' : 'h-28 w-full rounded-xl'
              }
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className='flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed text-center'>
          <CalendarOff className='mb-3 size-9 text-muted-foreground' />
          <p className='font-medium'>Nenhuma ausência encontrada</p>
          <p className='text-sm text-muted-foreground'>
            {isAdmin
              ? hasAdminFilters
                ? 'Tente ajustar os filtros.'
                : 'Ainda não há ausências registradas na plataforma.'
              : query
                ? 'Tente buscar por outro nome.'
                : 'Crie uma ausência para começar o histórico.'}
          </p>
        </div>
      ) : isAdmin ? (
        <div className='overflow-hidden rounded-xl border bg-card'>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[960px] text-sm'>
              <thead>
                <tr className='border-b bg-brand-soft text-left text-xs text-sidebar-primary'>
                  <th className='px-4 py-3 font-medium'>Colaborador</th>
                  <th className='px-4 py-3 font-medium'>Início</th>
                  <th className='px-4 py-3 font-medium'>Fim</th>
                  <th className='px-4 py-3 font-medium'>Status</th>
                  <th className='px-4 py-3 font-medium'>Solicitante</th>
                  <th className='px-4 py-3 font-medium'>Criada em</th>
                  <th className='px-4 py-3 text-right font-medium'>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((absence) => {
                  const status = getStatus(absence)

                  return (
                    <tr key={absence.id} className='border-b last:border-b-0'>
                      <td className='px-4 py-3 font-medium'>
                        {absence.userName}
                      </td>
                      <td className='px-4 py-3'>
                        {DATE_FORMAT.format(new Date(absence.startedAt))}
                      </td>
                      <td className='px-4 py-3'>
                        {absence.endedAt
                          ? DATE_FORMAT.format(new Date(absence.endedAt))
                          : '—'}
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className='px-4 py-3'>{absence.createdByName}</td>
                      <td className='px-4 py-3'>
                        {DATE_FORMAT.format(new Date(absence.createdAt))}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex justify-end gap-1'>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon-sm'
                            aria-label={`Editar ausência de ${absence.userName}`}
                            onClick={() => setToEdit(absence)}
                          >
                            <Pencil className='size-4' />
                          </Button>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon-sm'
                            aria-label={`Excluir ausência de ${absence.userName}`}
                            onClick={() => setToDelete(absence)}
                          >
                            <Trash2 className='size-4' />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className='space-y-3'>
          {filtered.map((absence) => {
            const status = getStatus(absence)
            const isNew =
              user &&
              highlightSeenAt !== undefined &&
              isNewAbsence(absence, user.id, highlightSeenAt)

            return (
              <article
                key={absence.id}
                className='flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between'
              >
                <div className='min-w-0 space-y-2'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <h2 className='font-medium'>{absence.userName}</h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                    >
                      {status.label}
                    </span>
                    {isNew ? (
                      <span className='rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive'>
                        Nova
                      </span>
                    ) : null}
                  </div>
                  <p className='text-sm'>
                    {DATE_FORMAT.format(new Date(absence.startedAt))}
                    {' — '}
                    {absence.endedAt
                      ? DATE_FORMAT.format(new Date(absence.endedAt))
                      : 'sem término'}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    Criada por {absence.createdByName} em{' '}
                    {DATE_FORMAT.format(new Date(absence.createdAt))}
                  </p>
                </div>

                {absence.canCancel ? (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setToCancel(absence)}
                  >
                    <X className='size-4' />
                    Cancelar
                  </Button>
                ) : null}
              </article>
            )
          })}
        </div>
      )}

      {user ? (
        <CreateAbsenceDialog
          open={isCreateOpen}
          users={createUsers}
          currentUserId={user.id}
          onOpenChange={setIsCreateOpen}
          onCreated={(data) => {
            if (isAdmin) {
              void load({ silent: true })
              return
            }
            applyData(data)
          }}
        />
      ) : null}
      <CancelAbsenceDialog
        absence={toCancel}
        open={toCancel !== null}
        onOpenChange={(open) => {
          if (!open) setToCancel(null)
        }}
        onCancelled={(data) => {
          applyData(data)
          setToCancel(null)
        }}
      />
      {isAdmin ? (
        <>
          <EditAbsenceDialog
            absence={toEdit}
            users={users}
            open={toEdit !== null}
            onOpenChange={(open) => {
              if (!open) setToEdit(null)
            }}
            onUpdated={() => {
              setToEdit(null)
              void load({ silent: true })
            }}
          />
          <DeleteAbsenceDialog
            absence={toDelete}
            open={toDelete !== null}
            onOpenChange={(open) => {
              if (!open) setToDelete(null)
            }}
            onDeleted={() => {
              setToDelete(null)
              void load({ silent: true })
            }}
          />
        </>
      ) : null}
    </div>
  )
}
