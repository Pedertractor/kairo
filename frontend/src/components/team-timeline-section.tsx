import { useCallback, useEffect, useMemo, useState } from 'react';

import { TeamDayStatsCards } from '@/components/team-day-stats-cards';
import { TeamDayTimeline } from '@/components/team-day-timeline';
import { api } from '@/lib/api-handler';
import { toDateKey } from '@/lib/date';
import type { TeamDayDashboard } from '@/types/time-entry';

interface TeamTimelineSectionProps {
  teamId: string;
}

export function TeamTimelineSection({ teamId }: TeamTimelineSectionProps) {
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [todayDashboard, setTodayDashboard] = useState<TeamDayDashboard | null>(
    null,
  );
  const [otherDayDashboard, setOtherDayDashboard] =
    useState<TeamDayDashboard | null>(null);
  const [isLoadingToday, setIsLoadingToday] = useState(true);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(true);

  const loadToday = useCallback(async () => {
    setIsLoadingToday(true);

    try {
      const data = await api<TeamDayDashboard>(
        `/teams/${teamId}/time-entries/day?date=${encodeURIComponent(todayKey)}`,
        { toastOnError: false },
      );
      setTodayDashboard(data);
    } finally {
      setIsLoadingToday(false);
    }
  }, [teamId, todayKey]);

  const loadTimelineDay = useCallback(async () => {
    if (selectedDate === todayKey) {
      setOtherDayDashboard(null);
      setIsLoadingTimeline(false);
      return;
    }

    setIsLoadingTimeline(true);

    try {
      const data = await api<TeamDayDashboard>(
        `/teams/${teamId}/time-entries/day?date=${encodeURIComponent(selectedDate)}`,
        { toastOnError: false },
      );
      setOtherDayDashboard(data);
    } finally {
      setIsLoadingTimeline(false);
    }
  }, [selectedDate, teamId, todayKey]);

  useEffect(() => {
    void loadToday();
  }, [loadToday]);

  useEffect(() => {
    void loadTimelineDay();
  }, [loadTimelineDay]);

  const timelineDashboard =
    selectedDate === todayKey ? todayDashboard : otherDayDashboard;
  const timelineBlocks = timelineDashboard?.blocks ?? [];
  const timelineLoading =
    selectedDate === todayKey ? isLoadingToday : isLoadingTimeline;

  return (
    <div className='flex flex-col gap-5'>
      <TeamDayStatsCards stats={todayDashboard?.stats ?? null} isLoading={isLoadingToday} />

      <TeamDayTimeline
        blocks={timelineBlocks}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        isLoading={timelineLoading}
      />
    </div>
  );
}
