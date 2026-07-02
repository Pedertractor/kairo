import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

import { DayTimeline } from '@/components/day-timeline';
import { HomeDashboardHeader } from '@/components/home-dashboard-header';
import { HomeStatsCards } from '@/components/home-stats-cards';
import { RecentWorkItemsCard } from '@/components/recent-work-items-card';
import { Button } from '@/components/ui/button';
import { useHomeData } from '@/hooks/use-home-data';
import { useActiveTimer } from '@/hooks/use-active-timer';
import { toDateKey } from '@/lib/date';
import { cn } from '@/lib/utils';

export function HomePage() {
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const {
    todayStats,
    timelineBlocks,
    recentItems,
    isLoadingToday,
    isLoadingTimeline,
    isLoadingRecent,
  } = useHomeData(selectedDate);
  const { isActive } = useActiveTimer();

  return (
    <div className='relative flex min-w-0 flex-1 flex-col gap-5 pb-4'>
      <HomeDashboardHeader />

      <HomeStatsCards stats={todayStats} isLoading={isLoadingToday} />

      <DayTimeline
        blocks={timelineBlocks}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        isLoading={isLoadingTimeline}
      />

      <RecentWorkItemsCard items={recentItems} isLoading={isLoadingRecent} />

      <Button
        render={<Link to='/equipes' />}
        size='icon-lg'
        className={cn(
          'fixed right-6 z-20 size-14 rounded-full shadow-lg lg:right-10',
          isActive ? 'bottom-24' : 'bottom-6',
        )}
        aria-label='Ir para equipes'
      >
        <Plus className='size-6' />
      </Button>
    </div>
  );
}
