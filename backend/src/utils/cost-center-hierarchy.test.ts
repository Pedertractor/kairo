import assert from 'node:assert/strict';
import { it } from 'node:test';
import {
  assignUnits,
  collectSupervisorLeaderLinks,
  collectSupervisors,
  indexEmployeesByCard,
  normalizeCard,
  resolveUnit,
  toCostCenterSyncItem,
  tractorPrefixedCard,
  type CostCenterHierarchyRow,
  type EmployeeIdentity,
} from './cost-center-hierarchy.js';

const apiRow = (overrides: Record<string, unknown> = {}) => ({
  CCUSTO: '0123',
  DESCRICAO: ' Solda ',
  AGRUPA: 'SOLDA',
  LIDER_DIA_CRACHA: 100,
  LIDER_DIA_NOME: 'Lider Dia',
  LIDER_NOITE_CRACHA: 0,
  LIDER_NOITE_NOME: 'N/C LIDER ASSOCIADO',
  SUPERVISOR_DIA_CRACHA: 900,
  SUPERVISOR_DIA_NOME: 'Supervisor Dia',
  SUPERVISOR_NOITE_CRACHA: 0,
  SUPERVISOR_NOITE_NOME: 'N/C SUPERVISOR ASSOCIADO',
  GERENTE_CRACHA: 5000,
  GERENTE: 'Gerente',
  PRODUTIVO: true,
  STATUS: true,
  ...overrides,
});

const row = (overrides: Partial<CostCenterHierarchyRow>): CostCenterHierarchyRow => ({
  costCenter: '1',
  description: 'CC',
  group: null,
  leaderDayCard: null,
  leaderDayName: null,
  leaderDayUnit: null,
  leaderNightCard: null,
  leaderNightName: null,
  leaderNightUnit: null,
  supervisorDayCard: null,
  supervisorDayName: null,
  supervisorDayUnit: null,
  supervisorNightCard: null,
  supervisorNightName: null,
  supervisorNightUnit: null,
  ...overrides,
});

const P = 'PEDERTRACTOR' as const;
const T = 'TRACTOR' as const;
const sup900 = { unit: P, card: '900' };
const sup901 = { unit: P, card: '901' };

it('normalizes badge numbers, treating 0 and blanks as empty', () => {
  assert.equal(normalizeCard(0), null);
  assert.equal(normalizeCard(1234), '1234');
  assert.equal(normalizeCard(' 01234 '), '1234');
  assert.equal(normalizeCard('0'), null);
  assert.equal(normalizeCard(''), null);
  assert.equal(normalizeCard(null), null);
});

it('maps the base API row without units, dropping placeholder and invalid badges', () => {
  const item = toCostCenterSyncItem(apiRow({ GERENTE_CRACHA: 1036, GERENTE: 'CRACHA INVÁLIDO' }));
  assert.deepEqual(item, {
    costCenter: '123',
    description: 'Solda',
    group: 'SOLDA',
    productive: true,
    leaderDayCard: '100',
    leaderDayName: 'Lider Dia',
    leaderDayUnit: null,
    leaderNightCard: null,
    leaderNightName: null,
    leaderNightUnit: null,
    supervisorDayCard: '900',
    supervisorDayName: 'Supervisor Dia',
    supervisorDayUnit: null,
    supervisorNightCard: null,
    supervisorNightName: null,
    supervisorNightUnit: null,
    managerCard: null,
    managerName: null,
    managerUnit: null,
  });
  assert.equal(toCostCenterSyncItem(apiRow({ STATUS: false })), null);
  assert.equal(toCostCenterSyncItem(apiRow({ CCUSTO: '' })), null);
});

it('resolves the unit of a badge by name, since badges repeat across units', () => {
  const employees: EmployeeIdentity[] = [
    { name: 'VALDIR ALVES PEREIRA', cardNumber: '30', unit: T, active: true },
    { name: 'MARCOS ANTONIO RODRIGUES', cardNumber: '30', unit: P, active: true },
    { name: 'JOÃO MOVIDO', cardNumber: '55', unit: T, active: false },
    { name: 'JOAO MOVIDO', cardNumber: '55', unit: P, active: true },
    { name: 'DUPLO ATIVO', cardNumber: '77', unit: T, active: true },
    { name: 'DUPLO ATIVO', cardNumber: '77', unit: P, active: true },
  ];
  const byCard = indexEmployeesByCard(employees);

  assert.equal(resolveUnit(byCard, '30', 'Marcos Antônio  Rodrigues'), P);
  assert.equal(resolveUnit(byCard, '30', 'VALDIR ALVES PEREIRA'), T);
  assert.equal(resolveUnit(byCard, '30', 'SOMEONE ELSE'), null);
  // Same person registered in both units: the active registration wins.
  assert.equal(resolveUnit(byCard, '55', 'JOAO MOVIDO'), P);
  // Undecidable: active in both units.
  assert.equal(resolveUnit(byCard, '77', 'DUPLO ATIVO'), null);
  assert.equal(resolveUnit(byCard, '200029', 'ANGELO AUGUSTO MAREGA'), null);
});

