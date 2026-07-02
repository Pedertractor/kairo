import { useCallback, useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'

import { EditTaskTimeEntryDialog } from '@/components/edit-task-time-entry-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-handler'
import { formatLoggedDuration } from '@/lib/format-duration'
import { formatDateTime } from '@/lib/time-format'
import { toDateKey } from '@/lib/date'
import type { TaskTimeEntriesResponse, TaskTimeEntrySummary } from '@/types/time-entry'

const PAGE_SIZE = 10

interface TaskTimeEntriesSectionProps {
  projectId: string
  taskId: string
  onUpdated?: () => void
}

export function TaskTimeEntriesSection({
  projectId,
  taskId,
  onUpdated,
}: TaskTimeEntriesSectionProps) {
  const { user } = useAuth()
  const [timeEntries, setTimeEntries] = useState<TaskTimeEntrySummary[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()))
  const [isLoading, setIsLoading] = useState(true)
  const [entryToEdit, setEntryToEdit] = useState<TaskTimeEntrySummary | null>(
    null,
  )

  const isAdmin = user?.role === 'ADMIN'

  const loadTimeEntries = useCallback(async () => {
    setIsLoading(true)

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        date: selectedDate,
      })

      const data = await api<TaskTimeEntriesResponse>(
        `/projects/${projectId}/tasks/${taskId}/time-entries?${params.toString()}`,
      )

      setTimeEntries(data.timeEntries)
      setTotal(data.pagination.total)
      setTotalPages(data.pagination.totalPages)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, taskId, page, selectedDate])

  useEffect(() => {
    void loadTimeEntries()
  }, [loadTimeEntries])

  useEffect(() => {
    setPage(1)
  }, [selectedDate])

  function canEditEntry(entry: TaskTimeEntrySummary) {
    return isAdmin && entry.userId === user?.id
  }

  function handleEntryUpdated() {
    void loadTimeEntries()
    onUpdated?.()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium">Apontamentos</p>
          <p className="text-sm text-muted-foreground">
            Horas registradas nesta tarefa e quem as fez.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:w-52">
          <Label htmlFor="task-entries-date">Filtrar por dia</Label>
          <Input
            id="task-entries-date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </div>
      </div>

      <EditTaskTimeEntryDialog
        projectId={projectId}
        taskId={taskId}
        entry={entryToEdit}
        open={entryToEdit !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEntryToEdit(null)
          }
        }}
        onUpdated={() => {
          handleEntryUpdated()
        }}
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : timeEntries.length === 0 ? (
        <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium">Nenhum apontamento neste dia</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Os apontamentos desta tarefa para o dia selecionado aparecerão aqui.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Usuário</th>
                    <th className="px-4 py-3 font-medium">Início</th>
                    <th className="px-4 py-3 font-medium">Fim</th>
                    <th className="px-4 py-3 font-medium">Duração</th>
                    <th className="px-4 py-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {timeEntries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-medium">{entry.userName}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(entry.startedAt)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {entry.endedAt
                          ? formatDateTime(entry.endedAt)
                          : 'Em andamento'}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatLoggedDuration(entry.durationSeconds ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canEditEntry(entry) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Editar apontamento"
                            onClick={() => setEntryToEdit(entry)}
                          >
                            <Pencil />
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {total === 0
                ? 'Nenhum apontamento'
                : `Página ${page} de ${Math.max(totalPages, 1)} (${total} apontamento${total === 1 ? '' : 's'})`}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((currentPage) => currentPage - 1)}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || totalPages === 0}
                onClick={() => setPage((currentPage) => currentPage + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
