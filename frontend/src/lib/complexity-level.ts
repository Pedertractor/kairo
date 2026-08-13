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

export const NO_COMPLEXITY = '__none__'

export function isComplexityLevel(value: string): value is ComplexityLevel {
  return COMPLEXITY_LEVELS.includes(value as ComplexityLevel)
}
