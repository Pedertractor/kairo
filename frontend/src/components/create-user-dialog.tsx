import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Loader2, UserRound } from 'lucide-react'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-handler'
import type { UnitType, UserRole } from '@/types/auth'
import type { TeamSummary, TeamsListResponse } from '@/types/team'
import type {
  CreateUserInput,
  EmployeeLookupResponse,
  UserResponse,
} from '@/types/user'

const UNITS: UnitType[] = ['PEDERTRACTOR', 'TRACTOR']
const LOOKUP_DEBOUNCE_MS = 500

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  LEADER: 'Líder',
  USER: 'Usuário',
}

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (user: UserResponse['user']) => void
}

export function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateUserDialogProps) {
  const { user: currentUser } = useAuth()
  const isLeader = currentUser?.role === 'LEADER'
  const defaultUnit = currentUser?.unit ?? 'PEDERTRACTOR'
  const [cardNumber, setCardNumber] = useState('')
  const [unit, setUnit] = useState<UnitType>(defaultUnit)
  const [role, setRole] = useState<UserRole>('USER')
  const [teamId, setTeamId] = useState('')
  const [ownedTeams, setOwnedTeams] = useState<TeamSummary[]>([])
  const [isLoadingTeams, setIsLoadingTeams] = useState(false)
  const [employeeName, setEmployeeName] = useState<string | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const availableRoles = useMemo(() => {
    if (currentUser?.role === 'ADMIN') {
      return Object.keys(ROLE_LABELS) as UserRole[]
    }

    return ['USER'] as UserRole[]
  }, [currentUser?.role])

  function resetForm() {
    setCardNumber('')
    setUnit(defaultUnit)
    setRole('USER')
    setTeamId('')
    setEmployeeName(null)
    setLookupError(null)
    setIsLookingUp(false)
  }

  useEffect(() => {
    if (open) {
      setUnit(defaultUnit)
    }
  }, [open, defaultUnit])

  useEffect(() => {
    if (!open || !isLeader) {
      return
    }

    let cancelled = false

    async function loadOwnedTeams() {
      setIsLoadingTeams(true)

      try {
        const data = await api<TeamsListResponse>('/teams')
        if (cancelled) {
          return
        }

        const adminTeams = data.teams.filter((team) => team.role === 'ADMIN')
        setOwnedTeams(adminTeams)
        setTeamId((current) =>
          current && adminTeams.some((team) => team.id === current)
            ? current
            : (adminTeams[0]?.id ?? ''),
        )
      } finally {
        if (!cancelled) {
          setIsLoadingTeams(false)
        }
      }
    }

    void loadOwnedTeams()

    return () => {
      cancelled = true
    }
  }, [open, isLeader])

  useEffect(() => {
    if (!open) {
      return
    }

    const trimmedCardNumber = cardNumber.trim()

    setEmployeeName(null)
    setLookupError(null)
    setIsLookingUp(false)

    if (!trimmedCardNumber) {
      return
    }

    const controller = new AbortController()
    let isCurrentLookup = true

    const timeoutId = window.setTimeout(async () => {
      setIsLookingUp(true)

      try {
        const data = await api<EmployeeLookupResponse>(
          `/users/lookup/${unit}/${encodeURIComponent(trimmedCardNumber)}`,
          {
            signal: controller.signal,
            toastOnError: false,
          },
        )

        if (isCurrentLookup) {
          setEmployeeName(data.employee.name)
        }
      } catch (error) {
        if (
          !isCurrentLookup ||
          (error instanceof Error && error.name === 'AbortError')
        ) {
          return
        }

        setLookupError(
          error instanceof Error
            ? error.message
            : 'Não foi possível buscar o funcionário.',
        )
      } finally {
        if (isCurrentLookup) {
          setIsLookingUp(false)
        }
      }
    }, LOOKUP_DEBOUNCE_MS)

    return () => {
      isCurrentLookup = false
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [cardNumber, unit, open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!employeeName || isLookingUp) {
      return
    }

    if (isLeader && !teamId) {
      return
    }

    setIsSubmitting(true)

    try {
      const payload: CreateUserInput = {
        cardNumber: cardNumber.trim(),
        unit,
        role,
        ...(isLeader ? { teamId } : {}),
      }

      const data = await api<UserResponse>('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      resetForm()
      onOpenChange(false)
      onCreated(data.user)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canCreate =
    Boolean(employeeName) &&
    !isLookingUp &&
    (!isLeader || Boolean(teamId))

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
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Criar usuário</DialogTitle>
            <DialogDescription>
              Informe o cartão e a unidade para buscar o funcionário
              automaticamente na API externa e criar o acesso na aplicação.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="user-card-number">Número do cartão</FieldLabel>
              <Input
                id="user-card-number"
                value={cardNumber}
                onChange={(event) => setCardNumber(event.target.value)}
                placeholder="1010"
                required
                disabled={isSubmitting}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="user-role">Função</FieldLabel>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="user-role" className="w-full">
                  <SelectValue>
                    {(selectedValue) => ROLE_LABELS[selectedValue as UserRole]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((option) => (
                    <SelectItem key={option} value={option}>
                      {ROLE_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Unidade</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {UNITS.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant={unit === option ? 'default' : 'outline'}
                    onClick={() => setUnit(option)}
                    disabled={isSubmitting}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </Field>

            {isLeader ? (
              <Field>
                <FieldLabel htmlFor="user-team">Equipe</FieldLabel>
                {isLoadingTeams ? (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Carregando equipes...
                  </div>
                ) : ownedTeams.length === 0 ? (
                  <p className="text-sm text-destructive">
                    Você precisa ser administrador de uma equipe para criar
                    usuários.
                  </p>
                ) : (
                  <Select
                    value={teamId}
                    onValueChange={(value) => setTeamId(value ?? '')}
                  >
                    <SelectTrigger id="user-team" className="w-full">
                      <SelectValue placeholder="Selecione a equipe">
                        {(value) =>
                          ownedTeams.find((team) => team.id === value)?.name ??
                          'Selecione a equipe'
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ownedTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
            ) : null}

            {isLookingUp ? (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Buscando funcionário...
              </div>
            ) : null}

            {cardNumber.trim() && !employeeName && !lookupError && !isLookingUp ? (
              <p className="text-sm text-muted-foreground">
                A busca será feita automaticamente.
              </p>
            ) : null}

            {employeeName ? (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserRound className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    Funcionário encontrado
                  </p>
                  <p className="truncate font-medium">{employeeName}</p>
                </div>
              </div>
            ) : null}

            {lookupError ? (
              <p className="text-sm text-destructive">{lookupError}</p>
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
              disabled={
                isSubmitting || isLookingUp || !cardNumber.trim() || !canCreate
              }
            >
              {isSubmitting ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
