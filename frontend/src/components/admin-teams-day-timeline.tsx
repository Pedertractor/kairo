import { useState } from 'react'

import { FilterField } from '@/components/responsive-filters'
import { TeamDayTimeline } from '@/components/team-day-timeline'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ALL_TEAMS,
  useAdminTeamsDayDashboard,
} from '@/hooks/use-admin-teams-day-dashboard'
import { toDateKey } from '@/lib/date'

const COLOR_BY_MEMBER = 'member'
const COLOR_BY_TAG = 'tag'

const COLOR_MODE_LABELS = {
  [COLOR_BY_MEMBER]: 'Por funcionário',
  [COLOR_BY_TAG]: 'Por etiqueta',
} as const

export function AdminTeamsDayTimeline() {
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()))
  const [teamFilter, setTeamFilter] = useState(ALL_TEAMS)
  const [colorMode, setColorMode] = useState(COLOR_BY_MEMBER)
  const { teams, members, blocks, absences, isLoading } =
    useAdminTeamsDayDashboard(selectedDate, teamFilter)

  return (
    <div className='flex min-w-0 max-w-full flex-col gap-5'>
      <section className='flex flex-col gap-3'>
        <h2 className='text-base font-semibold'>Filtros</h2>
        <Card className='gap-0 rounded-xl border border-border/60 bg-card py-0 shadow-sm'>
          <CardContent className='grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2'>
            <FilterField id='timeline-color-mode' label='Colorir por'>
              <Select
                value={colorMode}
                onValueChange={(value) =>
                  setColorMode(
                    value === COLOR_BY_TAG ? COLOR_BY_TAG : COLOR_BY_MEMBER,
                  )
                }
              >
                <SelectTrigger
                  id='timeline-color-mode'
                  className='w-full'
                  aria-label='Colorir timeline'
                >
                  <SelectValue placeholder={COLOR_MODE_LABELS[COLOR_BY_MEMBER]}>
                    {(value) =>
                      COLOR_MODE_LABELS[
                        value === COLOR_BY_TAG ? COLOR_BY_TAG : COLOR_BY_MEMBER
                      ]
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={COLOR_BY_MEMBER}>
                    {COLOR_MODE_LABELS[COLOR_BY_MEMBER]}
                  </SelectItem>
                  <SelectItem value={COLOR_BY_TAG}>
                    {COLOR_MODE_LABELS[COLOR_BY_TAG]}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField id='timeline-team' label='Equipe'>
              <Select
                value={teamFilter}
                onValueChange={(value) => setTeamFilter(value ?? ALL_TEAMS)}
              >
                <SelectTrigger
                  id='timeline-team'
                  className='w-full'
                  aria-label='Filtrar por equipe'
                >
                  <SelectValue placeholder='Todas as equipes'>
                    {(value) =>
                      value === ALL_TEAMS
                        ? 'Todas as equipes'
                        : (teams.find((team) => team.id === value)?.name ??
                          'Todas as equipes')
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TEAMS}>Todas as equipes</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          </CardContent>
        </Card>
      </section>

      <TeamDayTimeline
        title='Timeline das equipes'
        blocks={blocks}
        absences={absences}
        members={members}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        isLoading={isLoading}
        colorBlocksByTag={colorMode === COLOR_BY_TAG}
      />
    </div>
  )
}
