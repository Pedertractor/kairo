export interface MemberColorScheme {
  bar: string;
  subtext: string;
  backgroundColor: string;
}

const GOLDEN_ANGLE_DEGREES = 137.508;

export function buildMemberColorMap(
  userIds: string[],
): Map<string, MemberColorScheme> {
  const sortedIds = [...new Set(userIds)].sort();
  const colorMap = new Map<string, MemberColorScheme>();

  for (const [index, userId] of sortedIds.entries()) {
    const hue = (index * GOLDEN_ANGLE_DEGREES) % 360;

    colorMap.set(userId, {
      bar: 'text-white',
      subtext: 'text-white/80',
      backgroundColor: `hsl(${hue.toFixed(3)} 72% 42%)`,
    });
  }

  return colorMap;
}
