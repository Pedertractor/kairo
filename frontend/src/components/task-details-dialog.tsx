import { useEffect, useMemo, useState, type FormEvent } from 'react'
import dayjs from 'dayjs'
import { Loader2 } from 'lucide-react'

import { ActivityTagBadge } from '@/components/activity-tag-badge'
import { CardTimeBudget } from '@/components/card-time-budget'
import { ComplexityLevelMeter } from '@/components/complexity-level-meter'
import { Button } from '@/components/ui/button'
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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api-handler'
import {
  COMPLEXITY_LEVELS,
  NO_COMPLEXITY,
  isComplexityLevel,
} from '@/lib/complexity-level'
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
} from '@/lib/task-status'
import type { MachineSummary, MachinesListResponse } from '@/types/machine'
import type { TagSummary, TagsListResponse } from '@/types/tag'
import type {
  TaskDetail,
  TaskDetailResponse,
  TaskStatus,
  TaskSummary,
  UpdateTaskInput,
} from '@/types/task'
import type { TeamMemberSummary, TeamResponse } from '@/types/team'

const NO_TAG = '__none__'

type MachineComboboxOption = {
  value: string
  label: string
}

type MemberComboboxOption = {
  value: string
  label: string
}

interface TaskDetailsDialogProps {
  projectId: string
  teamId: string
  task: TaskSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (task?: TaskDetail) => void
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

function toHoursInput(estimatedHours: string | null) {
  if (!estimatedHours) {
    return ''
  }

  const parsed = Number.parseFloat(estimatedHours)

  return Number.isFinite(parsed) ? String(parsed) : ''
}

function toHoursValue(input: string) {
  const parsed = Number.parseFloat(input)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function TaskDetailsDialog({
  projectId,
  teamId,
  task,
  open,
  onOpenChange,
  onUpdated,
}: TaskDetailsDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('TODO')
  const [tagId, setTagId] = useState(NO_TAG)
  const [complexityLevel, setComplexityLevel] = useState(NO_COMPLEXITY)
  const [estimatedHours, setEstimatedHours] = useState('')
  const [selectedMachine, setSelectedMachine] =
    useState<MachineComboboxOption | null>(null)
  const [selectedAssignee, setSelectedAssignee] =
    useState<MemberComboboxOption | null>(null)
  const [tags, setTags] = useState<TagSummary[]>([])
  const [machines, setMachines] = useState<MachineSummary[]>([])
  const [members, setMembers] = useState<TeamMemberSummary[]>([])
  const [loggedSeconds, setLoggedSeconds] = useState<number | null>(null)
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const machineOptions = useMemo(() => {
    const options = machines.map(toMachineOption)

    if (
      task?.machine &&
      !options.some((option) => option.value === task.machine?.id)
    ) {
      options.unshift(toMachineOption(task.machine))
    }

    return options
  }, [machines, task?.machine])
  const memberOptions = useMemo(() => {
    const options = members.map(toMemberOption)

    if (
      task?.assignedToId &&
      task.assignedToName &&
      !options.some((option) => option.value === task.assignedToId)
    ) {
      options.unshift({
        value: task.assignedToId,
        label: task.assignedToName,
      })
    }

    return options
  }, [members, task?.assignedToId, task?.assignedToName])

  useEffect(() => {
    if (!open || !task) {
      return
    }

    setTitle(task.title)
    setDescription(task.description ?? '')
    setStatus(task.status)
    setTagId(task.tag?.id ?? NO_TAG)
    setComplexityLevel(task.complexityLevel ?? NO_COMPLEXITY)
    setEstimatedHours(toHoursInput(task.estimatedHours))
    setSelectedMachine(task.machine ? toMachineOption(task.machine) : null)
    setSelectedAssignee(
      task.assignedToId && task.assignedToName
        ? { value: task.assignedToId, label: task.assignedToName }
        : null,
    )
    setLoggedSeconds(
      'loggedSeconds' in task && typeof task.loggedSeconds === 'number'
        ? task.loggedSeconds
        : null,
    )
  }, [open, task])

  useEffect(() => {
    if (!open || !task) {
      return
    }

    const taskId = task.id
    let cancelled = false

    async function loadOptions() {
      setIsLoadingOptions(true)

      try {
        const [tagsData, machinesData, teamData, taskData] = await Promise.all([
          api<TagsListResponse>(`/teams/${teamId}/tags`, {
            toastOnError: false,
          }).catch(() => ({ tags: [] }) as TagsListResponse),
          api<MachinesListResponse>(
            `/machines?teamId=${encodeURIComponent(teamId)}`,
            {
              toastOnError: false,
            },
          ).catch(() => ({ machines: [] }) as MachinesListResponse),
          api<TeamResponse>(`/teams/${teamId}`, { toastOnError: false }).catch(
            () => null,
          ),
          api<TaskDetailResponse>(
            `/projects/${projectId}/tasks/${taskId}`,
            { toastOnError: false },
          ).catch(() => null),
        ])

        if (!cancelled) {
          setTags(tagsData.tags)
          setMachines(machinesData.machines)
          setMembers(teamData?.team.members ?? [])
          if (taskData) {
            setLoggedSeconds(taskData.task.loggedSeconds)
          }
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
  }, [open, teamId, projectId, task?.id])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!task) {
      return
    }

    const payload: UpdateTaskInput = {}

    const nextTitle = title.trim()
    if (nextTitle && nextTitle !== task.title) {
      payload.title = nextTitle
    }

    const nextDescription = description.trim() || null
    if (nextDescription !== (task.description ?? null)) {
      payload.description = nextDescription
    }

    const nextTagId = tagId === NO_TAG ? null : tagId
    if (nextTagId !== (task.tag?.id ?? null)) {
      payload.tagId = nextTagId
    }

    const nextMachineId = selectedMachine?.value ?? null
    if (nextMachineId !== (task.machine?.id ?? null)) {
      payload.machineId = nextMachineId
    }

    const nextAssignedToId = selectedAssignee?.value ?? null
    if (nextAssignedToId !== (task.assignedToId ?? null)) {
      payload.assignedToId = nextAssignedToId
    }

    const nextComplexity = isComplexityLevel(complexityLevel)
      ? complexityLevel
      : null
    if (nextComplexity !== (task.complexityLevel ?? null)) {
      payload.complexityLevel = nextComplexity
    }

    const nextHours = toHoursValue(estimatedHours)
    if (nextHours !== toHoursValue(task.estimatedHours ?? '')) {
      payload.estimatedHours = nextHours
    }

    if (status !== task.status) {
      payload.status = status
    }

    if (Object.keys(payload).length === 0) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)

    try {
      const data = await api<TaskDetailResponse>(
        `/projects/${projectId}/tasks/${task.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      )

      onOpenChange(false)
      onUpdated(data.task)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isBusy = isSubmitting || !task

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Detalhes da tarefa</DialogTitle>
            <DialogDescription>
              Visualize e edite as informações desta tarefa.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="task-details-title">Nome</FieldLabel>
              <Input
                id="task-details-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Título da tarefa"
                required
                disabled={isBusy}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="task-details-description">
                Descrição
              </FieldLabel>
              <Textarea
                id="task-details-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descrição opcional"
                rows={3}
                disabled={isBusy}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="task-details-status">Status</FieldLabel>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as TaskStatus)}
                disabled={isBusy}
              >
                <SelectTrigger id="task-details-status" className="w-full">
                  <SelectValue placeholder="Selecione um status">
                    {(selectedValue) =>
                      TASK_STATUS_LABELS[selectedValue as TaskStatus]
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {TASK_STATUS_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="task-details-tag">Etiqueta</FieldLabel>
              <Select
                value={tagId}
                onValueChange={(value) => setTagId(value ?? NO_TAG)}
                disabled={isBusy || isLoadingOptions}
              >
                <SelectTrigger id="task-details-tag" className="w-full">
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
              <FieldLabel htmlFor="task-details-machine">Máquina</FieldLabel>
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
                  disabled={isBusy}
                >
                  <ComboboxInput
                    id="task-details-machine"
                    className="w-full"
                    placeholder="Buscar máquina..."
                    showClear
                    disabled={isBusy}
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
              <FieldLabel htmlFor="task-details-assignee">
                Responsável
              </FieldLabel>
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
                  disabled={isBusy}
                >
                  <ComboboxInput
                    id="task-details-assignee"
                    className="w-full"
                    placeholder="Buscar responsável..."
                    showClear
                    disabled={isBusy}
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
              <FieldLabel htmlFor="task-details-complexity">
                Nível de complexidade
              </FieldLabel>
              <Select
                value={complexityLevel}
                onValueChange={(value) =>
                  setComplexityLevel(value ?? NO_COMPLEXITY)
                }
                disabled={isBusy}
              >
                <SelectTrigger id="task-details-complexity" className="w-full">
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
              <FieldLabel htmlFor="task-details-estimated-hours">
                Horas estimadas
              </FieldLabel>
              <Input
                id="task-details-estimated-hours"
                type="number"
                min="0"
                step="0.25"
                value={estimatedHours}
                onChange={(event) => setEstimatedHours(event.target.value)}
                placeholder="Ex.: 8"
                disabled={isBusy}
              />
              <FieldDescription>
                Deixe em branco para tempo indefinido.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="task-details-created-by">
                Criado por
              </FieldLabel>
              <Input
                id="task-details-created-by"
                value={task?.createdByName ?? ''}
                readOnly
                disabled
              />
            </Field>

            {task ? (
              <>
                <Separator />
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {loggedSeconds !== null ? (
                    <CardTimeBudget
                      loggedSeconds={loggedSeconds}
                      estimatedHours={task.estimatedHours}
                    />
                  ) : null}
                  <p>
                    Criada em{' '}
                    {dayjs(task.createdAt).format('DD/MM/YYYY [às] HH:mm')}
                  </p>
                  <p>
                    Última atualização em{' '}
                    {dayjs(task.updatedAt).format('DD/MM/YYYY [às] HH:mm')}
                  </p>
                </div>
              </>
            ) : null}
          </FieldGroup>

          <DialogFooter>
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
              disabled={isSubmitting || !task || !title.trim()}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
