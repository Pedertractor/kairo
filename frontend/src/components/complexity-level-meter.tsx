import { cn } from '@/lib/utils'
import {
  COMPLEXITY_LEVEL_LABELS,
  type ComplexityLevel,
} from '@/lib/complexity-level'

const FILL_PERCENT: Record<ComplexityLevel, number> = {
  BAIXA: 25,
  MEDIA: 50,
  ALTA: 75,
  MUITO_ALTA: 100,
}

const SIZE_CLASS = {
  sm: 'h-4 w-1',
  md: 'h-5 w-1',
  lg: 'h-8 w-1.5',
} as const

interface ComplexityLevelMeterProps {
  level: ComplexityLevel
  size?: keyof typeof SIZE_CLASS
  showLabel?: boolean
  className?: string
}

function GradientFill({ level }: { level: ComplexityLevel }) {
  return (
    <span
      className="absolute inset-0 bg-linear-to-t from-emerald-400 via-amber-400 to-rose-500"
      style={{ clipPath: `inset(${100 - FILL_PERCENT[level]}% 0 0 0)` }}
    />
  )
}

export function ComplexityLevelMeter({
  level,
  size = 'sm',
  showLabel = true,
  className,
}: ComplexityLevelMeterProps) {
  const label = COMPLEXITY_LEVEL_LABELS[level]

  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      title={`Nível de complexidade: ${label}`}
    >
      <span
        className={cn(
          'relative shrink-0 overflow-hidden rounded-full bg-muted',
          SIZE_CLASS[size],
        )}
        aria-hidden
      >
        <GradientFill level={level} />
      </span>
      {showLabel ? <span>{label}</span> : null}
      {!showLabel ? (
        <span className="sr-only">Nível de complexidade: {label}</span>
      ) : null}
    </span>
  )
}

export function ComplexityLevelStripe({
  level,
  className,
}: {
  level: ComplexityLevel
  className?: string
}) {
  const label = COMPLEXITY_LEVEL_LABELS[level]

  return (
    <span
      className={cn(
        'pointer-events-none absolute inset-y-2 left-1 z-10 w-1 overflow-hidden rounded-full bg-muted',
        className,
      )}
      title={`Nível de complexidade: ${label}`}
      aria-hidden
    >
      <GradientFill level={level} />
    </span>
  )
}
