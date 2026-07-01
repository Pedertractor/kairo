import greetingTime from 'greeting-time';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

const GREETING_PT: Record<string, string> = {
  'Good Morning': 'Bom dia',
  'Good Afternoon': 'Boa tarde',
  'Good Evening': 'Boa noite',
  'Good Night': 'Boa noite',
};

export function getGreeting(date = new Date()): string {
  const english = greetingTime(date);
  return GREETING_PT[english] ?? 'good morning';
}

export function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export function formatRelativeDate(date: string | Date): string {
  return dayjs(date).fromNow();
}

export function formatLongDate(date = new Date()): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}
