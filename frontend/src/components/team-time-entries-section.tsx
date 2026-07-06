import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';

import { DatePicker } from '@/components/date-picker';
import { EditTaskTimeEntryDialog } from '@/components/edit-task-time-entry-dialog';
import { TimeEntryDuration } from '@/components/time-entry-duration';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api-handler';
import { fromDateKey, toDateKey } from '@/lib/date';
import { formatDateTime } from '@/lib/time-format';
import type {
  RecentWorkItemKind,
  TeamTimeEntriesResponse,
  TeamTimeEntrySummary,
} from '@/types/time-entry';

const PAGE_SIZE = 6;

const KIND_LABELS: Record<RecentWorkItemKind, string> = {
  ACTIVITY: 'Atividade',
  PROJECT: 'Projeto',
  TASK: 'Tarefa',
};

function getEntryHref(
  teamId: string,
  entry: TeamTimeEntrySummary,
): string | null {
  if (entry.kind === 'TASK' && entry.projectId && entry.taskId) {
    return `/projetos/${entry.projectId}/tarefas/${entry.taskId}`;
  }

  if (entry.kind === 'ACTIVITY' && entry.activityId) {
    return `/equipes/${teamId}/atividades/${entry.activityId}`;
  }

  if (entry.kind === 'PROJECT' && entry.projectId) {
    return `/projetos/${entry.projectId}`;
  }

  return null;
}

interface TeamTimeEntriesSectionProps {
  teamId: string;
}

export function TeamTimeEntriesSection({ teamId }: TeamTimeEntriesSectionProps) {
  const { user } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TeamTimeEntrySummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [isLoading, setIsLoading] = useState(true);
  const [entryToEdit, setEntryToEdit] = useState<TeamTimeEntrySummary | null>(
    null,
  );

  const loadTimeEntries = useCallback(async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        date: selectedDate,
      });

      const data = await api<TeamTimeEntriesResponse>(
        `/teams/${teamId}/time-entries?${params.toString()}`,
      );

      setTimeEntries(data.timeEntries);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } finally {
      setIsLoading(false);
    }
  }, [teamId, page, selectedDate]);

  useEffect(() => {
    void loadTimeEntries();
  }, [loadTimeEntries]);

  useEffect(() => {
    setPage(1);
  }, [selectedDate]);

  function canEditEntry(entry: TeamTimeEntrySummary) {
    return entry.userId === user?.id;
  }

  function handleEntryUpdated() {
    void loadTimeEntries();
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-sm font-medium'>Apontamentos</p>
          <p className='text-sm text-muted-foreground'>
            Registros de horas dos membros desta equipe.
          </p>
        </div>

        <div className='flex flex-col gap-2 sm:w-52'>
          <Label htmlFor='team-entries-date'>Filtrar por dia</Label>
          <DatePicker
            id='team-entries-date'
            date={fromDateKey(selectedDate)}
            displayFormat='dd-MM-yy'
            onDateChange={(date) => {
              if (date) {
                setSelectedDate(toDateKey(date));
              }
            }}
          />
        </div>
      </div>

      <EditTaskTimeEntryDialog
        entry={entryToEdit}
        open={entryToEdit !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEntryToEdit(null);
          }
        }}
        onUpdated={() => {
          handleEntryUpdated();
        }}
      />

      {isLoading ? (
        <div className='flex flex-col gap-2'>
          {Array.from({ length: PAGE_SIZE }).map((_, index) => (
            <Skeleton key={index} className='h-14 rounded-xl' />
          ))}
        </div>
      ) : timeEntries.length === 0 ? (
        <div className='flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center'>
          <p className='text-sm font-medium'>Nenhum apontamento neste dia</p>
          <p className='max-w-sm text-sm text-muted-foreground'>
            Os apontamentos dos membros desta equipe para o dia selecionado
            aparecerão aqui.
          </p>
        </div>
      ) : (
        <>
          <div className='overflow-hidden rounded-xl border bg-card'>
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[880px] text-sm'>
                <thead>
                  <tr className='border-b bg-[#C5D3FF] text-left text-xs text-sidebar-primary'>
                    <th className='px-4 py-3 font-medium'>Membro</th>
                    <th className='px-4 py-3 font-medium'>Item</th>
                    <th className='px-4 py-3 font-medium'>Início</th>
                    <th className='px-4 py-3 font-medium'>Fim</th>
                    <th className='px-4 py-3 font-medium'>Duração</th>
                    <th className='px-4 py-3 text-right font-medium'>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {timeEntries.map((entry) => {
                    const href = getEntryHref(teamId, entry);

                    return (
                      <tr key={entry.id} className='border-b last:border-b-0'>
                        <td className='px-4 py-3 font-medium'>
                          {entry.userName}
                        </td>
                        <td className='px-4 py-3'>
                          <div className='flex flex-col gap-0.5'>
                            <span className='text-xs text-muted-foreground'>
                              {KIND_LABELS[entry.kind]}
                            </span>
                            {href ? (
                              <Link
                                to={href}
                                className='font-medium hover:underline'
                              >
                                {entry.title}
                              </Link>
                            ) : (
                              <span className='font-medium'>{entry.title}</span>
                            )}
                            {entry.parentTitle ? (
                              <span className='text-xs text-muted-foreground'>
                                {entry.parentTitle}
                              </span>
                            ) : null}
                          </div>
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
                        <td className='px-4 py-3 text-right'>
                          {canEditEntry(entry) ? (
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon-sm'
                              aria-label='Editar apontamento'
                              onClick={() => setEntryToEdit(entry)}
                            >
                              <Pencil />
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-sm text-muted-foreground'>
              {total === 0
                ? 'Nenhum apontamento'
                : `Página ${page} de ${Math.max(totalPages, 1)} (${total} apontamento${total === 1 ? '' : 's'})`}
            </p>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={page <= 1}
                onClick={() => setPage((currentPage) => currentPage - 1)}
              >
                Anterior
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
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
  );
}
