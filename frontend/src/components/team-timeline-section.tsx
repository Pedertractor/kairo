import { useCallback, useEffect, useMemo, useState } from 'react';

import { TeamDayStatsCards } from '@/components/team-day-stats-cards';
import { TeamDayTimeline } from '@/components/team-day-timeline';
import { api } from '@/lib/api-handler';
import { toDateKey } from '@/lib/date';
import type { TeamDayDashboard } from '@/types/time-entry';

interface TeamTimelineSectionProps {
  teamId: string;
  initialDate?: string;
  userId?: string;
}

export function TeamTimelineSection({
  teamId,
  initialDate,
  userId,
}: TeamTimelineSectionProps) {
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(
    initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)
      ? initialDate
      : todayKey,
  );
  const [todayDashboard, setTodayDashboard] = useState<TeamDayDashboard | null>(
    null,
  );
  const [otherDayDashboard, setOtherDayDashboard] =
    useState<TeamDayDashboard | null>(null);
  const [isLoadingToday, setIsLoadingToday] = useState(true);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(true);

  useEffect(() => {
    if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

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
  const allBlocks = timelineDashboard?.blocks ?? [];
  const timelineBlocks = userId
    ? allBlocks.filter((block) => block.userId === userId)
    : allBlocks;
  const filteredUserName = userId
    ? allBlocks.find((block) => block.userId === userId)?.userName
    : undefined;
  const timelineLoading =
    selectedDate === todayKey ? isLoadingToday : isLoadingTimeline;

  return (
    <div className='flex flex-col gap-5'>
      <TeamDayStatsCards
        stats={todayDashboard?.stats ?? null}
        isLoading={isLoadingToday}
      />

      {userId ? (
        <p className='text-sm text-muted-foreground'>
          Mostrando timeline
          {filteredUserName ? (
            <>
              {' '}
              de <span className='font-medium text-foreground'>{filteredUserName}</span>
            </>
          ) : (
            ' do funcionário selecionado'
          )}{' '}
          no dia filtrado.
        </p>
      ) : null}

      <TeamDayTimeline
        blocks={timelineBlocks}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        isLoading={timelineLoading}
      />
    </div>
  );
}
