import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus } from 'lucide-react';

import { DatePicker } from '@/components/date-picker';
import { EditTaskTimeEntryDialog } from '@/components/edit-task-time-entry-dialog';
import { StartRecentWorkDialog } from '@/components/start-recent-work-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveTimer } from '@/hooks/use-active-timer';
import { api } from '@/lib/api-handler';
import { fromDateKey, toDateKey } from '@/lib/date';
import { formatLoggedDuration } from '@/lib/format-duration';
import { formatDateTime } from '@/lib/time-format';
import { cn } from '@/lib/utils';
import type {
  RecentWorkItemKind,
  UserTimeEntriesResponse,
  UserTimeEntrySummary,
} from '@/types/time-entry';

const PAGE_SIZE = 6;

const KIND_LABELS: Record<RecentWorkItemKind, string> = {
  ACTIVITY: 'Atividade',
  PROJECT: 'Projeto',
  TASK: 'Tarefa',
};

function getEntryHref(entry: UserTimeEntrySummary): string | null {
  if (entry.kind === 'TASK' && entry.projectId && entry.taskId) {
    return `/projetos/${entry.projectId}/tarefas/${entry.taskId}`;
  }

  if (entry.kind === 'ACTIVITY' && entry.activityId) {
    return `/equipes/${entry.teamId}/atividades/${entry.activityId}`;
  }

  if (entry.kind === 'PROJECT' && entry.projectId) {
    return `/projetos/${entry.projectId}`;
  }

  return null;
}

export function ApontamentosPage() {
  const [timeEntries, setTimeEntries] = useState<UserTimeEntrySummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [isLoading, setIsLoading] = useState(true);
  const [entryToEdit, setEntryToEdit] = useState<UserTimeEntrySummary | null>(
    null,
  );
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const { isActive } = useActiveTimer();

  const loadTimeEntries = useCallback(async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        date: selectedDate,
      });

      const data = await api<UserTimeEntriesResponse>(
        `/time-entries?${params.toString()}`,
      );

      setTimeEntries(data.timeEntries);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedDate]);

  useEffect(() => {
    void loadTimeEntries();
  }, [loadTimeEntries]);

  useEffect(() => {
    setPage(1);
  }, [selectedDate]);

  function handleEntryUpdated() {
    void loadTimeEntries();
  }

  return (
    <div className='relative flex flex-1 flex-col gap-6 pb-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Apontamentos</h1>
          <p className='text-sm text-muted-foreground'>
            Registros de horas das suas atividades e tarefas.
          </p>
        </div>

        <div className='flex flex-col gap-2 sm:w-52'>
          <Label htmlFor='apontamentos-date'>Filtrar por dia</Label>
          <DatePicker
            id='apontamentos-date'
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

      <StartRecentWorkDialog
        open={startDialogOpen}
        onOpenChange={setStartDialogOpen}
        onStarted={handleEntryUpdated}
      />

      <Button
        type='button'
        size='icon-lg'
        className={cn(
          'fixed right-6 z-20 size-14 rounded-full shadow-lg lg:right-10',
          isActive ? 'bottom-24' : 'bottom-6',
        )}
        aria-label='Iniciar apontamento'
        onClick={() => setStartDialogOpen(true)}
      >
        <Plus className='size-6' />
      </Button>

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
            Os seus apontamentos de horas para o dia selecionado aparecerão
            aqui.
          </p>
        </div>
      ) : (
        <>
          <div className='overflow-hidden rounded-xl border bg-card'>
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[800px] text-sm'>
                <thead>
                  <tr className='border-b bg-[#C5D3FF] text-left text-xs text-sidebar-primary'>
                    <th className='px-4 py-3 font-medium'>Item</th>
                    <th className='px-4 py-3 font-medium'>Equipe</th>
                    <th className='px-4 py-3 font-medium'>Início</th>
                    <th className='px-4 py-3 font-medium'>Fim</th>
                    <th className='px-4 py-3 font-medium'>Duração</th>
                    <th className='px-4 py-3 text-right font-medium'>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {timeEntries.map((entry) => {
                    const href = getEntryHref(entry);

                    return (
                      <tr key={entry.id} className='border-b last:border-b-0'>
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
                        <td className='px-4 py-3 tabular-nums'>
                          {formatLoggedDuration(entry.durationSeconds ?? 0)}
                        </td>
                        <td className='px-4 py-3 text-right'>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon-sm'
                            aria-label='Editar apontamento'
                            onClick={() => setEntryToEdit(entry)}
                          >
                            <Pencil />
                          </Button>
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
