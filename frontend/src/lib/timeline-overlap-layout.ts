import { getMinutesOnSelectedDay } from '@/lib/timeline-day';

export interface TimelineLayoutInput {
  id: string;
  startedAt: string;
  endedAt: string | null;
}

export interface TimelineLayoutResult<T extends TimelineLayoutInput> {
  block: T;
  column: number;
  totalColumns: number;
  startMinutes: number;
  endMinutes: number;
}

export function layoutOverlappingBlocks<T extends TimelineLayoutInput>(
  blocks: T[],
  rangeStart: number,
  rangeEnd: number,
  now: Date,
  selectedDate: string,
): TimelineLayoutResult<T>[] {
  const items = blocks
    .map((block) => {
      const start = Math.max(
        getMinutesOnSelectedDay(block.startedAt, selectedDate),
        rangeStart,
      );
      const end = block.endedAt
        ? Math.min(
            getMinutesOnSelectedDay(block.endedAt, selectedDate),
            rangeEnd,
          )
        : Math.min(
            getMinutesOnSelectedDay(now.toISOString(), selectedDate),
            rangeEnd,
          );

      return { block, start, end };
    })
    .filter((item) => item.end > item.start)
    .sort(
      (left, right) =>
        left.start - right.start || right.end - right.start - (left.end - left.start),
    );

  const clusters: (typeof items)[] = [];
  let currentCluster: typeof items = [];
  let clusterEnd = -1;

  for (const item of items) {
    if (currentCluster.length === 0 || item.start < clusterEnd) {
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.end);
      continue;
    }

    clusters.push(currentCluster);
    currentCluster = [item];
    clusterEnd = item.end;
  }

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const results: TimelineLayoutResult<T>[] = [];

  for (const cluster of clusters) {
    const columnEnds: number[] = [];
    const clusterLayouts: {
      block: T;
      start: number;
      end: number;
      column: number;
    }[] = [];

    for (const item of cluster) {
      let column = columnEnds.findIndex((columnEnd) => columnEnd <= item.start);

      if (column === -1) {
        column = columnEnds.length;
        columnEnds.push(item.end);
      } else {
        columnEnds[column] = item.end;
      }

      clusterLayouts.push({
        block: item.block,
        start: item.start,
        end: item.end,
        column,
      });
    }

    const totalColumns = columnEnds.length;

    for (const layout of clusterLayouts) {
      results.push({
        block: layout.block,
        column: layout.column,
        totalColumns,
        startMinutes: layout.start,
        endMinutes: layout.end,
      });
    }
  }

  return results;
}
