import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarOff, Plus, Search, X } from 'lucide-react'

import { CancelAbsenceDialog } from '@/components/cancel-absence-dialog'
import { CreateAbsenceDialog } from '@/components/create-absence-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-handler'
import type {
  AbsenceListItem,
  AbsenceListResponse,
  AbsenceUserOption,
} from '@/types/absence'

const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

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

export function AbsencesPage() {
  const { user } = useAuth()
  const [absences, setAbsences] = useState<AbsenceListItem[]>([])
  const [users, setUsers] = useState<AbsenceUserOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [toCancel, setToCancel] = useState<AbsenceListItem | null>(null)

  const applyData = useCallback((data: AbsenceListResponse) => {
    setAbsences(data.absences)
    setUsers(data.users)
  }, [])

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      applyData(await api<AbsenceListResponse>('/absences'))
    } finally {
      setIsLoading(false)
    }
  }, [applyData])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR')
    if (!normalized) return absences

    return absences.filter(
      (absence) =>
        absence.userName.toLocaleLowerCase('pt-BR').includes(normalized) ||
        absence.createdByName
          .toLocaleLowerCase('pt-BR')
          .includes(normalized),
    )
  }, [absences, query])

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Ausências</h1>
          <p className='text-sm text-muted-foreground'>
            {user?.hasOwnedTeams
              ? 'Consulte e agende ausências dos membros das suas equipes.'
              : 'Agende e consulte os seus períodos de ausência.'}
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className='size-4' />
          Nova ausência
        </Button>
      </div>

      {users.length > 1 ? (
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
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className='h-28 w-full rounded-xl' />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className='flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed text-center'>
          <CalendarOff className='mb-3 size-9 text-muted-foreground' />
          <p className='font-medium'>Nenhuma ausência encontrada</p>
          <p className='text-sm text-muted-foreground'>
            {query
              ? 'Tente buscar por outro nome.'
              : 'Crie uma ausência para começar o histórico.'}
          </p>
        </div>
      ) : (
        <div className='space-y-3'>
          {filtered.map((absence) => {
            const status = getStatus(absence)
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
          users={users}
          currentUserId={user.id}
          onOpenChange={setIsCreateOpen}
          onCreated={applyData}
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
    </div>
  )
}
