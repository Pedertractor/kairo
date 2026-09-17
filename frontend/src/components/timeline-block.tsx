import { ActivityTagBadge } from '@/components/activity-tag-badge'
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
  selectedDate: string
  top: number
  height: number
  colors: {
    bar: string
    subtext: string
    backgroundColor?: string
    textColor?: string
  }
  displayTitle?: string
}

export function getTimelineBlockDisplayTitle(
  block: DayTimelineBlock,
  showAsTags: boolean,
): string {
  if (showAsTags && block.tag) {
    return block.tag.name
  }

  return block.title
}

export function TimelineBlock({
  block,
  selectedDate,
  top,
  height,
  colors,
  displayTitle,
}: TimelineBlockProps) {
  const showTitle = height >= INLINE_TITLE_MIN_HEIGHT
  const showTime = height >= INLINE_TIME_MIN_HEIGHT
  const title = displayTitle ?? block.title
  const timeRange = formatTimeRange(
    block.startedAt,
    block.endedAt,
    selectedDate,
  )
  const showOriginalTitle = title !== block.title

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className={cn(
              'absolute right-0 left-0 z-[1] overflow-hidden rounded-sm transition-shadow hover:ring-2 hover:ring-sidebar-primary/25',
              colors.bar,
              showTitle ? 'px-3' : 'px-0.5',
              showTime ? 'py-2' : showTitle ? 'flex items-center py-0.5' : '',
            )}
            style={{
              top,
              height,
              backgroundColor: colors.backgroundColor,
              color: colors.textColor,
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
                  {title}
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
          <p className="max-w-48 text-sm font-semibold">{title}</p>
          {showOriginalTitle ? (
            <p className="max-w-48 text-xs text-muted-foreground">{block.title}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">{timeRange}</p>
          {block.tag && title !== block.tag.name ? (
            <ActivityTagBadge tag={block.tag} className="mt-1" />
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
