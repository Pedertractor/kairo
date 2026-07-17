import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatTimeRange } from '@/lib/format-time';
import type { MemberColorScheme } from '@/lib/member-colors';
import { cn } from '@/lib/utils';
import type { TeamDayTimelineBlock } from '@/types/time-entry';

const INLINE_TITLE_MIN_HEIGHT = 26;
const INLINE_TIME_MIN_HEIGHT = 46;
const COLUMN_GAP_PX = 4;

interface TeamTimelineBlockProps {
  block: TeamDayTimelineBlock;
  top: number;
  height: number;
  column: number;
  totalColumns: number;
  colors: MemberColorScheme;
}

export function TeamTimelineBlock({
  block,
  top,
  height,
  column,
  totalColumns,
  colors,
}: TeamTimelineBlockProps) {
  const showTitle = height >= INLINE_TITLE_MIN_HEIGHT;
  const showTime = height >= INLINE_TIME_MIN_HEIGHT;
  const timeRange = formatTimeRange(block.startedAt, block.endedAt);
  const widthPercent = 100 / totalColumns;
  const leftPercent = column * widthPercent;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className={cn(
              'absolute overflow-hidden rounded-xl transition-shadow hover:ring-2 hover:ring-sidebar-primary/25',
              colors.bar,
              showTitle ? 'px-2' : 'px-0.5',
              showTime ? 'py-2' : showTitle ? 'flex items-center py-0.5' : '',
            )}
            style={{
              top,
              height,
              left: `calc(${leftPercent}% + ${COLUMN_GAP_PX / 2}px)`,
              width: `calc(${widthPercent}% - ${COLUMN_GAP_PX}px)`,
              backgroundColor: colors.backgroundColor,
            }}
          >
            {showTitle ? (
              <>
                <p
                  className={cn(
                    'truncate font-semibold leading-tight',
                    showTime ? 'text-sm' : 'text-xs',
                  )}
                >
                  {block.title}
                </p>
                {showTime ? (
                  <p
                    className={cn(
                      'truncate text-xs leading-tight',
                      colors.subtext,
                    )}
                  >
                    {timeRange}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        }
      />
      <TooltipContent
        side='top'
        align='start'
        sideOffset={6}
        className='rounded-xl border border-border bg-card px-3 py-2 text-card-foreground shadow-lg [&>svg]:hidden'
      >
        <div className='space-y-0.5'>
          <p className='max-w-48 text-sm font-semibold'>{block.title}</p>
          <p className='text-xs text-muted-foreground'>{block.userName}</p>
          <p className='text-xs text-muted-foreground'>{timeRange}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
