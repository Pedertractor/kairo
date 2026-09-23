export interface OccupationMember {
  cardNumber: string;
  unit: 'PEDERTRACTOR' | 'TRACTOR';
  name: string;
  role: 'ADMIN' | 'USER';
  loggedSeconds: number;
  availabilitySeconds: number;
  occupationPercent: number;
}

export interface OccupationResponse {
  month: string;
  members: OccupationMember[];
}
