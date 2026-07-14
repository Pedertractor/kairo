import { useCallback, useEffect, useMemo, useState } from 'react'

import { api } from '@/lib/api-handler'
import { toDateKey } from '@/lib/date'
import { subscribeHomeDataInvalidation } from '@/lib/home-data-invalidation'
import { fetchCached } from '@/lib/query-cache'
import type {
  DayDashboard,
  RecentWorkItem,
  RecentWorkItemsResponse,
} from '@/types/time-entry'

function fetchDayDashboard(date: string, force = false) {
  return fetchCached(
    `day:${date}`,
    () =>
      api<DayDashboard>(
        `/time-entries/day?date=${encodeURIComponent(date)}`,
        { toastOnError: false },
      ),
    60_000,
    force,
  )
}

function fetchRecentItems(force = false) {
  return fetchCached(
    'recent',
    () =>
      api<RecentWorkItemsResponse>('/time-entries/recent', {
        toastOnError: false,
      }).then((data) => data.items),
    60_000,
    force,
  )
}

export function useHomeData(selectedDate: string) {
  const todayKey = useMemo(() => toDateKey(new Date()), [])

  const [todayDashboard, setTodayDashboard] = useState<DayDashboard | null>(null)
  const [otherDayDashboard, setOtherDayDashboard] = useState<DayDashboard | null>(
    null,
  )
  const [recentItems, setRecentItems] = useState<RecentWorkItem[]>([])
  const [isLoadingToday, setIsLoadingToday] = useState(true)
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(true)
  const [isLoadingRecent, setIsLoadingRecent] = useState(true)

  const loadToday = useCallback(async (force = false) => {
    setIsLoadingToday(true)

    try {
      const data = await fetchDayDashboard(todayKey, force)
      setTodayDashboard(data)
    } finally {
      setIsLoadingToday(false)
    }
  }, [todayKey])

  const loadTimelineDay = useCallback(
    async (force = false) => {
      if (selectedDate === todayKey) {
        setOtherDayDashboard(null)
        setIsLoadingTimeline(false)
        return
      }

      setIsLoadingTimeline(true)

      try {
        const data = await fetchDayDashboard(selectedDate, force)
        setOtherDayDashboard(data)
      } finally {
        setIsLoadingTimeline(false)
      }
    },
    [selectedDate, todayKey],
  )

  const loadRecent = useCallback(async (force = false) => {
    setIsLoadingRecent(true)

    try {
      const items = await fetchRecentItems(force)
      setRecentItems(items)
    } finally {
      setIsLoadingRecent(false)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    await Promise.all([loadToday(true), loadTimelineDay(true), loadRecent(true)])
  }, [loadToday, loadTimelineDay, loadRecent])

  useEffect(() => {
    void loadToday()
    void loadRecent()
  }, [loadToday, loadRecent])

  useEffect(() => {
    void loadTimelineDay()
  }, [loadTimelineDay])

  useEffect(() => subscribeHomeDataInvalidation(() => void refreshAll()), [refreshAll])

  const timelineDashboard =
    selectedDate === todayKey ? todayDashboard : otherDayDashboard

  return {
    todayKey,
    todayStats: todayDashboard?.stats ?? null,
    timelineBlocks: timelineDashboard?.blocks ?? [],
    recentItems,
    isLoadingToday,
    isLoadingTimeline,
    isLoadingRecent,
  }
}
