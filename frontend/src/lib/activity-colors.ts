export interface ActivityColorScheme {
  bar: string
  subtext: string
}

/** Distinct blue tones so adjacent activities stay readable on the day timeline. */
const ACTIVITY_BLUE_PALETTE: ActivityColorScheme[] = [
  {
    bar: 'bg-blue-800 text-white',
    subtext: 'text-white/80',
  },
  {
    bar: 'bg-sky-600 text-white',
    subtext: 'text-white/80',
  },
  {
    bar: 'bg-indigo-600 text-white',
    subtext: 'text-white/80',
  },
  {
    bar: 'bg-cyan-700 text-white',
    subtext: 'text-white/80',
  },
  {
    bar: 'bg-blue-500 text-white',
    subtext: 'text-white/80',
  },
  {
    bar: 'bg-indigo-800 text-white',
    subtext: 'text-white/80',
  },
  {
    bar: 'bg-sky-800 text-white',
    subtext: 'text-white/80',
  },
  {
    bar: 'bg-blue-700 text-white',
    subtext: 'text-white/80',
  },
]

const ACTIVITY_BLUE_FUTURE_PALETTE: ActivityColorScheme[] = [
  {
    bar: 'bg-blue-200 text-blue-900',
    subtext: 'text-blue-900/70',
  },
  {
    bar: 'bg-sky-200 text-sky-900',
    subtext: 'text-sky-900/70',
  },
  {
    bar: 'bg-indigo-200 text-indigo-900',
    subtext: 'text-indigo-900/70',
  },
  {
    bar: 'bg-cyan-200 text-cyan-900',
    subtext: 'text-cyan-900/70',
  },
  {
    bar: 'bg-blue-100 text-blue-800',
    subtext: 'text-blue-800/70',
  },
  {
    bar: 'bg-indigo-100 text-indigo-900',
    subtext: 'text-indigo-900/70',
  },
  {
    bar: 'bg-sky-100 text-sky-900',
    subtext: 'text-sky-900/70',
  },
  {
    bar: 'bg-blue-300 text-blue-950',
    subtext: 'text-blue-950/70',
  },
]

export function buildActivityColorMap(
  titles: string[],
): Map<string, { solid: ActivityColorScheme; future: ActivityColorScheme }> {
  const uniqueInOrder: string[] = []
  const seen = new Set<string>()

  for (const title of titles) {
    if (seen.has(title)) {
      continue
    }

    seen.add(title)
    uniqueInOrder.push(title)
  }

  const colorMap = new Map<
    string,
    { solid: ActivityColorScheme; future: ActivityColorScheme }
  >()

  for (const [index, title] of uniqueInOrder.entries()) {
    const paletteIndex = index % ACTIVITY_BLUE_PALETTE.length

    colorMap.set(title, {
      solid: ACTIVITY_BLUE_PALETTE[paletteIndex],
      future: ACTIVITY_BLUE_FUTURE_PALETTE[paletteIndex],
    })
  }

  return colorMap
}
