import { cn } from '@/lib/utils'
import { getContrastingTextColor } from '@/lib/tag-colors'
import type { ActivityTag } from '@/types/tag'

interface ActivityTagBadgeProps {
  tag: ActivityTag
  className?: string
}

export function ActivityTagBadge({ tag, className }: ActivityTagBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center truncate rounded-md px-2 py-0.5 text-xs font-medium',
        className,
      )}
      style={{
        backgroundColor: tag.color,
        color: getContrastingTextColor(tag.color),
      }}
      title={tag.name}
    >
      {tag.name}
    </span>
  )
}
