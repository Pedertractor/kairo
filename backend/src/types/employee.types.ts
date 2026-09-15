import type { UnitType } from '../generated/client.js';

export interface ExternalEmployee {
  id: number;
  name: string;
  cardNumber: string;
  unit: string;
  /** Punch times arrive as timestamps anchored on 1970-01-01. */
  firstEntry?: string | null;
  secondEntry?: string | null;
  firstExit?: string | null;
  secondExit?: string | null;
  active?: boolean;
  status?: boolean;
}

export interface EmployeeShift {
  startMinutes: number;
  endMinutes: number;
}

export interface EmployeeLookupResult {
  name: string;
  cardNumber: string;
  unit: UnitType;
  shift: EmployeeShift | null;
}

export interface EmployeeShiftInfo extends EmployeeShift {
  cardNumber: string;
  unit: UnitType;
}
