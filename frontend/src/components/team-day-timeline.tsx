import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { Minus, Plus } from 'lucide-react';

import { TeamTimelineBlock } from '@/components/team-timeline-block';
import { TimelineAbsenceBand } from '@/components/timeline-absence-band';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  UNTAGGED_BLOCK_COLOR,
  buildMemberColorMap,
  buildTagColorScheme,
  untaggedBlockColorScheme,
} from '@/lib/member-colors';
import { toDateKey } from '@/lib/date';
import { formatCurrentTime } from '@/lib/format-time';
import {
  formatDayMinutes,
  getTimelineIntervalStyle,
  getVisibleTimelineRange,
} from '@/lib/timeline-day';
import { layoutOverlappingBlocks } from '@/lib/timeline-overlap-layout';
import { cn } from '@/lib/utils';
import type {
  AdminTeamsTimelineMember,
  TeamDayAbsenceBlock,
  TeamDayTimelineBlock,
} from '@/types/time-entry';

dayjs.locale('pt-br');

const TIMELINE_VIEWPORT_HEIGHT = 440;
const TIMELINE_EDGE_PADDING = 14;
const BASE_HOUR_HEIGHT = 58;
const MIN_ZOOM = 1;
const MAX_ZOOM = 10;
const ZOOM_IN_FACTOR = 1.45;
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;
/** Keeps the now line just past the newest block so the day feels like it's growing. */
const NOW_LINE_LEAD_MINUTES = 8;
/** Pixel gap under a running block — 0 keeps the marker glued to the tip. */
const NOW_LINE_LIVE_LEAD_PX = 0;

interface TeamDayTimelineProps {
  blocks: TeamDayTimelineBlock[];
  absences?: TeamDayAbsenceBlock[];
  members?: AdminTeamsTimelineMember[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  isLoading: boolean;
  showDateOptions?: boolean;
  /** Colors each block by its activity tag, falling back to the member color. */
  colorBlocksByTag?: boolean;
  title?: string;
  headerExtra?: ReactNode;
}

interface DateOption {
  key: string;
  label: string;
}

interface TimelineTick {
  minutes: number;
  major: boolean;
  label: string | null;
}

function buildDateOptions(extraDate?: string): DateOption[] {
  const today = new Date();

  const options = Array.from({ length: 4 }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - index);

    const key = toDateKey(date);
    let label: string;

    if (index === 0) {
      label = 'Hoje';
    } else if (index === 1) {
      label = 'Ontem';
    } else {
      label = dayjs(date).format('ddd');
    }

    return { key, label };
  });

  if (extraDate && !options.some((option) => option.key === extraDate)) {
    options.push({
      key: extraDate,
      label: dayjs(extraDate).format('DD/MM'),
    });
    options.sort((left, right) => right.key.localeCompare(left.key));
  }

  return options;
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function formatTickLabel(minutes: number): string {
  return formatDayMinutes(minutes);
}

function getTickInterval(zoom: number): number {
  if (zoom >= 6) return 1;
  if (zoom >= 4) return 5;
  if (zoom >= 2.5) return 10;
  if (zoom >= 1.75) return 15;
  if (zoom >= 1.2) return 30;

  return 60;
}

function shouldShowTickLabel(minutes: number, zoom: number): boolean {
  const major = minutes % 60 === 0;

  if (major) return true;
  if (zoom >= 6) return minutes % 5 === 0;
  if (zoom >= 4) return minutes % 5 === 0;
  if (zoom >= 2.5) return minutes % 10 === 0;
  if (zoom >= 1.2) return minutes % 30 === 0;

  return false;
}

function buildTicks(
  zoom: number,
  rangeStart: number,
  rangeEnd: number,
): TimelineTick[] {
  const interval = getTickInterval(zoom);
  const ticks: TimelineTick[] = [];

  for (let minutes = rangeStart; minutes <= rangeEnd; minutes += interval) {
    const major = minutes % 60 === 0;

    ticks.push({
      minutes,
      major,
      label: shouldShowTickLabel(minutes, zoom)
        ? formatTickLabel(minutes)
        : null,
    });
  }

  return ticks;
}

const COLUMN_GAP_PX = 4;
const MEMBER_COLUMN_MIN_WIDTH_PX = 96;
const TIME_GUTTER_PX = 64;

