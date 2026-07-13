import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

const GREETING_BY_PERIOD: Record<
  GreetingPeriod,
  { text: string; emoji: string }
> = {
  morning: { text: 'Bom dia', emoji: '☀️' },
  afternoon: { text: 'Boa tarde', emoji: '🌤️' },
  evening: { text: 'Boa noite', emoji: '🌙' },
};

function getGreetingPeriod(date = dayjs()): GreetingPeriod {
  const hour = date.hour();

  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

export function getGreeting(date = new Date()): string {
  const { text, emoji } = GREETING_BY_PERIOD[getGreetingPeriod(dayjs(date))];
  return `${text} ${emoji}`;
}

export function getFirstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? '';
  if (!first) return '';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export function formatRelativeDate(date: string | Date): string {
  return dayjs(date).fromNow();
}

export function formatLongDate(date = new Date()): string {
  return dayjs(date).format('dddd, D [de] MMMM');
}
