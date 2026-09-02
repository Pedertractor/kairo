import { useEffect, useState, type FormEvent } from 'react'

import { ActivityTagBadge } from '@/components/activity-tag-badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api-handler'
import type {
  ActivityResponse,
  ActivitySummary,
  UpdateActivityInput,
} from '@/types/card'
import type { TagSummary, TagsListResponse } from '@/types/tag'

const NO_TAG = '__none__'

interface EditActivityTagDialogProps {
  teamId: string
  activity: ActivitySummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

export function EditActivityTagDialog({
  teamId,
  activity,
  open,
  onOpenChange,
  onUpdated,
}: EditActivityTagDialogProps) {
  const [tags, setTags] = useState<TagSummary[]>([])
  const [selectedTagId, setSelectedTagId] = useState(NO_TAG)
  const [isLoadingTags, setIsLoadingTags] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !activity) {
      return
    }

    setSelectedTagId(activity.tag?.id ?? NO_TAG)

    let cancelled = false

    async function loadTags() {
      setIsLoadingTags(true)

      try {
        const data = await api<TagsListResponse>(`/teams/${teamId}/tags`)
        if (!cancelled) {
          setTags(data.tags)
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTags(false)
        }
      }
    }

    void loadTags()

    return () => {
      cancelled = true
    }
  }, [open, activity, teamId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!activity) {
      return
    }

    const nextTagId = selectedTagId === NO_TAG ? null : selectedTagId
    const currentTagId = activity.tag?.id ?? null

    if (nextTagId === currentTagId) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)

    try {
      const payload: UpdateActivityInput = { tagId: nextTagId }

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

  function getTagLabel(value: string) {
    if (value === NO_TAG) {
      return 'Sem etiqueta'
    }

    const tag = tags.find((item) => item.id === value)
    return tag?.name ?? 'Etiqueta'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Alterar etiqueta</DialogTitle>
            <DialogDescription>
              {activity
                ? `Selecione a etiqueta para "${activity.title}".`
                : 'Selecione a etiqueta da atividade.'}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="activity-tag">Etiqueta</FieldLabel>
              <Select
                value={selectedTagId}
                onValueChange={(value) => setSelectedTagId(value ?? NO_TAG)}
                disabled={isSubmitting || isLoadingTags || !activity}
              >
                <SelectTrigger id="activity-tag" className="w-full">
                  <SelectValue placeholder="Selecione uma etiqueta">
                    {(selectedValue) => {
                      const value = String(selectedValue ?? NO_TAG)
                      if (value === NO_TAG) {
                        return 'Sem etiqueta'
                      }

                      const tag = tags.find((item) => item.id === value)
                      if (!tag) {
                        return getTagLabel(value)
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
            <Button type="submit" disabled={isSubmitting || isLoadingTags}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