export function TeamDayTimeline({
  blocks: rawBlocks,
  absences: rawAbsences = [],
  members,
  selectedDate,
  onDateChange,
  isLoading,
  showDateOptions = true,
  colorBlocksByTag = false,
  title = 'Timeline do Dia',
  headerExtra,
}: TeamDayTimelineProps) {
  const dateOptions = useMemo(
    () => buildDateOptions(selectedDate),
    [selectedDate],
  );
  const isToday = selectedDate === toDateKey(new Date());
  const [now, setNow] = useState(() => new Date());
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const scrollRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  const pointerYRef = useRef(TIMELINE_VIEWPORT_HEIGHT / 2);
  const isHoveringRef = useRef(false);

  zoomRef.current = zoom;

  const blocks = useMemo(() => {
    if (!members) {
      return rawBlocks;
    }

    const allowedIds = new Set(members.map((member) => member.userId));
    return rawBlocks.filter((block) => allowedIds.has(block.userId));
  }, [members, rawBlocks]);

  const absences = useMemo(() => {
    if (!members) {
      return rawAbsences;
    }

    const allowedIds = new Set(members.map((member) => member.userId));
    return rawAbsences.filter((absence) => allowedIds.has(absence.userId));
  }, [members, rawAbsences]);

  const hourHeight = BASE_HOUR_HEIGHT * zoom;
  const { rangeStart, rangeEnd } = getVisibleTimelineRange(
    [...blocks, ...absences],
    selectedDate,
    now,
  );
  const timelineSpanHours = (rangeEnd - rangeStart) / 60;
  const contentHeight =
    timelineSpanHours * hourHeight + TIMELINE_EDGE_PADDING * 2;
  const ticks = useMemo(
    () => buildTicks(zoom, rangeStart, rangeEnd),
    [zoom, rangeStart, rangeEnd],
  );

  const memberColorMap = useMemo(
    () =>
      buildMemberColorMap(
        members
          ? members.map((member) => member.userId)
          : [
              ...blocks.map((block) => block.userId),
              ...absences.map((absence) => absence.userId),
            ],
      ),
    [absences, blocks, members],
  );

  const memberLegend = useMemo(() => {
    const legendMembers = new Map<string, string>();

    if (members) {
      for (const member of members) {
        legendMembers.set(member.userId, member.userName);
      }
    } else {
      for (const block of blocks) {
        legendMembers.set(block.userId, block.userName);
      }

      for (const absence of absences) {
        if (!legendMembers.has(absence.userId)) {
          legendMembers.set(absence.userId, absence.userName);
        }
      }
    }

    return [...legendMembers.entries()]
      .map(([userId, userName]) => ({
        userId,
        userName,
        colors: memberColorMap.get(userId),
      }))
      .filter(
        (
          member,
        ): member is {
          userId: string;
          userName: string;
          colors: NonNullable<ReturnType<typeof memberColorMap.get>>;
        } => member.colors !== undefined,
      )
      .sort((left, right) => left.userName.localeCompare(right.userName, 'pt-BR'));
  }, [absences, blocks, memberColorMap, members]);

  const memberColumnMap = useMemo(
    () =>
      new Map(
        memberLegend.map((member, column) => [member.userId, column] as const),
      ),
    [memberLegend],
  );

  const tagLegend = useMemo(() => {
    if (!colorBlocksByTag) {
      return [];
    }

    const tags = new Map<string, { id: string; name: string; color: string }>();
    let hasUntagged = false;

    for (const block of blocks) {
      if (block.tag) {
        tags.set(block.tag.id, block.tag);
      } else {
        hasUntagged = true;
      }
    }

    const legend = [...tags.values()].sort((left, right) =>
      left.name.localeCompare(right.name, 'pt-BR'),
    );

    if (hasUntagged) {
      legend.push({
        id: 'untagged',
        name: 'Sem etiqueta',
        color: UNTAGGED_BLOCK_COLOR,
      });
    }

    return legend;
  }, [blocks, colorBlocksByTag]);

  const laidOutBlocks = useMemo(
    () =>
      layoutOverlappingBlocks(
        blocks,
        rangeStart,
        rangeEnd,
        now,
        selectedDate,
      ),
    [blocks, rangeStart, rangeEnd, now, selectedDate],
  );

  const minutesToTop = useCallback(
    (minutes: number) =>
      TIMELINE_EDGE_PADDING + ((minutes - rangeStart) / 60) * hourHeight,
    [hourHeight, rangeStart],
  );

  const setZoomAtPointer = useCallback(
    (nextZoom: number, cursorY = pointerYRef.current) => {
      const container = scrollRef.current;
      const clamped = clampZoom(nextZoom);

      if (!container) {
        setZoom(clamped);
        return;
      }

      const anchorY = Math.max(0, Math.min(cursorY, container.clientHeight));
      const oldScrollHeight = Math.max(container.scrollHeight, 1);
      const anchorContentY = container.scrollTop + anchorY;

      setZoom(clamped);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const newScrollHeight = Math.max(container.scrollHeight, 1);
          const anchorRatio = anchorContentY / oldScrollHeight;

          container.scrollTop = anchorRatio * newScrollHeight - anchorY;
        });
      });
    },
    [],
  );

  useEffect(() => {
    if (!isToday) {
      return;
    }

    const hasLiveAppointment = blocks.some((block) => block.endedAt === null);
    const intervalMs = hasLiveAppointment ? 1_000 : 60_000;
    const interval = window.setInterval(() => setNow(new Date()), intervalMs);

    return () => window.clearInterval(interval);
  }, [blocks, isToday]);

  useEffect(() => {
    const container = scrollRef.current;

    if (!container || isLoading) {
      return;
    }

    const isZoomWheel = (event: WheelEvent) =>
      event.ctrlKey || event.metaKey || event.altKey;

    const handlePointerEnter = () => {
      isHoveringRef.current = true;
    };

    const handlePointerLeave = () => {
      isHoveringRef.current = false;
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointerYRef.current = event.clientY - rect.top;
    };

    const handleWheelZoom = (event: WheelEvent) => {
      if (!isHoveringRef.current || !isZoomWheel(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const rect = container.getBoundingClientRect();
      const cursorY = event.clientY - rect.top;
      pointerYRef.current = cursorY;

      const factor = event.deltaY > 0 ? ZOOM_OUT_FACTOR : ZOOM_IN_FACTOR;
      setZoomAtPointer(zoomRef.current * factor, cursorY);
    };

    container.addEventListener('pointerenter', handlePointerEnter);
    container.addEventListener('pointerleave', handlePointerLeave);
    container.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('wheel', handleWheelZoom, {
      passive: false,
      capture: true,
    });

    return () => {
      container.removeEventListener('pointerenter', handlePointerEnter);
      container.removeEventListener('pointerleave', handlePointerLeave);
      container.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('wheel', handleWheelZoom, { capture: true });
    };
  }, [isLoading, setZoomAtPointer]);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const hasLiveAppointment = blocks.some((block) => block.endedAt === null);
  const newestEndMinutes =
    laidOutBlocks.length === 0
      ? null
      : Math.max(...laidOutBlocks.map((layout) => layout.endMinutes));
  const liveBlockEndMinutes =
    newestEndMinutes === null
      ? currentMinutes
      : Math.min(newestEndMinutes, currentMinutes);
  const nowLineMinutes = hasLiveAppointment
    ? liveBlockEndMinutes
    : newestEndMinutes === null
      ? Math.min(rangeEnd, currentMinutes + NOW_LINE_LEAD_MINUTES)
      : Math.min(rangeEnd, liveBlockEndMinutes + NOW_LINE_LEAD_MINUTES);
  const showNowLine =
    isToday && nowLineMinutes >= rangeStart && nowLineMinutes <= rangeEnd;
  const nowTop = hasLiveAppointment
    ? minutesToTop(nowLineMinutes) + NOW_LINE_LIVE_LEAD_PX
    : minutesToTop(nowLineMinutes);
  const contentMinWidth =
    memberLegend.length > 0
      ? TIME_GUTTER_PX + memberLegend.length * MEMBER_COLUMN_MIN_WIDTH_PX
      : undefined;

  return (
    <Card className='min-w-0 max-w-full overflow-hidden gap-0 rounded-2xl border-0 py-5 shadow-sm'>
      <CardHeader className='flex-col items-start gap-3 space-y-0 px-5 pb-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex min-w-0 flex-wrap items-center gap-3'>
          <CardTitle className='text-base font-semibold'>{title}</CardTitle>

          <div className='flex items-center rounded-full border bg-muted/50 p-0.5'>
            <Button
              type='button'
              variant='ghost'
              size='icon-sm'
              className='size-7 rounded-full'
              aria-label='Diminuir zoom'
              disabled={zoom <= MIN_ZOOM}
              onClick={() => setZoomAtPointer(zoom * ZOOM_OUT_FACTOR)}
            >
              <Minus className='size-3.5' />
            </Button>
            <span className='min-w-10 px-1 text-center text-[11px] font-medium text-muted-foreground tabular-nums'>
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type='button'
              variant='ghost'
              size='icon-sm'
              className='size-7 rounded-full'
              aria-label='Aumentar zoom'
              disabled={zoom >= MAX_ZOOM}
              onClick={() => setZoomAtPointer(zoom * ZOOM_IN_FACTOR)}
            >
              <Plus className='size-3.5' />
            </Button>
          </div>

          {headerExtra}
        </div>

        {showDateOptions ? (
          <div className='flex shrink-0 rounded-full bg-muted p-1'>
            {dateOptions.map((option) => {
              const isActive = option.key === selectedDate;

              return (
                <button
                  key={option.key}
                  type='button'
                  onClick={() => onDateChange(option.key)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                    isActive
                      ? 'bg-card text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className='min-w-0 overflow-hidden px-5'>
        {isLoading ? (
          <div className='space-y-3'>
            <Skeleton className='h-6 w-full' />
            <Skeleton className='h-16 w-full' />
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-14 w-full' />
          </div>
        ) : (
          <>
            {tagLegend.length > 0 ? (
              <div className='mb-3 flex flex-wrap items-center gap-2'>
                {tagLegend.map((tag) => (
                  <span
                    key={tag.id}
                    className='inline-flex max-w-full items-center gap-1.5 text-xs font-medium text-foreground'
                    title={tag.name}
                  >
                    <span
                      className='size-2.5 shrink-0 rounded-full'
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className='truncate'>{tag.name}</span>
                  </span>
                ))}
              </div>
            ) : null}

            <div className='w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain'>
              <div className='min-w-full' style={{ minWidth: contentMinWidth }}>
            {memberLegend.length > 0 ? (
              <div className='mb-3 grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[3.25rem_minmax(0,1fr)] sm:gap-x-4'>
                <div className='sticky left-0 z-20 bg-card' />
                <div
                  className='grid min-w-0'
                  style={{
                    gridTemplateColumns: `repeat(${memberLegend.length}, minmax(${MEMBER_COLUMN_MIN_WIDTH_PX}px, 1fr))`,
                  }}
                >
                  {memberLegend.map((member) => (
                    <div
                      key={member.userId}
                      className='flex min-w-0 items-center justify-center gap-1.5 px-1 text-xs'
                      title={member.userName}
                    >
                      {colorBlocksByTag ? null : (
                        <span
                          className='size-2.5 shrink-0 rounded-full'
                          style={{
                            backgroundColor: member.colors.backgroundColor,
                          }}
                        />
                      )}
                      <span className='truncate font-medium text-foreground'>
                        {member.userName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div
              ref={scrollRef}
              className='overflow-y-auto overscroll-contain rounded-lg [touch-action:pan-y]'
              style={{ height: TIMELINE_VIEWPORT_HEIGHT }}
            >
              <div
                className='grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[3.25rem_minmax(0,1fr)] sm:gap-x-4'
                style={{ height: contentHeight }}
              >
                <div className='relative sticky left-0 z-20 shrink-0 bg-card'>
                  {ticks.map((tick) =>
                    tick.label ? (
                      <div
                        key={tick.minutes}
                        className={cn(
                          'absolute right-0 w-full -translate-y-1/2 text-right tabular-nums',
                          tick.major
                            ? 'text-xs text-muted-foreground'
                            : 'text-[10px] text-muted-foreground/70',
                        )}
                        style={{ top: minutesToTop(tick.minutes) }}
                      >
                        {tick.label}
                      </div>
                    ) : null,
                  )}
                </div>

                <div className='relative min-w-0'>
                  {memberLegend.map((member, column) => (
                    <div
                      key={member.userId}
                      className='pointer-events-none absolute inset-y-0 border-l border-border/35'
                      style={{
                        left: `${(column / memberLegend.length) * 100}%`,
                      }}
                    />
                  ))}
                  {memberLegend.length > 0 ? (
                    <div className='pointer-events-none absolute inset-y-0 right-0 border-r border-border/35' />
                  ) : null}

                  {ticks.map((tick) => (
                    <div
                      key={tick.minutes}
                      className={cn(
                        'absolute right-0 left-0 border-t',
                        tick.major
                          ? 'border-border/70'
                          : tick.minutes % 60 === 0 || tick.minutes % 15 === 0
                            ? 'border-border/45'
                            : 'border-border/20',
                      )}
                      style={{ top: minutesToTop(tick.minutes) }}
                    />
                  ))}

                  {absences.map((absence) => {
                    const style = getTimelineIntervalStyle(
                      absence.startedAt,
                      absence.endedAt,
                      selectedDate,
                      now,
                      rangeStart,
                      rangeEnd,
                      hourHeight,
                      TIMELINE_EDGE_PADDING,
                    );
                    const memberColumn = memberColumnMap.get(absence.userId);

                    if (!style || memberColumn === undefined) {
                      return null;
                    }

                    const widthPercent = 100 / memberLegend.length;
                    const leftPercent = memberColumn * widthPercent;

                    return (
                      <TimelineAbsenceBand
                        key={absence.id}
                        startedAt={absence.startedAt}
                        endedAt={absence.endedAt}
                        selectedDate={selectedDate}
                        top={style.top}
                        height={style.height}
                        userName={absence.userName}
                        left={`calc(${leftPercent}% + ${COLUMN_GAP_PX / 2}px)`}
                        width={`calc(${widthPercent}% - ${COLUMN_GAP_PX}px)`}
                      />
                    );
                  })}

                  {laidOutBlocks.map((layout) => {
                    const top = minutesToTop(layout.startMinutes);
                    const height = Math.max(
                      ((layout.endMinutes - layout.startMinutes) / 60) *
                        hourHeight,
                      3,
                    );
                    const memberColors = memberColorMap.get(
                      layout.block.userId,
                    );
                    const memberColumn = memberColumnMap.get(
                      layout.block.userId,
                    );

                    if (memberColumn === undefined) {
                      return null;
                    }

                    const colors = colorBlocksByTag
                      ? layout.block.tag?.color
                        ? buildTagColorScheme(layout.block.tag.color)
                        : untaggedBlockColorScheme
                      : memberColors;

                    if (!colors) {
                      return null;
                    }

                    return (
                      <TeamTimelineBlock
                        key={layout.block.id}
                        block={layout.block}
                        selectedDate={selectedDate}
                        top={top}
                        height={height}
                        column={memberColumn}
                        totalColumns={memberLegend.length}
                        colors={colors}
                      />
                    );
                  })}

                  {showNowLine ? (
                    <div
                      className='absolute right-0 left-0 z-10 flex -translate-y-1/2 items-center'
                      style={{ top: nowTop }}
                    >
                      <span className='relative flex size-2.5 shrink-0 items-center justify-center'>
                        {hasLiveAppointment ? (
                          <span className='absolute inset-0 animate-ping rounded-full bg-red-500/70' />
                        ) : null}
                        <span
                          className={cn(
                            'relative size-2.5 rounded-full bg-red-500',
                            hasLiveAppointment &&
                              'animate-[live-blink_1.1s_ease-in-out_infinite]',
                          )}
                        />
                      </span>
                      <div
                        className={cn(
                          'h-px flex-1 border-t border-dashed border-red-500',
                          hasLiveAppointment &&
                            'animate-[live-blink_1.1s_ease-in-out_infinite]',
                        )}
                      />
                      <span className='ml-2 shrink-0 rounded-md bg-background/95 px-1.5 py-0.5 text-xs font-semibold text-red-500 shadow-sm ring-1 ring-red-500/20'>
                        {formatCurrentTime(now)}
                      </span>
                    </div>
                  ) : null}

                  {blocks.length === 0 && absences.length === 0 ? (
                    <div className='absolute inset-0 flex items-center justify-center'>
                      <p className='text-sm text-muted-foreground'>
                        Nenhum apontamento neste dia.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            </div>
          </div>
          </>
        )}

        {!isLoading ? (
          <div className='mt-2 flex flex-wrap items-center justify-between gap-2'>
            {absences.length > 0 ? (
              <p className='inline-flex items-center gap-1.5 text-[11px] text-muted-foreground'>
                <span
                  className='size-2.5 shrink-0 rounded-sm border border-amber-500/40 bg-amber-500/30'
                  aria-hidden
                />
                Ausente
              </p>
            ) : (
              <span />
            )}
            <p className='text-[11px] text-muted-foreground'>
              Com o mouse sobre o gráfico, use Ctrl + scroll (ou Alt + scroll) para
              ampliar no ponteiro.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
