import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-handler'
import { cn } from '@/lib/utils'
import type { ToggleFavoriteResponse } from '@/types/favorite'

type FavoriteTarget =
  | { kind: 'activity'; teamId: string; activityId: string }
  | { kind: 'task'; projectId: string; taskId: string }

interface FavoriteButtonProps {
  target: FavoriteTarget
  isFavorite: boolean
  onToggle?: (isFavorite: boolean) => void
  size?: 'icon-xs' | 'icon-sm'
  className?: string
}

export function FavoriteButton({
  target,
  isFavorite,
  onToggle,
  size = 'icon-xs',
  className,
}: FavoriteButtonProps) {
  const [currentFavorite, setCurrentFavorite] = useState(isFavorite)
  const [isToggling, setIsToggling] = useState(false)

  useEffect(() => {
    setCurrentFavorite(isFavorite)
  }, [isFavorite])

  async function handleToggle() {
    if (isToggling) {
      return
    }

    const previous = currentFavorite
    const next = !previous
    setCurrentFavorite(next)
    setIsToggling(true)
    onToggle?.(next)

    try {
      const path =
        target.kind === 'activity'
          ? `/teams/${target.teamId}/activities/${target.activityId}/favorite`
          : `/projects/${target.projectId}/tasks/${target.taskId}/favorite`

      const data = await api<ToggleFavoriteResponse>(path, {
        method: 'POST',
      })

      setCurrentFavorite(data.isFavorite)
      onToggle?.(data.isFavorite)
    } catch {
      setCurrentFavorite(previous)
      onToggle?.(previous)
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={cn(
        className,
        currentFavorite
          ? 'text-amber-500 hover:text-amber-500'
          : 'text-muted-foreground hover:text-amber-500',
      )}
      aria-label={
        currentFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
      }
      aria-pressed={currentFavorite}
      disabled={isToggling}
      onClick={() => void handleToggle()}
    >
      <Star className={cn(currentFavorite && 'fill-current')} />
    </Button>
  )
}