it('assigns units to every slot and reports badges found in neither unit', () => {
  const item = toCostCenterSyncItem(apiRow())!;
  const { items, unresolved } = assignUnits([item], [
    { name: 'LIDER DIA', cardNumber: '100', unit: T, active: true },
    { name: 'SUPERVISOR DIA', cardNumber: '900', unit: P, active: true },
  ]);

  assert.equal(items[0].leaderDayUnit, T);
  assert.equal(items[0].supervisorDayUnit, P);
  assert.equal(items[0].managerUnit, null);
  assert.deepEqual(unresolved, ['5000 Gerente']);
});

it('links leaders to the supervisor of the same shift and aggregates cost centers', () => {
  const rows = [
    row({ costCenter: '2', leaderDayCard: '100', leaderDayName: 'Ana', leaderDayUnit: P, leaderNightCard: '200', leaderNightName: 'Bia', leaderNightUnit: T, supervisorDayCard: '900', supervisorDayUnit: P, supervisorNightCard: '901', supervisorNightUnit: P }),
    row({ costCenter: '1', leaderDayCard: '100', leaderDayName: 'Ana', leaderDayUnit: P, supervisorDayCard: '900', supervisorDayUnit: P }),
  ];

  assert.deepEqual(collectSupervisorLeaderLinks(rows, sup900), [{
    leaderCard: '100',
    leaderName: 'Ana',
    leaderUnit: P,
    shifts: ['DAY'],
    costCenters: [
      { costCenter: '1', description: 'CC', group: null },
      { costCenter: '2', description: 'CC', group: null },
    ],
  }]);
  assert.deepEqual(
    collectSupervisorLeaderLinks(rows, sup901).map((link) => [link.leaderUnit, link.leaderCard, link.shifts]),
    [[T, '200', ['NIGHT']]],
  );
});

it('does not mix up the same badge in the other unit', () => {
  const rows = [
    row({ leaderDayCard: '21', leaderDayName: 'VALDEMIR', leaderDayUnit: P, supervisorDayCard: '30', supervisorDayName: 'MARCOS ANTONIO RODRIGUES', supervisorDayUnit: P }),
  ];

  assert.deepEqual(collectSupervisorLeaderLinks(rows, { unit: T, card: '30' }), []);
  assert.equal(collectSupervisorLeaderLinks(rows, { unit: P, card: '30' }).length, 1);
  assert.deepEqual(collectSupervisors(rows), [{ unit: P, card: '30' }]);
});

it('never makes a supervisor out of a badge whose unit is unknown', () => {
  const rows = [
    row({ leaderDayCard: '100', leaderDayUnit: P, supervisorDayCard: '200029', supervisorDayName: 'ANGELO', supervisorDayUnit: null }),
  ];

  assert.deepEqual(collectSupervisors(rows), []);
});

it('falls back to the other shift supervisor when one shift has none', () => {
  const rows = [
    row({ leaderDayCard: '100', leaderDayUnit: P, leaderNightCard: '200', leaderNightUnit: P, supervisorDayCard: '900', supervisorDayUnit: P }),
  ];

  assert.deepEqual(
    collectSupervisorLeaderLinks(rows, sup900).map((link) => [link.leaderCard, link.shifts]),
    [['100', ['DAY']], ['200', ['NIGHT']]],
  );
});

it('never lists a supervisor as their own leader, nor makes them a supervisor for it', () => {
  const rows = [
    row({ costCenter: '1', leaderDayCard: '900', leaderDayUnit: P, supervisorDayCard: '900', supervisorDayUnit: P }),
    row({ costCenter: '2', leaderDayCard: '100', leaderDayName: 'Ana', leaderDayUnit: P, supervisorDayCard: '900', supervisorDayUnit: P }),
  ];

  assert.deepEqual(
    collectSupervisorLeaderLinks(rows, sup900).map((link) => link.leaderCard),
    ['100'],
  );
  assert.deepEqual(collectSupervisors([rows[0]]), []);
  assert.deepEqual(collectSupervisors(rows), [sup900]);
});

it('reads 20-prefixed badges as TRACTOR badges without the prefix', () => {
  assert.equal(tractorPrefixedCard('200035'), '35');
  assert.equal(tractorPrefixedCard('202218'), '2218');
  assert.equal(tractorPrefixedCard('2000'), null);
  assert.equal(tractorPrefixedCard('35'), null);
  assert.equal(tractorPrefixedCard('302218'), null);

  const item = toCostCenterSyncItem(apiRow({
    SUPERVISOR_DIA_CRACHA: 200035,
    SUPERVISOR_DIA_NOME: 'Nelson Francisco Coutinho Junior',
    LIDER_DIA_CRACHA: 202218,
    LIDER_DIA_NOME: 'Nome Diferente Da Lista',
  }))!;
  // The other unit has the same short badges for different people; the prefix decides.
  const { items, unresolved } = assignUnits([item], [
    { name: 'OSVALDO FIORENSI', cardNumber: '35', unit: P, active: false },
    { name: 'MARCELO APARECIDO DA SILVA', cardNumber: '2218', unit: P, active: false },
  ]);

  assert.equal(items[0].supervisorDayCard, '35');
  assert.equal(items[0].supervisorDayUnit, T);
  assert.equal(items[0].leaderDayCard, '2218');
  assert.equal(items[0].leaderDayUnit, T);
  assert.deepEqual(unresolved, ['5000 Gerente']);
  assert.deepEqual(collectSupervisors(items), [{ unit: T, card: '35' }]);
});
