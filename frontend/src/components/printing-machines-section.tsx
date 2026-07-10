import { useCallback, useEffect, useState } from 'react'
import {
  Check,
  EllipsisIcon,
  Loader2,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
} from 'lucide-react'

import { CreatePrintingMachineDialog } from '@/components/create-printing-machine-dialog'
import { DeletePrintingMachineDialog } from '@/components/delete-printing-machine-dialog'
import { EditPrintingMachineDialog } from '@/components/edit-printing-machine-dialog'
import { SelectPrintingPartDialog } from '@/components/select-printing-part-dialog'
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
import { cn } from '@/lib/utils'
import type {
  PrintingMachine,
  PrintingMachineResponse,
  PrintingMachinesListResponse,
  UpdatePrintingMachineInput,
} from '@/types/printing-machine'

type MachineAction = 'edit' | 'delete' | 'start'
type BusyAction = 'complete' | 'pause' | 'resume'

function getStatusLabel(machine: PrintingMachine) {
  if (!machine.busy) {
    return 'Disponível'
  }

  return machine.paused ? 'Pausada' : 'Ocupada'
}

export function PrintingMachinesSection() {
  const [machines, setMachines] = useState<PrintingMachine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedMachine, setSelectedMachine] =
    useState<PrintingMachine | null>(null)
  const [activeAction, setActiveAction] = useState<MachineAction | null>(null)
  const [busyActionByMachineId, setBusyActionByMachineId] = useState<
    Record<string, BusyAction | undefined>
  >({})

  const loadMachines = useCallback(async () => {
    setIsLoading(true)

    try {
      const data = await api<PrintingMachinesListResponse>('/printing-machines')
      setMachines(data.printingMachines)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMachines()
  }, [loadMachines])

  function handleMachineUpdated(updatedMachine: PrintingMachine) {
    setMachines((currentMachines) =>
      currentMachines.map((machine) =>
        machine.id === updatedMachine.id ? updatedMachine : machine,
      ),
    )
  }

  function handleMachineDeleted(machineId: string) {
    setMachines((currentMachines) =>
      currentMachines.filter((machine) => machine.id !== machineId),
    )
  }

  function openAction(machine: PrintingMachine, action: MachineAction) {
    setSelectedMachine(machine)
    setActiveAction(action)
  }

  function closeActionDialog(open: boolean) {
    if (!open) {
      setSelectedMachine(null)
      setActiveAction(null)
    }
  }

  async function handleBusyAction(
    machine: PrintingMachine,
    action: BusyAction,
  ) {
    const payload: UpdatePrintingMachineInput =
      action === 'complete'
        ? { busy: false }
        : action === 'pause'
          ? { paused: true }
          : { paused: false }

    setBusyActionByMachineId((current) => ({
      ...current,
      [machine.id]: action,
    }))

    try {
      const data = await api<PrintingMachineResponse>(
        `/printing-machines/${machine.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      )

      handleMachineUpdated(data.printingMachine)
    } finally {
      setBusyActionByMachineId((current) => {
        const next = { ...current }
        delete next[machine.id]
        return next
      })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Impressoras</p>
          <p className="text-sm text-muted-foreground">
            Gerencie as impressoras 3D disponíveis.
          </p>
        </div>
        <Button type="button" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus />
          Criar impressora
        </Button>
      </div>

      <CreatePrintingMachineDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={(machine) => {
          setMachines((currentMachines) =>
            [...currentMachines, machine].sort((a, b) =>
              a.name.localeCompare(b.name, 'pt-BR'),
            ),
          )
        }}
      />

      <EditPrintingMachineDialog
        machine={selectedMachine}
        open={activeAction === 'edit'}
        onOpenChange={closeActionDialog}
        onUpdated={handleMachineUpdated}
      />

      <DeletePrintingMachineDialog
        machine={selectedMachine}
        open={activeAction === 'delete'}
        onOpenChange={closeActionDialog}
        onDeleted={handleMachineDeleted}
      />

      <SelectPrintingPartDialog
        machine={selectedMachine}
        open={activeAction === 'start'}
        onOpenChange={closeActionDialog}
        onStarted={handleMachineUpdated}
      />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : machines.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium">Nenhuma impressora cadastrada</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            As impressoras 3D cadastradas aparecerão aqui.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {machines.map((machine) => {
            const pendingAction = busyActionByMachineId[machine.id]
            const isBusyActionPending = pendingAction !== undefined

            return (
              <li
                key={machine.id}
                className={cn(
                  'flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all',
                  machine.busy &&
                    !machine.paused &&
                    'border-amber-500/40 bg-amber-500/5 shadow-amber-500/10',
                  machine.busy &&
                    machine.paused &&
                    'border-stone-400/50 bg-stone-500/5 shadow-stone-500/10',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">
                      {machine.name}
                    </p>
                    <span
                      className={cn(
                        'mt-2 inline-flex rounded-md px-2 py-0.5 text-xs',
                        !machine.busy &&
                          'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                        machine.busy &&
                          !machine.paused &&
                          'bg-amber-500/10 text-amber-700 dark:text-amber-400',
                        machine.busy &&
                          machine.paused &&
                          'bg-stone-500/10 text-stone-700 dark:text-stone-300',
                      )}
                    >
                      {getStatusLabel(machine)}
                    </span>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Ações para ${machine.name}`}
                        />
                      }
                    >
                      <EllipsisIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => openAction(machine, 'edit')}
                      >
                        <Pencil />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => openAction(machine, 'delete')}
                      >
                        <Trash2 />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {machine.part ? (
                  <div className="rounded-lg border bg-background/70 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Peça</p>
                    <p className="line-clamp-2 text-sm font-medium">
                      {machine.part.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {machine.part.code} · {machine.part.timeToPrint} min
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma peça em impressão.
                  </p>
                )}

                {machine.busy ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      className="w-full"
                      disabled={isBusyActionPending}
                      onClick={() => void handleBusyAction(machine, 'complete')}
                    >
                      {pendingAction === 'complete' ? (
                        <>
                          <Loader2 className="animate-spin" />
                          Concluindo...
                        </>
                      ) : (
                        <>
                          <Check />
                          Concluir impressão
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-amber-500/50 bg-background text-amber-800 hover:bg-amber-500/10 hover:text-amber-900 dark:border-amber-500/40 dark:text-amber-400 dark:hover:bg-amber-500/15 dark:hover:text-amber-300"
                      disabled={isBusyActionPending}
                      onClick={() =>
                        void handleBusyAction(
                          machine,
                          machine.paused ? 'resume' : 'pause',
                        )
                      }
                    >
                      {pendingAction === 'pause' ||
                      pendingAction === 'resume' ? (
                        <>
                          <Loader2 className="animate-spin" />
                          {machine.paused ? 'Retomando...' : 'Pausando...'}
                        </>
                      ) : machine.paused ? (
                        <>
                          <Play />
                          Retomar
                        </>
                      ) : (
                        <>
                          <Pause />
                          Pausar
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => openAction(machine, 'start')}
                  >
                    <Play />
                    Iniciar impressão
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
