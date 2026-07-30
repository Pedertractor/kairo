export const TAG_COLOR_SWATCHES = [
  '#2563EB',
  '#0891B2',
  '#059669',
  '#65A30D',
  '#CA8A04',
  '#EA580C',
  '#DC2626',
  '#DB2777',
  '#7C3AED',
  '#475569',
] as const

export type TagColorSwatch = (typeof TAG_COLOR_SWATCHES)[number]

export function getContrastingTextColor(hexColor: string): '#000000' | '#FFFFFF' {
  const normalized = hexColor.replace('#', '')
  if (normalized.length !== 6) {
    return '#FFFFFF'
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)

  if ([r, g, b].some((channel) => Number.isNaN(channel))) {
    return '#FFFFFF'
  }

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#000000' : '#FFFFFF'
}
