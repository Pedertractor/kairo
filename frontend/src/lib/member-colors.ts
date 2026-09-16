import { getContrastingTextColor } from '@/lib/tag-colors';

export interface MemberColorScheme {
  bar: string;
  subtext: string;
  backgroundColor: string;
  textColor?: string;
}

const GOLDEN_ANGLE_DEGREES = 137.508;
export const UNTAGGED_BLOCK_COLOR = '#94A3B8';

/** Timeline blocks of tagged activities follow the tag color instead of the member color. */
export function buildTagColorScheme(tagColor: string): MemberColorScheme {
  return {
    bar: '',
    subtext: 'opacity-80',
    backgroundColor: tagColor,
    textColor: getContrastingTextColor(tagColor),
  };
}

export const untaggedBlockColorScheme = buildTagColorScheme(UNTAGGED_BLOCK_COLOR);

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
