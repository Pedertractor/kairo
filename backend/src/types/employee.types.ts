import type { UnitType } from '../generated/client.js';

export interface ExternalEmployee {
  id: number;
  name: string;
  cardNumber: string;
  unit: string;
}

export interface EmployeeLookupResult {
  name: string;
  cardNumber: string;
  unit: UnitType;
}
