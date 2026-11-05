export interface OccupationMember {
  cardNumber: string;
  unit: 'PEDERTRACTOR' | 'TRACTOR';
  name: string;
  role: 'ADMIN' | 'USER';
  userCreatedAt: string;
  firstAppointmentDate: string | null;
  hoursByDate: Record<string, number>;
}

export interface OccupationResponse {
  month: string;
  members: OccupationMember[];
}
