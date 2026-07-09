import { useEffect, useState } from 'react'
import { Box, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-handler'
import { cn } from '@/lib/utils'
import type {
  PrintingMachine,
  PrintingMachineResponse,
  UpdatePrintingMachineInput,
} from '@/types/printing-machine'
import type { ThreeDPart, ThreeDPartsListResponse } from '@/types/three-d-part'

interface SelectPrintingPartDialogProps {
  machine: PrintingMachine | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStarted: (machine: PrintingMachine) => void
}

export function SelectPrintingPartDialog({
  machine,
  open,
  onOpenChange,
  onStarted,
}: SelectPrintingPartDialogProps) {
  const [parts, setParts] = useState<ThreeDPart[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setSelectedPartId(null)
      return
    }

    let cancelled = false

    async function loadParts() {
      setIsLoading(true)

      try {
        const data = await api<ThreeDPartsListResponse>('/three-d-parts')

        if (!cancelled) {
          setParts(data.threeDParts)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadParts()

    return () => {
      cancelled = true
    }
  }, [open])

  async function handleStart() {
    if (!machine || !selectedPartId) {
      return
    }

    setIsSubmitting(true)

    try {
      const payload: UpdatePrintingMachineInput = {
        busy: true,
        threeDPartId: selectedPartId,
      }

      const data = await api<PrintingMachineResponse>(
        `/printing-machines/${machine.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      )

      onOpenChange(false)
      onStarted(data.printingMachine)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Iniciar impressão</DialogTitle>
          <DialogDescription>
            Selecione a peça para imprimir em{' '}
            <span className="font-medium text-foreground">{machine?.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(60vh,28rem)] overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-xl border p-3"
                >
                  <Skeleton className="size-10 rounded-lg" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : parts.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
              <Box className="size-7 text-muted-foreground/70" />
              <p className="text-sm font-medium">Nenhuma peça cadastrada</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Cadastre peças 3D na aba Peças 3D para iniciar uma impressão.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {parts.map((part) => {
                const isSelected = selectedPartId === part.id

                return (
                  <li key={part.id}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors',
                        isSelected
                          ? 'border-sidebar-primary ring-2 ring-sidebar-primary/30'
                          : 'hover:border-sidebar-primary/40',
                      )}
                      onClick={() => setSelectedPartId(part.id)}
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/10 text-sidebar-primary">
                        <Box className="size-4.5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {part.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {part.code} · {part.timeToPrint} min
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button
            type="button"
            variant="cancel"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isSubmitting || !selectedPartId}
            onClick={() => void handleStart()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" />
                Iniciando...
              </>
            ) : (
              'Iniciar impressão'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
