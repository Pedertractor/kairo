export interface OccupationMember {
  cardNumber: string;
  unit: 'PEDERTRACTOR' | 'TRACTOR';
  name: string;
  role: 'ADMIN' | 'USER';
  hoursByDate: Record<string, number>;
}

export interface OccupationResponse {
  month: string;
  members: OccupationMember[];
}
