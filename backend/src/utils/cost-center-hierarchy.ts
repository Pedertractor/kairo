export type CostCenterShift = 'DAY' | 'NIGHT';
export type HierarchyUnit = 'PEDERTRACTOR' | 'TRACTOR';

const ROLE_SLOTS = [
  'leaderDay',
  'leaderNight',
  'supervisorDay',
  'supervisorNight',
  'manager',
] as const;

type RoleSlot = (typeof ROLE_SLOTS)[number];

export interface CostCenterSyncItem {
  costCenter: string;
  description: string;
  group: string | null;
  productive: boolean | null;
  leaderDayCard: string | null;
  leaderDayName: string | null;
  leaderDayUnit: HierarchyUnit | null;
  leaderNightCard: string | null;
  leaderNightName: string | null;
  leaderNightUnit: HierarchyUnit | null;
  supervisorDayCard: string | null;
  supervisorDayName: string | null;
  supervisorDayUnit: HierarchyUnit | null;
  supervisorNightCard: string | null;
  supervisorNightName: string | null;
  supervisorNightUnit: HierarchyUnit | null;
  managerCard: string | null;
  managerName: string | null;
  managerUnit: HierarchyUnit | null;
}

export type CostCenterHierarchyRow = Pick<
  CostCenterSyncItem,
  | 'costCenter'
  | 'description'
  | 'group'
  | 'leaderDayCard'
  | 'leaderDayName'
  | 'leaderDayUnit'
  | 'leaderNightCard'
  | 'leaderNightName'
  | 'leaderNightUnit'
  | 'supervisorDayCard'
  | 'supervisorDayName'
  | 'supervisorDayUnit'
  | 'supervisorNightCard'
  | 'supervisorNightName'
  | 'supervisorNightUnit'
>;

/**
 * A person in the hierarchy. Badges repeat across PEDERTRACTOR and TRACTOR for
 * different people, so a person is always unit + badge, exactly like a Kairo user.
 */
export interface HierarchyPerson {
  unit: HierarchyUnit;
  card: string;
}

export interface SupervisorLeaderLink {
  leaderCard: string;
  leaderName: string | null;
  /** Null when the badge + name was not found in either unit's employee list. */
  leaderUnit: HierarchyUnit | null;
  shifts: CostCenterShift[];
  costCenters: Array<{
    costCenter: string;
    description: string;
    group: string | null;
  }>;
}

/** Employee from the base API list, used to find out which unit a badge belongs to. */
export interface EmployeeIdentity {
  name: string;
  cardNumber: string;
  unit: HierarchyUnit;
  active: boolean;
}

/** Badge numbers come as numbers (0 = empty) or strings; normalize to a trimmed string or null. */
export function normalizeCard(value: unknown): string | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? String(Math.trunc(value)) : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim().replace(/^0+/, '');
    return trimmed && trimmed !== '0' ? trimmed : null;
  }

  return null;
}

