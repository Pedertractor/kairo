import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatTimeRange } from '@/lib/format-time'
import { cn } from '@/lib/utils'
import type { DayTimelineBlock } from '@/types/time-entry'

const INLINE_TITLE_MIN_HEIGHT = 26
const INLINE_TIME_MIN_HEIGHT = 46

interface TimelineBlockProps {
  block: DayTimelineBlock
  top: number
  height: number
  colors: { bar: string; subtext: string }
}

export function TimelineBlock({
  block,
  top,
  height,
  colors,
}: TimelineBlockProps) {
  const showTitle = height >= INLINE_TITLE_MIN_HEIGHT
  const showTime = height >= INLINE_TIME_MIN_HEIGHT
  const timeRange = formatTimeRange(block.startedAt, block.endedAt)

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className={cn(
              'absolute right-0 left-0 overflow-hidden rounded-xl transition-shadow hover:ring-2 hover:ring-sidebar-primary/25',
              colors.bar,
              showTitle ? 'px-3' : 'px-0.5',
              showTime ? 'py-2' : showTitle ? 'flex items-center py-0.5' : '',
            )}
            style={{ top, height }}
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
                  <p className={cn('truncate text-xs leading-tight', colors.subtext)}>
                    {timeRange}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        }
      />
      <TooltipContent
        side="top"
        align="start"
        sideOffset={6}
        className="rounded-xl border border-border bg-card px-3 py-2 text-card-foreground shadow-lg [&>svg]:hidden"
      >
        <div className="space-y-0.5">
          <p className="max-w-48 text-sm font-semibold">{block.title}</p>
          <p className="text-xs text-muted-foreground">{timeRange}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
