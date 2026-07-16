import { useCallback, useEffect, useState } from 'react'
import { EllipsisIcon, Pencil, Plus, Trash2 } from 'lucide-react'

import { CreateThreeDPartDialog } from '@/components/create-three-d-part-dialog'
import { DeleteThreeDPartDialog } from '@/components/delete-three-d-part-dialog'
import { EditThreeDPartDialog } from '@/components/edit-three-d-part-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-handler'
import type { ThreeDPart, ThreeDPartsListResponse } from '@/types/three-d-part'

type PartAction = 'edit' | 'delete'

export function ThreeDPartsSection() {
  const [parts, setParts] = useState<ThreeDPart[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedPart, setSelectedPart] = useState<ThreeDPart | null>(null)
  const [activeAction, setActiveAction] = useState<PartAction | null>(null)

  const loadParts = useCallback(async () => {
    setIsLoading(true)

    try {
      const data = await api<ThreeDPartsListResponse>('/three-d-parts')
      setParts(data.threeDParts)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadParts()
  }, [loadParts])

  function handlePartUpdated(updatedPart: ThreeDPart) {
    setParts((currentParts) =>
      currentParts.map((part) =>
        part.id === updatedPart.id ? updatedPart : part,
      ),
    )
  }

  function handlePartDeleted(partId: string) {
    setParts((currentParts) =>
      currentParts.filter((part) => part.id !== partId),
    )
  }

  function openAction(part: ThreeDPart, action: PartAction) {
    setSelectedPart(part)
    setActiveAction(action)
  }

  function closeActionDialog(open: boolean) {
    if (!open) {
      setSelectedPart(null)
      setActiveAction(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Peças 3D</p>
          <p className="text-sm text-muted-foreground">
            Gerencie o catálogo de peças para impressão 3D.
          </p>
        </div>
        <Button type="button" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus />
          Criar peça
        </Button>
      </div>

      <CreateThreeDPartDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={(part) => {
          setParts((currentParts) =>
            [...currentParts, part].sort((a, b) =>
              a.name.localeCompare(b.name, 'pt-BR'),
            ),
          )
        }}
      />

      <EditThreeDPartDialog
        part={selectedPart}
        open={activeAction === 'edit'}
        onOpenChange={closeActionDialog}
        onUpdated={handlePartUpdated}
      />

      <DeleteThreeDPartDialog
        part={selectedPart}
        open={activeAction === 'delete'}
        onOpenChange={closeActionDialog}
        onDeleted={handlePartDeleted}
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : parts.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium">Nenhuma peça cadastrada</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            As peças 3D cadastradas aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b bg-brand-soft text-left text-xs text-sidebar-primary">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Tempo (min)</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((part) => (
                  <tr key={part.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{part.name}</td>
                    <td className="px-4 py-3">{part.code}</td>
                    <td className="px-4 py-3">{part.timeToPrint}</td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Ações para ${part.name}`}
                            />
                          }
                        >
                          <EllipsisIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openAction(part, 'edit')}
                          >
                            <Pencil />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => openAction(part, 'delete')}
                          >
                            <Trash2 />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
