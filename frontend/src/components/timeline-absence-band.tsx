import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatTimeRange } from '@/lib/format-time'
import { cn } from '@/lib/utils'

const INLINE_TITLE_MIN_HEIGHT = 26
const INLINE_TIME_MIN_HEIGHT = 46

interface TimelineAbsenceBandProps {
  startedAt: string
  endedAt: string | null
  selectedDate: string
  top: number
  height: number
  userName?: string
  left?: string
  width?: string
}

export function TimelineAbsenceBand({
  startedAt,
  endedAt,
  selectedDate,
  top,
  height,
  userName,
  left,
  width,
}: TimelineAbsenceBandProps) {
  const showTitle = height >= INLINE_TITLE_MIN_HEIGHT
  const showTime = height >= INLINE_TIME_MIN_HEIGHT
  const timeRange = formatTimeRange(startedAt, endedAt, selectedDate)

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className={cn(
              'absolute z-0 overflow-hidden rounded-sm border border-amber-500/40 bg-amber-500/20 text-amber-950 dark:text-amber-50',
              showTitle ? 'px-2' : 'px-0.5',
              showTime ? 'py-2' : showTitle ? 'flex items-center py-0.5' : '',
            )}
            style={{
              top,
              height,
              left: left ?? 0,
              width: width ?? '100%',
              backgroundImage:
                'repeating-linear-gradient(-45deg, transparent, transparent 5px, rgb(245 158 11 / 0.14) 5px, rgb(245 158 11 / 0.14) 10px)',
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
                  Ausente
                </p>
                {showTime ? (
                  <p className="truncate text-xs leading-tight text-amber-900/75 dark:text-amber-50/75">
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
          <p className="text-sm font-semibold">Ausente</p>
          {userName ? (
            <p className="text-xs text-muted-foreground">{userName}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">{timeRange}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