/** Uppercase, accent- and whitespace-insensitive name. */
export function normalizePersonName(name: string | null | undefined): string {
  return (name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Placeholder names the base API uses for empty or broken badge slots. */
function isPlaceholderName(name: string): boolean {
  const normalized = normalizePersonName(name);
  return normalized.startsWith('N/C ') || normalized === 'CRACHA INVALIDO';
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Maps a base API row. Units are filled later by `assignUnits` (they need the employee list). */
export function toCostCenterSyncItem(item: unknown): CostCenterSyncItem | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const record = item as Record<string, unknown>;

  if (record.STATUS !== true) {
    return null;
  }

  const rawCode = record.CCUSTO;
  let costCenter =
    typeof rawCode === 'string'
      ? rawCode.trim()
      : typeof rawCode === 'number'
        ? String(rawCode)
        : '';

  if (costCenter.startsWith('0')) {
    costCenter = costCenter.slice(1);
  }

  if (!costCenter) {
    return null;
  }

  const person = (cardKey: string, nameKey: string) => {
    const name = normalizeText(record[nameKey]);
    const card = name && isPlaceholderName(name) ? null : normalizeCard(record[cardKey]);
    return { card, name: card ? name : null, unit: null };
  };

  const leaderDay = person('LIDER_DIA_CRACHA', 'LIDER_DIA_NOME');
  const leaderNight = person('LIDER_NOITE_CRACHA', 'LIDER_NOITE_NOME');
  const supervisorDay = person('SUPERVISOR_DIA_CRACHA', 'SUPERVISOR_DIA_NOME');
  const supervisorNight = person('SUPERVISOR_NOITE_CRACHA', 'SUPERVISOR_NOITE_NOME');
  const manager = person('GERENTE_CRACHA', 'GERENTE');

  return {
    costCenter,
    description: normalizeText(record.DESCRICAO) ?? '',
    group: normalizeText(record.AGRUPA),
    productive: typeof record.PRODUTIVO === 'boolean' ? record.PRODUTIVO : null,
    leaderDayCard: leaderDay.card,
    leaderDayName: leaderDay.name,
    leaderDayUnit: leaderDay.unit,
    leaderNightCard: leaderNight.card,
    leaderNightName: leaderNight.name,
    leaderNightUnit: leaderNight.unit,
    supervisorDayCard: supervisorDay.card,
    supervisorDayName: supervisorDay.name,
    supervisorDayUnit: supervisorDay.unit,
    supervisorNightCard: supervisorNight.card,
    supervisorNightName: supervisorNight.name,
    supervisorNightUnit: supervisorNight.unit,
    managerCard: manager.card,
    managerName: manager.name,
    managerUnit: manager.unit,
  };
}

/**
 * Finds the unit of a badge + name in the employee list. The same badge exists in
 * both units for different people, so the name decides; if the same person shows
 * up in both units, the active registration wins. Returns null when undecidable.
 */
export function resolveUnit(
  employeesByCard: Map<string, EmployeeIdentity[]>,
  card: string,
  name: string | null,
): HierarchyUnit | null {
  const normalized = normalizePersonName(name);

  if (!normalized) {
    return null;
  }

  let matches = (employeesByCard.get(card) ?? []).filter(
    (employee) => normalizePersonName(employee.name) === normalized,
  );

  if (new Set(matches.map(({ unit }) => unit)).size > 1) {
    matches = matches.filter(({ active }) => active);
  }

  const units = new Set(matches.map(({ unit }) => unit));
  return units.size === 1 ? [...units][0] : null;
}

export function indexEmployeesByCard(employees: EmployeeIdentity[]) {
  const byCard = new Map<string, EmployeeIdentity[]>();

  for (const employee of employees) {
    const card = normalizeCard(employee.cardNumber);

    if (card) {
      byCard.set(card, [...(byCard.get(card) ?? []), employee]);
    }
  }

  return byCard;
}

/**
 * The base API writes TRACTOR badges as 20 + the badge padded to 4 digits
 * (200035 = TRACTOR-35, 202218 = TRACTOR-2218). Returns the real badge, or null.
 */
export function tractorPrefixedCard(card: string): string | null {
  const match = /^20(\d{4})$/.exec(card);
  return match ? normalizeCard(match[1]) : null;
}

/** Fills every `*Unit` field of the synced rows from the employee list. */
export function assignUnits(
  items: CostCenterSyncItem[],
  employees: EmployeeIdentity[],
): { items: CostCenterSyncItem[]; unresolved: string[] } {
  const byCard = indexEmployeesByCard(employees);
  const unresolved = new Set<string>();

  const resolved = items.map((item) => {
    const next = { ...item };

    for (const slot of ROLE_SLOTS) {
      const card = item[`${slot}Card` as `${RoleSlot}Card`];
      const name = item[`${slot}Name` as `${RoleSlot}Name`];

      if (!card) {
        continue;
      }

      const tractorCard = tractorPrefixedCard(card);

      if (tractorCard) {
        next[`${slot}Card` as `${RoleSlot}Card`] = tractorCard;
        next[`${slot}Unit` as `${RoleSlot}Unit`] = 'TRACTOR';
        continue;
      }

      const unit = resolveUnit(byCard, card, name);
      next[`${slot}Unit` as `${RoleSlot}Unit`] = unit;

      if (!unit) {
        unresolved.add(`${card} ${name ?? ''}`.trim());
      }
    }

    return next;
  });

  return { items: resolved, unresolved: [...unresolved].sort() };
}

function samePerson(
  card: string | null,
  unit: HierarchyUnit | null,
  person: HierarchyPerson,
): boolean {
  return card === person.card && unit === person.unit;
}

/**
 * Supervisor of each shift; when one shift has no supervisor, the other shift's
 * supervisor covers it (many cost centers only fill the day supervisor).
 */
function effectiveSupervisors(row: CostCenterHierarchyRow) {
  const day = row.supervisorDayCard
    ? { card: row.supervisorDayCard, unit: row.supervisorDayUnit }
    : null;
  const night = row.supervisorNightCard
    ? { card: row.supervisorNightCard, unit: row.supervisorNightUnit }
    : null;

  return { DAY: day ?? night, NIGHT: night ?? day } as const;
}

function leadersOf(row: CostCenterHierarchyRow) {
  return [
    ['DAY', row.leaderDayCard, row.leaderDayName, row.leaderDayUnit],
    ['NIGHT', row.leaderNightCard, row.leaderNightName, row.leaderNightUnit],
  ] as const;
}

/** Leaders that report to `supervisor`, aggregated across cost centers. Never includes the supervisor. */
export function collectSupervisorLeaderLinks(
  rows: CostCenterHierarchyRow[],
  supervisor: HierarchyPerson,
): SupervisorLeaderLink[] {
  const links = new Map<string, SupervisorLeaderLink>();

  for (const row of rows) {
    const supervisors = effectiveSupervisors(row);

    for (const [shift, leaderCard, leaderName, leaderUnit] of leadersOf(row)) {
      const shiftSupervisor = supervisors[shift];

      if (
        !leaderCard ||
        !shiftSupervisor ||
        !samePerson(shiftSupervisor.card, shiftSupervisor.unit, supervisor) ||
        samePerson(leaderCard, leaderUnit, supervisor)
      ) {
        continue;
      }

      const key = `${leaderUnit ?? '?'}:${leaderCard}:${normalizePersonName(leaderName)}`;
      let link = links.get(key);

      if (!link) {
        link = { leaderCard, leaderName, leaderUnit, shifts: [], costCenters: [] };
        links.set(key, link);
      }

      if (!link.shifts.includes(shift)) {
        link.shifts.push(shift);
      }

      if (!link.costCenters.some((cc) => cc.costCenter === row.costCenter)) {
        link.costCenters.push({
          costCenter: row.costCenter,
          description: row.description,
          group: row.group,
        });
      }
    }
  }

  return [...links.values()]
    .map((link) => ({
      ...link,
      shifts: link.shifts.sort(),
      costCenters: link.costCenters.sort((a, b) =>
        a.costCenter.localeCompare(b.costCenter),
      ),
    }))
    .sort((a, b) =>
      (a.leaderName ?? a.leaderCard).localeCompare(b.leaderName ?? b.leaderCard),
    );
}

/**
 * Everyone (with a resolved unit) who supervises at least one other leader;
 * used to grant the SUPERVISOR role.
 */
export function collectSupervisors(items: CostCenterHierarchyRow[]): HierarchyPerson[] {
  const people = new Map<string, HierarchyPerson>();

  for (const row of items) {
    const supervisors = effectiveSupervisors(row);

    for (const [shift, leaderCard, , leaderUnit] of leadersOf(row)) {
      const supervisor = supervisors[shift];

      if (!supervisor?.unit || !leaderCard) {
        continue;
      }

      const person = { unit: supervisor.unit, card: supervisor.card };

      if (!samePerson(leaderCard, leaderUnit, person)) {
        people.set(`${person.unit}:${person.card}`, person);
      }
    }
  }

  return [...people.values()].sort(
    (a, b) => a.unit.localeCompare(b.unit) || a.card.localeCompare(b.card),
  );
}
