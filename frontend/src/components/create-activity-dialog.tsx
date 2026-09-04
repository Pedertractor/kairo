import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'

import { ActivityTagBadge } from '@/components/activity-tag-badge'
import { Button } from '@/components/ui/button'
import { ComplexityLevelMeter } from '@/components/complexity-level-meter'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api-handler'
import {
  COMPLEXITY_LEVELS,
  NO_COMPLEXITY,
  isComplexityLevel,
} from '@/lib/complexity-level'
import type { ActivityResponse, CreateActivityInput } from '@/types/card'
import type { ClientSummary, ClientsListResponse } from '@/types/client'
import type { MachineSummary, MachinesListResponse } from '@/types/machine'
import type { TagSummary } from '@/types/tag'
import type { TeamMemberSummary, TeamResponse } from '@/types/team'

const NO_TAG = '__none__'

type ClientComboboxOption = {
  value: string
  label: string
}

type MachineComboboxOption = {
  value: string
  label: string
}

type MemberComboboxOption = {
  value: string
  label: string
}

interface CreateActivityDialogProps {
  teamId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
  tags?: TagSummary[]
}

function toClientOption(client: ClientSummary): ClientComboboxOption {
  return {
    value: client.id,
    label: client.name,
  }
}

function toMachineOption(machine: MachineSummary): MachineComboboxOption {
  return {
    value: machine.id,
    label: `${machine.name} · CC ${machine.costCenter}`,
  }
}

function toMemberOption(member: TeamMemberSummary): MemberComboboxOption {
  return {
    value: member.id,
    label: member.name,
  }
}

