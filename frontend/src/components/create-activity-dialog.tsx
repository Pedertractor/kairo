import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
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
import { invalidateActivityData } from '@/lib/activity-data-invalidation'
import {
  COMPLEXITY_LEVELS,
  NO_COMPLEXITY,
  isComplexityLevel,
} from '@/lib/complexity-level'
import { canCreateTeamActivities } from '@/lib/team-permissions'
import type { ActivityResponse, ActivitySummary, CreateActivityInput } from '@/types/card'
import type { ClientSummary, ClientsListResponse } from '@/types/client'
import type { MachineSummary, MachinesListResponse } from '@/types/machine'
import type { TagSummary, TagsListResponse } from '@/types/tag'
import type {
  TeamMemberSummary,
  TeamResponse,
  TeamSummary,
  TeamsListResponse,
} from '@/types/team'

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
  teamId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
  tags?: TagSummary[]
  sourceActivity?: ActivitySummary
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
  teamId: fixedTeamId,
  open,
  onOpenChange,
  onCreated,
  tags = [],
  sourceActivity,
}: CreateActivityDialogProps) {
  const isCopy = sourceActivity !== undefined
  const requiresTeamSelection = isCopy || fixedTeamId === undefined
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [isLoadingTeams, setIsLoadingTeams] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [indefiniteTime, setIndefiniteTime] = useState(false)
  const [tagId, setTagId] = useState(NO_TAG)
  const [loadedTags, setLoadedTags] = useState<TagSummary[]>([])
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
  const [teamsError, setTeamsError] = useState(false)
  const [optionsError, setOptionsError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [loadedTeamId, setLoadedTeamId] = useState('')
  const [removedFields, setRemovedFields] = useState<string[]>([])
  const initializedSource = useRef<string | null>(null)
  const reconciledTeam = useRef('')
  const submitting = useRef(false)
  const teamId = isCopy ? selectedTeamId : fixedTeamId ?? selectedTeamId
  const availableTags = requiresTeamSelection ? loadedTags : tags
  const copyBlocked = isCopy && (
    isLoadingTeams || isLoadingOptions || teamsError || optionsError ||
    loadedTeamId !== teamId || !teams.some((team) => team.id === teamId)
  )
  const selections = useRef({ tagId, selectedMachine, selectedAssignee })
  selections.current = { tagId, selectedMachine, selectedAssignee }

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
    setSelectedTeamId('')
    setTitle('')
    setDescription('')
    setEstimatedHours('')
    setIndefiniteTime(false)
    setTagId(NO_TAG)
    setLoadedTags([])
    setSelectedClient(null)
    setSelectedMachine(null)
    setSelectedAssignee(null)
    setComplexityLevel(NO_COMPLEXITY)
  }

  useEffect(() => {
    if (!open) {
      initializedSource.current = null
      return
    }
    const sourceKey = sourceActivity?.id ?? '__create__'
    if (initializedSource.current === sourceKey) return
    initializedSource.current = sourceKey
    setTeamsError(false)
    setOptionsError(false)
    setRemovedFields([])
    setLoadedTeamId('')
    reconciledTeam.current = sourceActivity?.teamId ?? ''
    if (!sourceActivity) return
    setTeams([])
    setSelectedTeamId(sourceActivity.teamId)
    setTitle(sourceActivity.title)
    setDescription(sourceActivity.description ?? '')
    setEstimatedHours(sourceActivity.estimatedHours ?? '')
    setIndefiniteTime(sourceActivity.estimatedHours === null)
    setTagId(sourceActivity.tag?.id ?? NO_TAG)
    setLoadedTags([])
    setSelectedClient(sourceActivity.client ? toClientOption(sourceActivity.client) : null)
    setSelectedMachine(sourceActivity.machine ? toMachineOption(sourceActivity.machine) : null)
    setSelectedAssignee(sourceActivity.assignedToId ? {
      value: sourceActivity.assignedToId,
      label: sourceActivity.assignedToName ?? 'Responsável',
    } : null)
    setComplexityLevel(sourceActivity.complexityLevel ?? NO_COMPLEXITY)
  }, [open, sourceActivity])

  useEffect(() => {
    if (!open || !requiresTeamSelection) {
      return
    }

    let cancelled = false

    async function loadTeams() {
      setIsLoadingTeams(true)
      setTeamsError(false)

      try {
        const data = await api<TeamsListResponse>('/teams')
        if (!cancelled) {
          setTeams(data.teams.filter(canCreateTeamActivities))
        }
      } catch {
        if (!cancelled) setTeamsError(true)
      } finally {
        if (!cancelled) {
          setIsLoadingTeams(false)
        }
      }
    }

    void loadTeams()

    return () => {
      cancelled = true
    }
  }, [open, requiresTeamSelection, retryCount])

  useEffect(() => {
    if (open && !isCopy) {
      setTagId(NO_TAG)
      setSelectedClient(null)
      setSelectedMachine(null)
      setSelectedAssignee(null)
      setComplexityLevel(NO_COMPLEXITY)
      setIsLoadingOptions(Boolean(teamId))
    }
  }, [open, teamId, isCopy])

  useEffect(() => {
    if (!open || !teamId) {
      return
    }

    let cancelled = false

    async function loadOptions() {
      setIsLoadingOptions(true)
      setOptionsError(false)
      try {
        function tolerateFailure<T>(request: Promise<T>, fallback: T): Promise<T> {
          return isCopy ? request : request.catch(() => fallback)
        }
        const [clientsData, machinesData, teamData, tagsData] = await Promise.all([
          tolerateFailure(api<ClientsListResponse>('/clients', { toastOnError: false }), { clients: [] }),
          tolerateFailure(api<MachinesListResponse>(
            `/machines?teamId=${encodeURIComponent(teamId)}`,
            {
              toastOnError: false,
            },
          ), { machines: [] }),
          tolerateFailure<TeamResponse | null>(api<TeamResponse>(`/teams/${teamId}`, { toastOnError: false }), null),
          requiresTeamSelection
            ? tolerateFailure(api<TagsListResponse>(`/teams/${teamId}/tags`, {
                toastOnError: false,
              }), { tags: [] })
            : Promise.resolve({ tags: [] } as TagsListResponse),
        ])

        if (!cancelled) {
          setClients(clientsData.clients)
          setMachines(machinesData.machines)
          setMembers(teamData?.team.members ?? [])
          if (requiresTeamSelection) {
            setLoadedTags(tagsData.tags)
          }
          if (isCopy && reconciledTeam.current !== teamId) {
            const removed: string[] = []
            const current = selections.current
            if (current.tagId !== NO_TAG && !tagsData.tags.some((tag) => tag.id === current.tagId)) {
              setTagId(NO_TAG)
              removed.push('etiqueta')
            }
            if (current.selectedMachine && !machinesData.machines.some((machine) => machine.id === current.selectedMachine?.value)) {
              setSelectedMachine(null)
              removed.push('máquina')
            }
            if (current.selectedAssignee && !teamData?.team.members.some((member) => member.id === current.selectedAssignee?.value)) {
              setSelectedAssignee(null)
              removed.push('responsável')
            }
            setRemovedFields(removed)
            reconciledTeam.current = teamId
          }
          setLoadedTeamId(teamId)
        }
      } catch {
        if (!cancelled) setOptionsError(true)
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
  }, [open, teamId, requiresTeamSelection, isCopy, retryCount, sourceActivity?.id])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!teamId || submitting.current || copyBlocked || !title.trim()) {
      return
    }

    submitting.current = true
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
      if (isCopy) invalidateActivityData()
      onCreated()
    } catch {
      // The API displays the error; retain all edits for another attempt.
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isCopy && submitting.current) return
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
            <DialogTitle>{isCopy ? 'Copiar atividade' : 'Criar nova atividade'}</DialogTitle>
            <DialogDescription>
              {isCopy
                ? 'Confira os dados e a equipe para criar uma cópia desta atividade.'
                : requiresTeamSelection
                ? 'Selecione a equipe e preencha os dados para criar uma nova atividade.'
                : 'Preencha os dados para criar uma nova atividade nesta equipe.'}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="-mx-1 min-h-0 w-auto flex-1 overflow-x-hidden overflow-y-auto px-1 py-4">
            {isCopy && (teamsError || optionsError) ? (
              <div role="alert" className="space-y-2 text-sm text-destructive">
                <p>Não foi possível carregar as opções. Seus dados foram mantidos.</p>
                <Button type="button" variant="outline" disabled={isLoadingTeams || isLoadingOptions || isSubmitting} onClick={() => setRetryCount((count) => count + 1)}>
                  Tentar novamente
                </Button>
              </div>
            ) : null}
            {isCopy && removedFields.length > 0 ? (
              <output aria-live="polite" className="block text-sm text-muted-foreground">
                Campos removidos por não estarem disponíveis nesta equipe: {removedFields.join(', ')}.
              </output>
            ) : null}
            {isCopy && !isLoadingTeams && !teamsError && teamId && !teams.some((team) => team.id === teamId) ? (
              <p role="alert" className="text-sm text-destructive">
                Você não tem permissão para criar atividades nesta equipe. Selecione outra equipe.
              </p>
            ) : null}
            {requiresTeamSelection ? (
              <Field>
                <FieldLabel htmlFor="activity-team">Equipe</FieldLabel>
                <Select
                  value={selectedTeamId || undefined}
                  onValueChange={(value) => {
                    if (isCopy && (value ?? '') === selectedTeamId) return
                    setSelectedTeamId(value ?? '')
                    if (isCopy) {
                      setIsLoadingOptions(true)
                      setRemovedFields([])
                    } else {
                      setTagId(NO_TAG)
                      setSelectedMachine(null)
                      setSelectedAssignee(null)
                    }
                  }}
                  disabled={isSubmitting || isLoadingTeams}
                >
                  <SelectTrigger id="activity-team" className="w-full">
                    <SelectValue
                      placeholder={
                        isLoadingTeams
                          ? 'Carregando equipes...'
                          : 'Selecione uma equipe'
                      }
                    >
                      {(value) =>
                        teams.find((team) => team.id === value)?.name ??
                        (isCopy && value === sourceActivity?.teamId ? sourceActivity.teamName : undefined) ??
                        'Selecione uma equipe'
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
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
                disabled={isSubmitting || !teamId || (isCopy && (isLoadingOptions || loadedTeamId !== teamId || optionsError))}
              >
                <SelectTrigger id="activity-tag" className="w-full">
                  <SelectValue placeholder="Sem etiqueta">
                    {(selectedValue) => {
                      const value = String(selectedValue ?? NO_TAG)
                      if (value === NO_TAG) {
                        return 'Sem etiqueta'
                      }

                      const tag = availableTags.find((item) => item.id === value) ??
                        (sourceActivity?.tag?.id === value ? sourceActivity.tag : null)
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
                  {availableTags.map((tag) => (
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
                  disabled={isSubmitting || (isCopy && optionsError)}
                >
                  <ComboboxInput
                    id="activity-client"
                    className="w-full"
                    placeholder="Buscar cliente..."
                    showClear
                    disabled={isSubmitting || (isCopy && optionsError)}
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
                  disabled={isSubmitting || (isCopy && optionsError)}
                >
                  <ComboboxInput
                    id="activity-machine"
                    className="w-full"
                    placeholder="Buscar máquina..."
                    showClear
                    disabled={isSubmitting || (isCopy && optionsError)}
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
                  disabled={isSubmitting || (isCopy && optionsError)}
                >
                  <ComboboxInput
                    id="activity-assignee"
                    className="w-full"
                    placeholder="Buscar responsável..."
                    showClear
                    disabled={isSubmitting || (isCopy && optionsError)}
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
                step={isCopy ? 'any' : '0.25'}
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
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim() || !teamId || copyBlocked}
            >
              {isSubmitting ? 'Criando...' : 'Criar atividade'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
