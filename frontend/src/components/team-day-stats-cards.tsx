import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatChangePercent,
  formatLoggedDuration,
} from '@/lib/format-duration';
import type { TeamDayDashboardStats } from '@/types/time-entry';

interface TeamDayStatsCardsProps {
  stats: TeamDayDashboardStats | null;
  isLoading: boolean;
}

export function TeamDayStatsCards({ stats, isLoading }: TeamDayStatsCardsProps) {
  const changeLabel = stats ? formatChangePercent(stats.changePercent) : null;

  return (
    <div className='grid max-w-3xl gap-4 sm:grid-cols-2'>
      <Card className='gap-0 rounded-2xl border-0 bg-card py-5 shadow-sm'>
        <CardContent className='space-y-2'>
          <p className='text-[11px] font-medium tracking-wider text-muted-foreground uppercase'>
            Tempo apontado
          </p>

          {isLoading ? (
            <Skeleton className='h-9 w-32' />
          ) : (
            <div className='flex items-baseline gap-3'>
              <span className='text-3xl font-bold tracking-tight text-sidebar-primary'>
                {formatLoggedDuration(stats?.loggedSeconds ?? 0)}
              </span>
              {changeLabel ? (
                <span className='text-sm font-semibold text-sidebar-primary'>
                  {changeLabel}
                </span>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className='gap-0 rounded-2xl border-0 bg-card py-5 shadow-sm'>
        <CardContent className='space-y-2'>
          <p className='text-[11px] font-medium tracking-wider text-muted-foreground uppercase'>
            Membros ativos
          </p>

          {isLoading ? (
            <Skeleton className='h-9 w-20' />
          ) : (
            <div className='flex items-baseline gap-2'>
              <span className='text-3xl font-bold tracking-tight text-foreground'>
                {String(stats?.activeMembers ?? 0).padStart(2, '0')}
              </span>
              <span className='text-sm text-muted-foreground'>Membros</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
