import { cn } from '@/lib/utils'
import { getContrastingTextColor } from '@/lib/tag-colors'
import type { ActivityTag } from '@/types/tag'

interface ActivityTagBadgeProps {
  tag: ActivityTag
  className?: string
  onClick?: () => void
  'aria-label'?: string
}

export function ActivityTagBadge({
  tag,
  className,
  onClick,
  'aria-label': ariaLabel,
}: ActivityTagBadgeProps) {
  const sharedClassName = cn(
    'inline-flex max-w-full items-center truncate rounded-md px-2 py-0.5 text-xs font-medium',
    onClick && 'transition-opacity hover:opacity-80',
    className,
  )
  const style = {
    backgroundColor: tag.color,
    color: getContrastingTextColor(tag.color),
  }

  if (onClick) {
    return (
      <button
        type="button"
        className={sharedClassName}
        style={style}
        title={tag.name}
        aria-label={ariaLabel ?? `Alterar tag ${tag.name}`}
        onClick={onClick}
      >
        {tag.name}
      </button>
    )
  }

  return (
    <span
      className={sharedClassName}
      style={style}
      title={tag.name}
    >
      {tag.name}
    </span>
  )
}
