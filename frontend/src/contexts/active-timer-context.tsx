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
import { toast } from 'sonner';

import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api-handler';
import { invalidateHomeData } from '@/lib/home-data-invalidation';
import {
  readPausedTimerTarget,
  writePausedTimerTarget,
} from '@/lib/paused-timer-storage';
import { invalidateTaskData } from '@/lib/task-data-invalidation';
import type {
  ActiveTimer,
  ActiveTimerResponse,
  PauseTimerResponse,
  PausedTimerTarget,
  StartTimerResponse,
} from '@/types/time-entry';

interface ActiveTimerContextValue {
  activeTimer: ActiveTimer | null;
  pausedTarget: PausedTimerTarget | null;
  isActive: boolean;
  hasTimerBar: boolean;
  isStarting: boolean;
  isPausing: boolean;
  refresh: () => Promise<void>;
  startTimer: (teamId: string, activityId: string) => Promise<void>;
  startTaskTimer: (projectId: string, taskId: string) => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  isActivityActive: (activityId: string) => boolean;
  isTaskActive: (taskId: string) => boolean;
  isActivityPaused: (activityId: string) => boolean;
  isTaskPaused: (taskId: string) => boolean;
  isActivityCurrent: (activityId: string) => boolean;
  isTaskCurrent: (taskId: string) => boolean;
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

function toPausedTarget(activeTimer: ActiveTimer): PausedTimerTarget | null {
  if (activeTimer.activity) {
    return { activity: activeTimer.activity };
  }

  if (activeTimer.task) {
    return { task: activeTimer.task };
  }

  return null;
}

export function ActiveTimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [pausedTarget, setPausedTarget] = useState<PausedTimerTarget | null>(
    () => readPausedTimerTarget(),
  );
  const [isStarting, setIsStarting] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const elapsedStoreRef = useRef<ElapsedStore | null>(null);

  if (elapsedStoreRef.current === null) {
    elapsedStoreRef.current = createElapsedStore();
  }

  const elapsedStore = elapsedStoreRef.current;

  const clearPausedTarget = useCallback(() => {
    setPausedTarget(null);
    writePausedTimerTarget(null);
  }, []);

  const setPausedTargetState = useCallback((target: PausedTimerTarget | null) => {
    setPausedTarget(target);
    writePausedTimerTarget(target);
  }, []);

  const refresh = useCallback(async () => {
    const data = await api<ActiveTimerResponse>('/time-entries/active', {
      toastOnError: false,
    });
    setActiveTimer(data.activeTimer);

    if (data.activeTimer) {
      clearPausedTarget();
    }
  }, [clearPausedTarget]);

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
    if (user?.absent) {
      toast.error('Você está ausente e não pode iniciar apontamentos.');
      return;
    }

    setIsStarting(true);
    try {
      const data = await api<StartTimerResponse>(
        `/teams/${teamId}/activities/${activityId}/time-entries`,
        { method: 'POST' },
      );
      setActiveTimer(data.activeTimer);
      clearPausedTarget();
      invalidateHomeData();
      invalidateTaskData();
    } finally {
      setIsStarting(false);
    }
  }, [clearPausedTarget, user?.absent]);

  const startTaskTimer = useCallback(
    async (projectId: string, taskId: string) => {
      if (user?.absent) {
        toast.error('Você está ausente e não pode iniciar apontamentos.');
        return;
      }

      setIsStarting(true);

      try {
        const data = await api<StartTimerResponse>(
          `/projects/${projectId}/tasks/${taskId}/time-entries`,
          { method: 'POST' },
        );
        setActiveTimer(data.activeTimer);
        clearPausedTarget();
        invalidateHomeData();
        invalidateTaskData();
      } finally {
        setIsStarting(false);
      }
    },
    [clearPausedTarget, user?.absent],
  );

  const pauseTimer = useCallback(async () => {
    if (!activeTimer) {
      return;
    }

    const nextPausedTarget = toPausedTarget(activeTimer);
    setIsPausing(true);

    try {
      await api<PauseTimerResponse>('/time-entries/active/pause', {
        method: 'POST',
      });
      setActiveTimer(null);

      if (nextPausedTarget) {
        setPausedTargetState(nextPausedTarget);
      }

      invalidateHomeData();
      invalidateTaskData();
    } finally {
      setIsPausing(false);
    }
  }, [activeTimer, setPausedTargetState]);

  const resumeTimer = useCallback(async () => {
    if (pausedTarget?.activity) {
      await startTimer(
        pausedTarget.activity.teamId,
        pausedTarget.activity.id,
      );
      return;
    }

    if (pausedTarget?.task) {
      await startTaskTimer(
        pausedTarget.task.projectId,
        pausedTarget.task.id,
      );
    }
  }, [pausedTarget, startTimer, startTaskTimer]);

  const isActivityActive = useCallback(
    (activityId: string) => activeTimer?.activity?.id === activityId,
    [activeTimer],
  );

  const isTaskActive = useCallback(
    (taskId: string) => activeTimer?.task?.id === taskId,
    [activeTimer],
  );

  const isActivityPaused = useCallback(
    (activityId: string) =>
      !activeTimer && pausedTarget?.activity?.id === activityId,
    [activeTimer, pausedTarget],
  );

  const isTaskPaused = useCallback(
    (taskId: string) => !activeTimer && pausedTarget?.task?.id === taskId,
    [activeTimer, pausedTarget],
  );

  const isActivityCurrent = useCallback(
    (activityId: string) =>
      activeTimer?.activity?.id === activityId ||
      pausedTarget?.activity?.id === activityId,
    [activeTimer, pausedTarget],
  );

  const isTaskCurrent = useCallback(
    (taskId: string) =>
      activeTimer?.task?.id === taskId || pausedTarget?.task?.id === taskId,
    [activeTimer, pausedTarget],
  );

  const value = useMemo(
    () => ({
      activeTimer,
      pausedTarget,
      isActive: activeTimer !== null,
      hasTimerBar: activeTimer !== null || pausedTarget !== null,
      isStarting,
      isPausing,
      refresh,
      startTimer,
      startTaskTimer,
      pauseTimer,
      resumeTimer,
      isActivityActive,
      isTaskActive,
      isActivityPaused,
      isTaskPaused,
      isActivityCurrent,
      isTaskCurrent,
    }),
    [
      activeTimer,
      pausedTarget,
      isStarting,
      isPausing,
      refresh,
      startTimer,
      startTaskTimer,
      pauseTimer,
      resumeTimer,
      isActivityActive,
      isTaskActive,
      isActivityPaused,
      isTaskPaused,
      isActivityCurrent,
      isTaskCurrent,
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
