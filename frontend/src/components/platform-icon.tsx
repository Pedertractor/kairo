import { Timer } from 'lucide-react'

import { cn } from '@/lib/utils'

export function PlatformIcon({ className }: { className?: string }) {
  return <Timer className={cn('size-4', className)} />
}
