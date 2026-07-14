export interface MemberColorScheme {
  bar: string;
  subtext: string;
  legend: string;
}

const MEMBER_COLOR_PALETTE: MemberColorScheme[] = [
  {
    bar: 'bg-blue-600 text-white',
    subtext: 'text-white/80',
    legend: 'bg-blue-600',
  },
  {
    bar: 'bg-emerald-600 text-white',
    subtext: 'text-white/80',
    legend: 'bg-emerald-600',
  },
  {
    bar: 'bg-violet-600 text-white',
    subtext: 'text-white/80',
    legend: 'bg-violet-600',
  },
  {
    bar: 'bg-rose-600 text-white',
    subtext: 'text-white/80',
    legend: 'bg-rose-600',
  },
  {
    bar: 'bg-amber-600 text-white',
    subtext: 'text-white/80',
    legend: 'bg-amber-600',
  },
  {
    bar: 'bg-cyan-600 text-white',
    subtext: 'text-white/80',
    legend: 'bg-cyan-600',
  },
  {
    bar: 'bg-fuchsia-600 text-white',
    subtext: 'text-white/80',
    legend: 'bg-fuchsia-600',
  },
  {
    bar: 'bg-lime-600 text-white',
    subtext: 'text-white/80',
    legend: 'bg-lime-600',
  },
  {
    bar: 'bg-orange-600 text-white',
    subtext: 'text-white/80',
    legend: 'bg-orange-600',
  },
  {
    bar: 'bg-indigo-600 text-white',
    subtext: 'text-white/80',
    legend: 'bg-indigo-600',
  },
];

export function buildMemberColorMap(
  userIds: string[],
): Map<string, MemberColorScheme> {
  const sortedIds = [...userIds].sort();
  const colorMap = new Map<string, MemberColorScheme>();

  for (const [index, userId] of sortedIds.entries()) {
    colorMap.set(
      userId,
      MEMBER_COLOR_PALETTE[index % MEMBER_COLOR_PALETTE.length],
    );
  }

  return colorMap;
}
