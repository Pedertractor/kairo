import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { api } from '@/lib/api-handler';
import { invalidateHomeData } from '@/lib/home-data-invalidation';
import { invalidateTaskData } from '@/lib/task-data-invalidation';
import type {
  ActiveTimer,
  ActiveTimerResponse,
  PauseTimerResponse,
  StartTimerResponse,
} from '@/types/time-entry';

interface ActiveTimerContextValue {
  activeTimer: ActiveTimer | null;
  isActive: boolean;
  isStarting: boolean;
  isPausing: boolean;
  refresh: () => Promise<void>;
  startTimer: (teamId: string, activityId: string) => Promise<void>;
  startTaskTimer: (projectId: string, taskId: string) => Promise<void>;
  pauseTimer: () => Promise<void>;
  isActivityActive: (activityId: string) => boolean;
  isTaskActive: (taskId: string) => boolean;
}

interface ElapsedStore {
  subscribe: (onStoreChange: () => void) => () => void;
  getSnapshot: () => number;
  setElapsed: (seconds: number) => void;
}

const ActiveTimerContext = createContext<ActiveTimerContextValue | null>(null);
const ElapsedStoreContext = createContext<ElapsedStore | null>(null);

function createElapsedStore(): ElapsedStore {
  let elapsedSeconds = 0;
  const listeners = new Set<() => void>();

  return {
    subscribe(onStoreChange) {
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    getSnapshot() {
      return elapsedSeconds;
    },
    setElapsed(seconds) {
      if (elapsedSeconds === seconds) {
        return;
      }

      elapsedSeconds = seconds;
      listeners.forEach((listener) => listener());
    },
  };
}

export function ActiveTimerProvider({ children }: { children: ReactNode }) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const elapsedStoreRef = useRef<ElapsedStore | null>(null);

  if (elapsedStoreRef.current === null) {
    elapsedStoreRef.current = createElapsedStore();
  }

  const elapsedStore = elapsedStoreRef.current;

  const refresh = useCallback(async () => {
    const data = await api<ActiveTimerResponse>('/time-entries/active', {
      toastOnError: false,
    });
    setActiveTimer(data.activeTimer);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!activeTimer) {
      elapsedStore.setElapsed(0);
      return;
    }

    const startedAt = new Date(activeTimer.timeEntry.startedAt).getTime();

    const updateElapsed = () => {
      elapsedStore.setElapsed(
        Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
      );
    };

    updateElapsed();
    const intervalId = window.setInterval(updateElapsed, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeTimer, elapsedStore]);

  const startTimer = useCallback(async (teamId: string, activityId: string) => {
    setIsStarting(true);

    try {
      const data = await api<StartTimerResponse>(
        `/teams/${teamId}/activities/${activityId}/time-entries`,
        { method: 'POST' },
      );
      setActiveTimer(data.activeTimer);
      invalidateHomeData();
      invalidateTaskData();
    } finally {
      setIsStarting(false);
    }
  }, []);

  const startTaskTimer = useCallback(
    async (projectId: string, taskId: string) => {
      setIsStarting(true);

      try {
        const data = await api<StartTimerResponse>(
          `/projects/${projectId}/tasks/${taskId}/time-entries`,
          { method: 'POST' },
        );
        setActiveTimer(data.activeTimer);
        invalidateHomeData();
        invalidateTaskData();
      } finally {
        setIsStarting(false);
      }
    },
    [],
  );

  const pauseTimer = useCallback(async () => {
    setIsPausing(true);

    try {
      await api<PauseTimerResponse>('/time-entries/active/pause', {
        method: 'POST',
      });
      setActiveTimer(null);
      invalidateHomeData();
      invalidateTaskData();
    } finally {
      setIsPausing(false);
    }
  }, []);

  const isActivityActive = useCallback(
    (activityId: string) => activeTimer?.activity?.id === activityId,
    [activeTimer],
  );

  const isTaskActive = useCallback(
    (taskId: string) => activeTimer?.task?.id === taskId,
    [activeTimer],
  );

  const value = useMemo(
    () => ({
      activeTimer,
      isActive: activeTimer !== null,
      isStarting,
      isPausing,
      refresh,
      startTimer,
      startTaskTimer,
      pauseTimer,
      isActivityActive,
      isTaskActive,
    }),
    [
      activeTimer,
      isStarting,
      isPausing,
      refresh,
      startTimer,
      startTaskTimer,
      pauseTimer,
      isActivityActive,
      isTaskActive,
    ],
  );

  return (
    <ElapsedStoreContext.Provider value={elapsedStore}>
      <ActiveTimerContext.Provider value={value}>
        {children}
      </ActiveTimerContext.Provider>
    </ElapsedStoreContext.Provider>
  );
}

export function useActiveTimer() {
  const context = useContext(ActiveTimerContext);

  if (!context) {
    throw new Error(
      'useActiveTimer deve ser usado dentro de ActiveTimerProvider',
    );
  }

  return context;
}

/** Subscribes only to the 1s tick — does not re-render on other timer state changes. */
export function useElapsedSeconds() {
  const store = useContext(ElapsedStoreContext);

  if (!store) {
    throw new Error(
      'useElapsedSeconds deve ser usado dentro de ActiveTimerProvider',
    );
  }

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
