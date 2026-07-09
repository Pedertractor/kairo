import { useCallback, useEffect, useState } from 'react'
import { EllipsisIcon, Pencil, Plus, Trash2 } from 'lucide-react'

import { CreatePrintingMachineDialog } from '@/components/create-printing-machine-dialog'
import { DeletePrintingMachineDialog } from '@/components/delete-printing-machine-dialog'
import { EditPrintingMachineDialog } from '@/components/edit-printing-machine-dialog'
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
  PrintingMachinesListResponse,
} from '@/types/printing-machine'

type MachineAction = 'edit' | 'delete'

export function PrintingMachinesSection() {
  const [machines, setMachines] = useState<PrintingMachine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedMachine, setSelectedMachine] =
    useState<PrintingMachine | null>(null)
  const [activeAction, setActiveAction] = useState<MachineAction | null>(null)

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

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-xl" />
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
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b bg-[#C5D3FF] text-left text-xs text-sidebar-primary">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {machines.map((machine) => (
                  <tr key={machine.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{machine.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-md px-2 py-0.5 text-xs',
                          machine.busy
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                        )}
                      >
                        {machine.busy ? 'Ocupada' : 'Disponível'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
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
