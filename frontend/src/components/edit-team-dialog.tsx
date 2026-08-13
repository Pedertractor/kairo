import { useEffect, useState, type FormEvent } from 'react'

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
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api-handler'
import type {
  TeamResponse,
  TeamSummary,
  UpdateTeamInput,
} from '@/types/team'

interface EditTeamDialogProps {
  team: TeamSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (team: TeamSummary) => void
}

function costCenterIdsOf(team: TeamSummary | null) {
  return (team?.costCenters ?? []).map((item) => item.id)
}

function sameIds(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false
  }

  const set = new Set(left)
  return right.every((id) => set.has(id))
}

export function EditTeamDialog({
  team,
  open,
  onOpenChange,
  onUpdated,
}: EditTeamDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [costCenterIds, setCostCenterIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && team) {
      setName(team.name)
      setDescription(team.description ?? '')
      setCostCenterIds(costCenterIdsOf(team))
    }
  }, [open, team])

  function buildPayload(current: TeamSummary): UpdateTeamInput {
    const payload: UpdateTeamInput = {}

    const nextName = name.trim()
    if (nextName && nextName !== current.name) {
      payload.name = nextName
    }

    const nextDescription = description.trim() || null
    if (nextDescription !== (current.description ?? null)) {
      payload.description = nextDescription
    }

    return payload
  }

  const costCentersChanged =
    team !== null && !sameIds(costCenterIds, costCenterIdsOf(team))

  const hasChanges =
    team !== null &&
    name.trim() !== '' &&
    (Object.keys(buildPayload(team)).length > 0 || costCentersChanged)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!team || !hasChanges) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)

    try {
      const payload = buildPayload(team)
      let updated = team

      if (Object.keys(payload).length > 0) {
        const data = await api<TeamResponse>(`/teams/${team.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        updated = data.team
      }

      if (costCentersChanged) {
        const data = await api<TeamResponse>(
          `/teams/${team.id}/cost-centers`,
          {
            method: 'PUT',
            body: JSON.stringify({ costCenterIds }),
            toastOnSuccess: Object.keys(payload).length > 0 ? false : true,
          },
        )
        updated = data.team
      }

      onOpenChange(false)
      onUpdated(updated)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar equipe</DialogTitle>
            <DialogDescription>
              Altere o nome, a descrição e os centros de custo da equipe.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="edit-team-name">Nome</FieldLabel>
              <Input
                id="edit-team-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nome da equipe"
                required
                disabled={isSubmitting}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-team-description">
                Descrição
              </FieldLabel>
              <Textarea
                id="edit-team-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descrição opcional"
                rows={3}
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
                extraCostCenters={team?.costCenters ?? []}
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
            <Button type="submit" disabled={isSubmitting || !hasChanges}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