export function CreateActivityDialog({
  teamId,
  open,
  onOpenChange,
  onCreated,
  tags = [],
}: CreateActivityDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [indefiniteTime, setIndefiniteTime] = useState(false)
  const [tagId, setTagId] = useState(NO_TAG)
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [selectedClient, setSelectedClient] =
    useState<ClientComboboxOption | null>(null)
  const [machines, setMachines] = useState<MachineSummary[]>([])
  const [selectedMachine, setSelectedMachine] =
    useState<MachineComboboxOption | null>(null)
  const [selectedAssignee, setSelectedAssignee] =
    useState<MemberComboboxOption | null>(null)
  const [complexityLevel, setComplexityLevel] = useState(NO_COMPLEXITY)
  const [members, setMembers] = useState<TeamMemberSummary[]>([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const clientOptions = useMemo(() => clients.map(toClientOption), [clients])
  const machineOptions = useMemo(
    () => machines.map(toMachineOption),
    [machines],
  )
  const memberOptions = useMemo(
    () => members.map(toMemberOption),
    [members],
  )

  function resetForm() {
    setTitle('')
    setDescription('')
    setEstimatedHours('')
    setIndefiniteTime(false)
    setTagId(NO_TAG)
    setSelectedClient(null)
    setSelectedMachine(null)
    setSelectedAssignee(null)
    setComplexityLevel(NO_COMPLEXITY)
  }

  useEffect(() => {
    if (open) {
      setTagId(NO_TAG)
      setSelectedClient(null)
      setSelectedMachine(null)
      setSelectedAssignee(null)
      setComplexityLevel(NO_COMPLEXITY)
      setIsLoadingOptions(true)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false

    async function loadOptions() {
      try {
        const [clientsData, machinesData, teamData] = await Promise.all([
          api<ClientsListResponse>('/clients', { toastOnError: false }).catch(
            () => ({ clients: [] }) as ClientsListResponse,
          ),
          api<MachinesListResponse>(
            `/machines?teamId=${encodeURIComponent(teamId)}`,
            {
              toastOnError: false,
            },
          ).catch(() => ({ machines: [] }) as MachinesListResponse),
          api<TeamResponse>(`/teams/${teamId}`, { toastOnError: false }).catch(
            () => ({ team: { members: [] } }) as TeamResponse,
          ),
        ])

        if (!cancelled) {
          setClients(clientsData.clients)
          setMachines(machinesData.machines)
          setMembers(teamData.team.members)
        }
      } finally {
        if (!cancelled) {
          setIsLoadingOptions(false)
        }
      }
    }

    void loadOptions()

    return () => {
      cancelled = true
    }
  }, [open, teamId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const payload: CreateActivityInput = { title: title.trim() }
      const trimmedDescription = description.trim()
      const parsedHours =
        !indefiniteTime && estimatedHours.trim()
          ? Number.parseFloat(estimatedHours)
          : undefined

      if (trimmedDescription) {
        payload.description = trimmedDescription
      }

      if (parsedHours !== undefined && !Number.isNaN(parsedHours)) {
        payload.estimatedHours = parsedHours
      }

      if (tagId !== NO_TAG) {
        payload.tagId = tagId
      }

      if (selectedClient) {
        payload.clientId = selectedClient.value
      }

      if (selectedMachine) {
        payload.machineId = selectedMachine.value
      }

      if (selectedAssignee) {
        payload.assignedToId = selectedAssignee.value
      }

      if (isComplexityLevel(complexityLevel)) {
        payload.complexityLevel = complexityLevel
      }

      await api<ActivityResponse>(`/teams/${teamId}/activities`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      resetForm()
      onOpenChange(false)
      onCreated()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetForm()
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="flex max-h-[70vh] flex-col gap-0 overflow-hidden">
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogHeader className="shrink-0 pr-8">
            <DialogTitle>Criar nova atividade</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar uma nova atividade nesta equipe.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="-mx-1 min-h-0 w-auto flex-1 overflow-x-hidden overflow-y-auto px-1 py-4">
            <Field>
              <FieldLabel htmlFor="activity-title">Título</FieldLabel>
              <Input
                id="activity-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Título da atividade"
                required
                disabled={isSubmitting}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="activity-description">Descrição</FieldLabel>
              <Textarea
                id="activity-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descrição opcional"
                disabled={isSubmitting}
                rows={3}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="activity-tag">Etiqueta</FieldLabel>
              <Select
                value={tagId}
                onValueChange={(value) => setTagId(value ?? NO_TAG)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="activity-tag" className="w-full">
                  <SelectValue placeholder="Sem etiqueta">
                    {(selectedValue) => {
                      const value = String(selectedValue ?? NO_TAG)
                      if (value === NO_TAG) {
                        return 'Sem etiqueta'
                      }

                      const tag = tags.find((item) => item.id === value)
                      if (!tag) {
                        return 'Etiqueta'
                      }

                      return (
                        <span className="flex items-center gap-2">
                          <ActivityTagBadge tag={tag} />
                        </span>
                      )
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TAG}>Sem etiqueta</SelectItem>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: tag.color }}
                          aria-hidden
                        />
                        {tag.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="activity-client">Cliente</FieldLabel>
              {isLoadingOptions ? (
                <div className="flex h-8 items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Carregando clientes...
                </div>
              ) : (
                <Combobox
                  items={clientOptions}
                  value={selectedClient}
                  onValueChange={setSelectedClient}
                  itemToStringLabel={(item) => item.label}
                  isItemEqualToValue={(a, b) => a.value === b.value}
                  disabled={isSubmitting}
                >
                  <ComboboxInput
                    id="activity-client"
                    className="w-full"
                    placeholder="Buscar cliente..."
                    showClear
                    disabled={isSubmitting}
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>Nenhum cliente encontrado.</ComboboxEmpty>
                    <ComboboxList>
                      {(item) => (
                        <ComboboxItem key={item.value} value={item}>
                          {item.label}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="activity-machine">Máquina</FieldLabel>
              {isLoadingOptions ? (
                <div className="flex h-8 items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Carregando máquinas...
                </div>
              ) : (
                <Combobox
                  items={machineOptions}
                  value={selectedMachine}
                  onValueChange={setSelectedMachine}
                  itemToStringLabel={(item) => item.label}
                  isItemEqualToValue={(a, b) => a.value === b.value}
                  disabled={isSubmitting}
                >
                  <ComboboxInput
                    id="activity-machine"
                    className="w-full"
                    placeholder="Buscar máquina..."
                    showClear
                    disabled={isSubmitting}
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>Nenhuma máquina encontrada.</ComboboxEmpty>
                    <ComboboxList>
                      {(item) => (
                        <ComboboxItem key={item.value} value={item}>
                          {item.label}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="activity-assignee">Responsável</FieldLabel>
              {isLoadingOptions ? (
                <div className="flex h-8 items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Carregando membros...
                </div>
              ) : (
                <Combobox
                  items={memberOptions}
                  value={selectedAssignee}
                  onValueChange={setSelectedAssignee}
                  itemToStringLabel={(item) => item.label}
                  isItemEqualToValue={(a, b) => a.value === b.value}
                  disabled={isSubmitting}
                >
                  <ComboboxInput
                    id="activity-assignee"
                    className="w-full"
                    placeholder="Buscar responsável..."
                    showClear
                    disabled={isSubmitting}
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>Nenhum membro encontrado.</ComboboxEmpty>
                    <ComboboxList>
                      {(item) => (
                        <ComboboxItem key={item.value} value={item}>
                          {item.label}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="activity-complexity">
                Nível de complexidade
              </FieldLabel>
              <Select
                value={complexityLevel}
                onValueChange={(value) =>
                  setComplexityLevel(value ?? NO_COMPLEXITY)
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="activity-complexity" className="w-full">
                  <SelectValue placeholder="Não definido">
                    {(selectedValue) => {
                      const value = String(selectedValue ?? NO_COMPLEXITY)
                      if (!isComplexityLevel(value)) {
                        return 'Não definido'
                      }

                      return <ComplexityLevelMeter level={value} />
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_COMPLEXITY}>Não definido</SelectItem>
                  {COMPLEXITY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      <ComplexityLevelMeter level={level} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="activity-estimated-hours">
                Horas estimadas
              </FieldLabel>
              <Input
                id="activity-estimated-hours"
                type="number"
                min="0"
                step="0.25"
                value={estimatedHours}
                onChange={(event) => setEstimatedHours(event.target.value)}
                placeholder="Ex.: 8"
                disabled={isSubmitting || indefiniteTime}
              />
            </Field>
            <Field orientation="horizontal">
              <input
                id="activity-indefinite-time"
                type="checkbox"
                checked={indefiniteTime}
                onChange={(event) => {
                  const checked = event.target.checked
                  setIndefiniteTime(checked)
                  if (checked) {
                    setEstimatedHours('')
                  }
                }}
                disabled={isSubmitting}
                className="size-4 accent-primary"
              />
              <FieldLabel htmlFor="activity-indefinite-time">
                Tempo indefinido
              </FieldLabel>
            </Field>
          </FieldGroup>

          <DialogFooter className="shrink-0">
            <Button
              type="button"
              variant="cancel"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? 'Criando...' : 'Criar atividade'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
