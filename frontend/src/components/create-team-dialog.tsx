import { useState, type FormEvent } from 'react'

import { CostCenterMultiSelect } from '@/components/cost-center-multi-select'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api-handler'
import type { TeamResponse } from '@/types/team'

interface CreateTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function CreateTeamDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateTeamDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [costCenterIds, setCostCenterIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  function resetForm() {
    setName('')
    setDescription('')
    setCostCenterIds([])
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const payload: { name: string; description?: string } = {
        name: name.trim(),
      }
      const trimmedDescription = description.trim()

      if (trimmedDescription) {
        payload.description = trimmedDescription
      }

      const created = await api<TeamResponse>('/teams', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (costCenterIds.length > 0) {
        await api<TeamResponse>(`/teams/${created.team.id}/cost-centers`, {
          method: 'PUT',
          body: JSON.stringify({ costCenterIds }),
          toastOnSuccess: false,
        })
      }

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
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Criar nova equipe</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar uma nova equipe.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="team-name">Nome</FieldLabel>
              <Input
                id="team-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nome da equipe"
                required
                disabled={isSubmitting}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="team-description">Descrição</FieldLabel>
              <Input
                id="team-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descrição opcional"
                disabled={isSubmitting}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="team-cost-centers">
                Centros de custo
              </FieldLabel>
              <CostCenterMultiSelect
                selectedIds={costCenterIds}
                onSelectedIdsChange={setCostCenterIds}
                disabled={isSubmitting}
                enabled={open}
              />
              <FieldDescription>
                Opcional. Uma equipe pode ter um ou mais centros de custo.
              </FieldDescription>
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
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Criando...' : 'Criar equipe'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
