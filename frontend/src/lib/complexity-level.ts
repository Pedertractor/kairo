export type ComplexityLevel = 'BAIXA' | 'MEDIA' | 'ALTA' | 'MUITO_ALTA'

export const COMPLEXITY_LEVELS: ComplexityLevel[] = [
  'BAIXA',
  'MEDIA',
  'ALTA',
  'MUITO_ALTA',
]

export const COMPLEXITY_LEVEL_LABELS: Record<ComplexityLevel, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  MUITO_ALTA: 'Muito alta',
}

export const COMPLEXITY_LEVEL_WEIGHTS: Record<ComplexityLevel, number> = {
  BAIXA: 1,
  MEDIA: 2,
  ALTA: 3,
  MUITO_ALTA: 4,
}

export const COMPLEXITY_LEVEL_COLORS: Record<ComplexityLevel, string> = {
  BAIXA: '#34d399',
  MEDIA: '#fbbf24',
  ALTA: '#fb923c',
  MUITO_ALTA: '#f43f5e',
}

export const UNSET_COMPLEXITY_WEIGHT = 1
export const UNSET_COMPLEXITY_COLOR = '#94a3b8'

export const NO_COMPLEXITY = '__none__'

export function isComplexityLevel(value: string): value is ComplexityLevel {
  return COMPLEXITY_LEVELS.includes(value as ComplexityLevel)
}
