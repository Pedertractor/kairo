import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'

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
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api-handler'
import { TAG_COLOR_SWATCHES } from '@/lib/tag-colors'
import { cn } from '@/lib/utils'
import type {
  CreateTagInput,
  TagResponse,
  TagSummary,
  UpdateTagInput,
} from '@/types/tag'

interface ManageTagsDialogProps {
  teamId: string
  tags: TagSummary[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (tag: TagSummary) => void
  onUpdated: (tag: TagSummary) => void
  onDeleted: (tagId: string) => void
}

function TagColorPicker({
  color,
  onChange,
  disabled,
}: {
  color: string
  onChange: (color: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2" role="listbox" aria-label="Cor da etiqueta">
      {TAG_COLOR_SWATCHES.map((swatch) => {
        const isSelected = color === swatch

        return (
          <button
            key={swatch}
            type="button"
            role="option"
            aria-selected={isSelected}
            aria-label={`Cor ${swatch}`}
            disabled={disabled}
            onClick={() => onChange(swatch)}
            className={cn(
              'size-8 rounded-full border-2 transition-shadow',
              isSelected
                ? 'border-foreground ring-2 ring-ring/40'
                : 'border-transparent hover:ring-2 hover:ring-ring/20',
            )}
            style={{ backgroundColor: swatch }}
          />
        )
      })}
    </div>
  )
}

export function ManageTagsDialog({
  teamId,
  tags,
  open,
  onOpenChange,
  onCreated,
  onUpdated,
  onDeleted,
}: ManageTagsDialogProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(TAG_COLOR_SWATCHES[0])
  const [isCreating, setIsCreating] = useState(false)
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState<string>(TAG_COLOR_SWATCHES[0])
  const [isSaving, setIsSaving] = useState(false)
  const [tagToDelete, setTagToDelete] = useState<TagSummary | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  function resetCreateForm() {
    setName('')
    setColor(TAG_COLOR_SWATCHES[0])
  }

  function stopEditing() {
    setEditingTagId(null)
    setEditName('')
    setEditColor(TAG_COLOR_SWATCHES[0])
  }

  function startEditing(tag: TagSummary) {
    setEditingTagId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
  }

  useEffect(() => {
    if (open) {
      resetCreateForm()
      stopEditing()
      setTagToDelete(null)
    }
  }, [open])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }

    setIsCreating(true)

    try {
      const payload: CreateTagInput = {
        name: trimmedName,
        color,
      }

      const data = await api<TagResponse>(`/teams/${teamId}/tags`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      resetCreateForm()
      onCreated(data.tag)
    } finally {
      setIsCreating(false)
    }
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editingTagId) {
      return
    }

    const trimmedName = editName.trim()
    if (!trimmedName) {
      return
    }

    const current = tags.find((tag) => tag.id === editingTagId)
    if (current && current.name === trimmedName && current.color === editColor) {
      stopEditing()
      return
    }

    setIsSaving(true)

    try {
      const payload: UpdateTagInput = {
        name: trimmedName,
        color: editColor,
      }

      const data = await api<TagResponse>(
        `/teams/${teamId}/tags/${editingTagId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      )

      stopEditing()
      onUpdated(data.tag)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleConfirmDelete() {
    if (!tagToDelete) {
      return
    }

    setIsDeleting(true)

    try {
      await api<TagResponse>(`/teams/${teamId}/tags/${tagToDelete.id}`, {
        method: 'DELETE',
      })

      if (editingTagId === tagToDelete.id) {
        stopEditing()
      }

      onDeleted(tagToDelete.id)
      setTagToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const isBusy = isCreating || isSaving || isDeleting

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && tagToDelete) {
            return
          }

          if (!nextOpen) {
            resetCreateForm()
            stopEditing()
          }
          onOpenChange(nextOpen)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Etiquetas</DialogTitle>
            <DialogDescription>
              Crie, edite ou exclua etiquetas para organizar as atividades desta
              equipe.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate}>
            <FieldGroup className="py-2">
              <Field>
                <FieldLabel htmlFor="new-tag-name">Nova etiqueta</FieldLabel>
                <Input
                  id="new-tag-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nome da etiqueta"
                  required
                  disabled={isBusy}
                />
              </Field>
              <Field>
                <FieldLabel>Cor</FieldLabel>
                <TagColorPicker
                  color={color}
                  onChange={setColor}
                  disabled={isBusy}
                />
              </Field>
            </FieldGroup>
            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={isBusy || !name.trim()}>
                <Plus />
                {isCreating ? 'Criando...' : 'Criar etiqueta'}
              </Button>
            </div>
          </form>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Etiquetas criadas</p>
            {tags.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
                Nenhuma etiqueta ainda. Crie a primeira acima.
              </p>
            ) : (
              <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {tags.map((tag) => {
                  const isEditing = editingTagId === tag.id

                  if (isEditing) {
                    return (
                      <li
                        key={tag.id}
                        className="rounded-lg border bg-muted/20 p-3"
                      >
                        <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
                          <Input
                            value={editName}
                            onChange={(event) => setEditName(event.target.value)}
                            placeholder="Nome da etiqueta"
                            required
                            disabled={isBusy}
                            aria-label={`Editar nome da etiqueta ${tag.name}`}
                          />
                          <TagColorPicker
                            color={editColor}
                            onChange={setEditColor}
                            disabled={isBusy}
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="cancel"
                              onClick={stopEditing}
                              disabled={isBusy}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="submit"
                              disabled={isBusy || !editName.trim()}
                            >
                              {isSaving ? 'Salvando...' : 'Salvar'}
                            </Button>
                          </div>
                        </form>
                      </li>
                    )
                  }

                  return (
                    <li
                      key={tag.id}
                      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                    >
                      <ActivityTagBadge tag={tag} />
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Editar etiqueta ${tag.name}`}
                          disabled={isBusy}
                          onClick={() => startEditing(tag)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Excluir etiqueta ${tag.name}`}
                          disabled={isBusy}
                          onClick={() => setTagToDelete(tag)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={tagToDelete !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isDeleting) {
            setTagToDelete(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir etiqueta</DialogTitle>
            <DialogDescription>
              {tagToDelete ? (
                <>
                  Tem certeza que deseja excluir a etiqueta{' '}
                  <span className="font-medium text-foreground">
                    {tagToDelete.name}
                  </span>
                  ? Ela será removida das atividades que a utilizam.
                </>
              ) : (
                'Tem certeza que deseja excluir esta etiqueta?'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="cancel"
              onClick={() => setTagToDelete(null)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting || !tagToDelete}
              onClick={() => void handleConfirmDelete()}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
