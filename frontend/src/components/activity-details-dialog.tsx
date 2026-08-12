import { useEffect, useMemo, useState, type FormEvent } from 'react'
import dayjs from 'dayjs'
import { Loader2 } from 'lucide-react'

import { ActivityTagBadge } from '@/components/activity-tag-badge'
import { CardTimeBudget } from '@/components/card-time-budget'
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
import { CARD_STATUSES, STATUS_LABELS } from '@/lib/card-status'
import type {
  ActivityResponse,
  ActivitySummary,
  CardStatus,
  UpdateActivityInput,
} from '@/types/card'
import type { ClientSummary, ClientsListResponse } from '@/types/client'
import type { TagSummary, TagsListResponse } from '@/types/tag'

const NO_TAG = '__none__'

type ClientComboboxOption = {
  value: string
  label: string
}

interface ActivityDetailsDialogProps {
  teamId: string
  activity: ActivitySummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

function toClientOption(client: ClientSummary): ClientComboboxOption {
  return {
    value: client.id,
    label: client.name,
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

export function ActivityDetailsDialog({
  teamId,
  activity,
  open,
  onOpenChange,
  onUpdated,
}: ActivityDetailsDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<CardStatus>('TODO')
  const [tagId, setTagId] = useState(NO_TAG)
  const [estimatedHours, setEstimatedHours] = useState('')
  const [selectedClient, setSelectedClient] =
    useState<ClientComboboxOption | null>(null)
  const [tags, setTags] = useState<TagSummary[]>([])
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const clientOptions = useMemo(() => clients.map(toClientOption), [clients])

  useEffect(() => {
    if (!open || !activity) {
      return
    }

    setTitle(activity.title)
    setDescription(activity.description ?? '')
    setStatus(activity.status)
    setTagId(activity.tag?.id ?? NO_TAG)
    setEstimatedHours(toHoursInput(activity.estimatedHours))
    setSelectedClient(activity.client ? toClientOption(activity.client) : null)
  }, [open, activity])

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false

    async function loadOptions() {
      setIsLoadingOptions(true)

      try {
        const [tagsData, clientsData] = await Promise.all([
          api<TagsListResponse>(`/teams/${teamId}/tags`),
          api<ClientsListResponse>('/clients', { toastOnError: false }).catch(
            () => ({ clients: [] }) as ClientsListResponse,
          ),
        ])

        if (!cancelled) {
          setTags(tagsData.tags)
          setClients(clientsData.clients)
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

    if (!activity) {
      return
    }

    const payload: UpdateActivityInput = {}

    const nextTitle = title.trim()
    if (nextTitle && nextTitle !== activity.title) {
      payload.title = nextTitle
    }

    const nextDescription = description.trim() || null
    if (nextDescription !== (activity.description ?? null)) {
      payload.description = nextDescription
    }

    if (status !== activity.status) {
      payload.status = status
    }

    const nextTagId = tagId === NO_TAG ? null : tagId
    if (nextTagId !== (activity.tag?.id ?? null)) {
      payload.tagId = nextTagId
    }

    const nextClientId = selectedClient?.value ?? null
    if (nextClientId !== (activity.client?.id ?? null)) {
      payload.clientId = nextClientId
    }

    const nextHours = toHoursValue(estimatedHours)
    if (nextHours !== toHoursValue(activity.estimatedHours ?? '')) {
      payload.estimatedHours = nextHours
    }

    if (Object.keys(payload).length === 0) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)

    try {
      await api<ActivityResponse>(
        `/teams/${teamId}/activities/${activity.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      )

      onOpenChange(false)
      onUpdated()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Detalhes da atividade</DialogTitle>
            <DialogDescription>
              Visualize e edite as informações desta atividade.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="activity-details-title">Nome</FieldLabel>
              <Input
                id="activity-details-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Título da atividade"
                required
                disabled={isSubmitting || !activity}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="activity-details-description">
                Descrição
              </FieldLabel>
              <Textarea
                id="activity-details-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descrição opcional"
                rows={3}
                disabled={isSubmitting || !activity}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="activity-details-status">Status</FieldLabel>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as CardStatus)}
                disabled={isSubmitting || !activity}
              >
                <SelectTrigger id="activity-details-status" className="w-full">
                  <SelectValue placeholder="Selecione um status">
                    {(selectedValue) =>
                      STATUS_LABELS[selectedValue as CardStatus]
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CARD_STATUSES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {STATUS_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="activity-details-tag">Tag</FieldLabel>
              <Select
                value={tagId}
                onValueChange={(value) => setTagId(value ?? NO_TAG)}
                disabled={isSubmitting || isLoadingOptions || !activity}
              >
                <SelectTrigger id="activity-details-tag" className="w-full">
                  <SelectValue placeholder="Sem tag">
                    {(selectedValue) => {
                      const value = String(selectedValue ?? NO_TAG)
                      if (value === NO_TAG) {
                        return 'Sem tag'
                      }

                      const tag = tags.find((item) => item.id === value)
                      if (!tag) {
                        return 'Tag'
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
                  <SelectItem value={NO_TAG}>Sem tag</SelectItem>
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
              <FieldLabel htmlFor="activity-details-client">Cliente</FieldLabel>
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
                  disabled={isSubmitting || !activity}
                >
                  <ComboboxInput
                    id="activity-details-client"
                    className="w-full"
                    placeholder="Buscar cliente..."
                    showClear
                    disabled={isSubmitting || !activity}
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
              <FieldLabel htmlFor="activity-details-estimated-hours">
                Horas estimadas
              </FieldLabel>
              <Input
                id="activity-details-estimated-hours"
                type="number"
                min="0"
                step="0.25"
                value={estimatedHours}
                onChange={(event) => setEstimatedHours(event.target.value)}
                placeholder="Ex.: 8"
                disabled={isSubmitting || !activity}
              />
              <FieldDescription>
                Deixe em branco para tempo indefinido.
              </FieldDescription>
            </Field>

            {activity ? (
              <>
                <Separator />
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <CardTimeBudget
                    loggedSeconds={activity.loggedSeconds}
                    estimatedHours={activity.estimatedHours}
                  />
                  <p>
                    Criada em{' '}
                    {dayjs(activity.createdAt).format('DD/MM/YYYY [às] HH:mm')}
                  </p>
                  <p>
                    Última atualização em{' '}
                    {dayjs(activity.updatedAt).format('DD/MM/YYYY [às] HH:mm')}
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
              disabled={isSubmitting || !activity || !title.trim()}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
