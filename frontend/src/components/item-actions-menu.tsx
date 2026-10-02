import { CheckCircle2, EllipsisIcon, Info, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ItemActionsMenuProps {
  title: string
  canFinish: boolean
  canDelete?: boolean
  onFinish: () => void
  onDelete: () => void
  onDetails?: () => void
  className?: string
}

export function ItemActionsMenu({
  title,
  canFinish,
  canDelete = true,
  onFinish,
  onDelete,
  onDetails,
  className,
}: ItemActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              'text-muted-foreground hover:text-foreground',
              className,
            )}
            aria-label={`Ações para ${title}`}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
          />
        }
      >
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        {onDetails ? (
          <DropdownMenuItem
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onDetails()
            }}
          >
            <Info />
            Detalhes
          </DropdownMenuItem>
        ) : null}

        {onDetails && (canFinish || canDelete) ? <DropdownMenuSeparator /> : null}

        {canFinish ? (
          <DropdownMenuItem
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onFinish()
            }}
          >
            <CheckCircle2 />
            Finalizar
          </DropdownMenuItem>
        ) : null}

        {canFinish && canDelete ? <DropdownMenuSeparator /> : null}

        {canDelete ? (
          <DropdownMenuItem
            variant="destructive"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 />
            Excluir
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
