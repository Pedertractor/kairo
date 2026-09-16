import {
  COMPLEXITY_LEVEL_COLORS,
  COMPLEXITY_LEVEL_LABELS,
  COMPLEXITY_LEVEL_WEIGHTS,
  UNSET_COMPLEXITY_COLOR,
  UNSET_COMPLEXITY_WEIGHT,
  type ComplexityLevel,
} from '@/lib/complexity-level'
import type { MemberFinishedActivityAnalytics } from '@/types/analytics'

function complexityLabel(level: ComplexityLevel | null) {
  return level ? COMPLEXITY_LEVEL_LABELS[level] : 'Sem complexidade'
}

function complexityColor(level: ComplexityLevel | null) {
  return level ? COMPLEXITY_LEVEL_COLORS[level] : UNSET_COMPLEXITY_COLOR
}

function complexityWeight(level: ComplexityLevel | null) {
  return level ? COMPLEXITY_LEVEL_WEIGHTS[level] : UNSET_COMPLEXITY_WEIGHT
}

const LEGEND_LEVELS: Array<ComplexityLevel | null> = [
  'BAIXA',
  'MEDIA',
  'ALTA',
  'MUITO_ALTA',
  null,
]

export function AnalyticsMemberFinishedActivitiesChart({
  members,
}: {
  members: MemberFinishedActivityAnalytics[]
}) {
  const maxScore = Math.max(...members.map((member) => member.weightedScore), 1)

  if (members.length === 0) {
    return (
      <div className='rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground'>
        Nenhuma atividade concluída no período para estes filtros.
      </div>
    )
  }

  return (
    <div className='space-y-5'>
      <ul className='flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground'>
        {LEGEND_LEVELS.map((level) => (
          <li key={level ?? 'none'} className='flex items-center gap-1.5'>
            <span
              className='size-2.5 rounded-full'
              style={{ backgroundColor: complexityColor(level) }}
            />
            {complexityLabel(level)}
            <span className='tabular-nums opacity-70'>
              ×{complexityWeight(level)}
            </span>
          </li>
        ))}
      </ul>

      <div className='space-y-4'>
        {members.map((member) => {
          const widthPercent = Math.max(
            8,
            Math.round((member.weightedScore / maxScore) * 100),
          )

          return (
            <div key={member.employeeId} className='space-y-1.5'>
              <div className='flex items-end justify-between gap-3'>
                <div className='min-w-0'>
                  <p className='truncate text-sm font-semibold'>
                    {member.employeeName}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {member.activityCount}{' '}
                    {member.activityCount === 1 ? 'atividade' : 'atividades'}{' '}
                    ·{' '}
                    {member.byComplexity
                      .map(
                        (item) =>
                          `${item.count} ${complexityLabel(item.complexityLevel).toLowerCase()}`,
                      )
                      .join(' · ')}
                  </p>
                </div>
                <p className='shrink-0 text-sm font-bold tabular-nums'>
                  {member.weightedScore}{' '}
                  <span className='text-xs font-semibold text-muted-foreground'>
                    {member.weightedScore === 1 ? 'ponto' : 'pontos'}
                  </span>
                </p>
              </div>
              <div className='h-3 overflow-hidden rounded-full bg-muted'>
                <div
                  className='flex h-full overflow-hidden rounded-full'
                  style={{ width: `${widthPercent}%` }}
                >
                  {member.byComplexity.map((item) => (
                    <div
                      key={`${member.employeeId}-${item.complexityLevel ?? 'none'}`}
                      className='h-full'
                      style={{
                        width: `${(item.weightedScore / member.weightedScore) * 100}%`,
                        backgroundColor: complexityColor(item.complexityLevel),
                      }}
                      title={`${complexityLabel(item.complexityLevel)}: ${item.count}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
