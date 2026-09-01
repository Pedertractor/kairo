import { formatDuration } from '@/lib/time-format'
import { cn } from '@/lib/utils'

const CHART_COLORS = [
  '#38bdf8',
  '#818cf8',
  '#34d399',
  '#fbbf24',
  '#f472b6',
  '#fb7185',
  '#22d3ee',
  '#a78bfa',
]

export function UsageLineChart({
  points,
  emptyLabel,
}: {
  points: Array<{ label: string; value: number; secondary?: string }>
  emptyLabel: string
}) {
  const width = 640
  const height = 220
  const padding = { top: 16, right: 16, bottom: 36, left: 48 }
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom
  const maxValue = Math.max(...points.map((point) => point.value), 1)

  if (points.length === 0 || points.every((point) => point.value === 0)) {
    return (
      <div className="flex h-52 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  const coords = points.map((point, index) => {
    const x =
      padding.left +
      (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth)
    const y =
      padding.top + innerHeight - (point.value / maxValue) * innerHeight
    return { ...point, x, y }
  })

  const line = coords
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
  const area = `${line} L ${coords[coords.length - 1].x} ${padding.top + innerHeight} L ${coords[0].x} ${padding.top + innerHeight} Z`
  const tickStep = Math.max(1, Math.ceil(points.length / 7))

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-52 w-full overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="usage-line-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((ratio) => {
        const y = padding.top + innerHeight * (1 - ratio)
        return (
          <g key={ratio}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              className="stroke-border"
              strokeWidth="1"
            />
            <text
              x={padding.left - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
            >
              {formatDuration(Math.round(maxValue * ratio))}
            </text>
          </g>
        )
      })}
      <path d={area} fill="url(#usage-line-fill)" />
      <path d={line} fill="none" stroke="#0ea5e9" strokeWidth="2.5" />
      {coords.map((point, index) =>
        index % tickStep === 0 || index === coords.length - 1 ? (
          <text
            key={point.label}
            x={point.x}
            y={height - 10}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {point.label}
          </text>
        ) : null,
      )}
    </svg>
  )
}

export function UsageBarList({
  items,
  emptyLabel,
  valueFormatter = formatDuration,
}: {
  items: Array<{ label: string; value: number; hint?: string }>
  emptyLabel: string
  valueFormatter?: (value: number) => string
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1)

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const widthPercent = Math.max(4, Math.round((item.value / maxValue) * 100))
        const color = CHART_COLORS[index % CHART_COLORS.length]

        return (
          <div key={`${item.label}-${index}`} className="space-y-1.5">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{item.label}</p>
                {item.hint ? (
                  <p className="text-xs text-muted-foreground">{item.hint}</p>
                ) : null}
              </div>
              <p className="shrink-0 text-sm font-bold tabular-nums">
                {valueFormatter(item.value)}
              </p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${widthPercent}%`, backgroundColor: color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function UsageDonut({
  slices,
  emptyLabel,
  centerLabel,
  centerValue,
}: {
  slices: Array<{ label: string; value: number; color?: string }>
  emptyLabel: string
  centerLabel: string
  centerValue: string
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)

  if (total === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  const radius = 54
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative size-40 shrink-0">
        <svg viewBox="0 0 140 140" className="size-full -rotate-90">
          {slices.map((slice, index) => {
            const length = (slice.value / total) * circumference
            const circle = (
              <circle
                key={slice.label}
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke={slice.color ?? CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth="18"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            )
            offset += length
            return circle
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-lg font-bold tabular-nums">{centerValue}</p>
          <p className="text-[11px] text-muted-foreground">{centerLabel}</p>
        </div>
      </div>
      <ul className="w-full space-y-2">
        {slices.map((slice, index) => (
          <li
            key={slice.label}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={cn('size-2.5 shrink-0 rounded-full')}
                style={{
                  backgroundColor:
                    slice.color ?? CHART_COLORS[index % CHART_COLORS.length],
                }}
              />
              <span className="truncate">{slice.label}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums">
              {slice.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
