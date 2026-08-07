import { CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FinishItemButtonProps {
  onClick: () => void
  className?: string
  size?: 'icon-sm' | 'icon' | 'default' | 'sm'
  label?: string
}

export function FinishItemButton({
  onClick,
  className,
  size = 'icon-sm',
  label = 'Finalizar',
}: FinishItemButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      aria-label={label}
      title={label}
      className={cn(
        'text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-300',
        className,
      )}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick()
      }}
    >
      <CheckCircle2 />
      {size === 'default' || size === 'sm' ? label : null}
    </Button>
  )
}
