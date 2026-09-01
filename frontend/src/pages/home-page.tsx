import { useState } from 'react';
import { Plus } from 'lucide-react';

import { DayTimeline } from '@/components/day-timeline';
import { HomeDashboardHeader } from '@/components/home-dashboard-header';
import { HomeStatsCards } from '@/components/home-stats-cards';
import { NoTeamMessage } from '@/components/no-team-message';
import { RecentWorkItemsCard } from '@/components/recent-work-items-card';
import { StartRecentWorkDialog } from '@/components/start-recent-work-dialog';
import { Button } from '@/components/ui/button';
import { useHomeData } from '@/hooks/use-home-data';
import { useActiveTimer } from '@/hooks/use-active-timer';
import { useAuth } from '@/hooks/use-auth';
import { toDateKey } from '@/lib/date';
import { cn } from '@/lib/utils';

export function HomePage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const {
    todayStats,
    timelineBlocks,
    recentItems,
    isLoadingToday,
    isLoadingTimeline,
    isLoadingRecent,
  } = useHomeData(selectedDate);
  const { hasTimerBar } = useActiveTimer();
  const hasTeams = user?.hasTeams ?? false;

  return (
    <div className='relative flex min-w-0 flex-1 flex-col gap-5 pb-4'>
      <HomeDashboardHeader />

      {!hasTeams ? (
        <NoTeamMessage />
      ) : (
        <>
          <RecentWorkItemsCard items={recentItems} isLoading={isLoadingRecent} />

          <DayTimeline
            blocks={timelineBlocks}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            isLoading={isLoadingTimeline}
          />

          <HomeStatsCards stats={todayStats} isLoading={isLoadingToday} />

          <StartRecentWorkDialog
            open={startDialogOpen}
            onOpenChange={setStartDialogOpen}
          />

          <Button
            type='button'
            size='icon-lg'
            className={cn(
              'fixed right-6 z-20 size-14 rounded-full shadow-lg lg:right-10',
              hasTimerBar ? 'bottom-24' : 'bottom-6',
            )}
            aria-label={
              user?.absent
                ? 'Indisponível enquanto ausente'
                : 'Iniciar apontamento'
            }
            title={user?.absent ? 'Você está marcado como ausente' : undefined}
            disabled={user?.absent}
            onClick={() => setStartDialogOpen(true)}
          >
            <Plus className='size-6' />
          </Button>
        </>
      )}
    </div>
  );
}
