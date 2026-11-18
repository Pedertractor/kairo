import { ChevronRight, Moon, Sun, UserX } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { UnitType } from '@/types/auth'
import type { SupervisorLeaderSummary, TeamShift } from '@/types/team'

const UNIT_LABELS: Record<UnitType, string> = {
  PEDERTRACTOR: 'Pedertractor',
  TRACTOR: 'Tractor',
}

const SHIFT_LABELS: Record<TeamShift, string> = {
  DAY: 'Dia',
  NIGHT: 'Noite',
}

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

/** Distinct AGRUPA groups, falling back to cost center codes when ungrouped. */
function describeCostCenters(leader: SupervisorLeaderSummary) {
  const labels = new Set(
    leader.costCenters.map((item) => item.group ?? item.costCenter),
  )
  return [...labels]
}

export function supervisorLeaderPath(leaderId: string) {
  return `/equipes/lider/${leaderId}`
}

export function SupervisorLeaderCard({
  leader,
}: {
  leader: SupervisorLeaderSummary
}) {
  const groups = describeCostCenters(leader)
  const canOpen = leader.userId !== null && leader.teamCount > 0

  let status: ReactNode
  if (!leader.registered) {
    status = (
      <span className='inline-flex items-center gap-1 text-muted-foreground'>
        <UserX className='size-3.5' />
        {leader.unit ? 'Sem cadastro no Kairo' : 'Crachá não encontrado nas unidades'}
      </span>
    )
  } else if (leader.teamCount === 0) {
    status = (
      <span className='text-muted-foreground'>Nenhuma equipe criada</span>
    )
  } else {
    status = (
      <span>
        {pluralize(leader.teamCount, 'equipe', 'equipes')} ·{' '}
        {pluralize(leader.memberCount, 'pessoa', 'pessoas')}
      </span>
    )
  }

  const card = (
    <Card
      className={cn(
        'h-full transition-colors',
        canOpen ? 'hover:bg-muted/50' : 'opacity-70',
      )}
    >
      <CardHeader>
        <div className='flex items-start justify-between gap-2'>
          <CardTitle className='leading-snug'>{leader.name}</CardTitle>
          {canOpen ? (
            <ChevronRight className='size-4 shrink-0 text-muted-foreground' />
          ) : null}
        </div>
        <CardDescription className='flex flex-wrap items-center gap-1.5'>
          {leader.shifts.map((shift) => (
            <span
              key={shift}
              className='inline-flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground'
            >
              {shift === 'DAY' ? (
                <Sun className='size-3' />
              ) : (
                <Moon className='size-3' />
              )}
              {SHIFT_LABELS[shift]}
            </span>
          ))}
          <span className='text-xs'>
            {leader.unit ? `${UNIT_LABELS[leader.unit]} · ` : ''}Crachá{' '}
            {leader.cardNumber}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-2 text-sm'>
        {status}
        {groups.length > 0 ? (
          <ul className='flex flex-wrap gap-1'>
            {groups.slice(0, 4).map((group) => (
              <li
                key={group}
                className='rounded-sm border px-1.5 py-0.5 text-xs text-muted-foreground'
              >
                {group}
              </li>
            ))}
            {groups.length > 4 ? (
              <li className='px-1 py-0.5 text-xs text-muted-foreground'>
                +{groups.length - 4}
              </li>
            ) : null}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  )

  if (!canOpen || !leader.userId) {
    return card
  }

  return (
    <Link
      to={supervisorLeaderPath(leader.userId)}
      className='block'
      aria-label={`Ver equipes de ${leader.name}`}
    >
      {card}
    </Link>
  )
}
