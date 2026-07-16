const DURATION_PATTERN = /^(\d+)([smhd])$/i;

const UNIT_TO_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Converte durações no formato do JWT (ex.: `15m`, `30d`) em milissegundos. */
export function parseDurationToMs(duration: string): number {
  const match = DURATION_PATTERN.exec(duration.trim());

  if (!match) {
    throw new Error(
      `Duração inválida: "${duration}". Use o formato <número><s|m|h|d>, ex.: 15m, 7d.`,
    );
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();

  return value * UNIT_TO_MS[unit];
}

export function addDuration(from: Date, duration: string): Date {
  return new Date(from.getTime() + parseDurationToMs(duration));
}
