import test from 'node:test';
import assert from 'node:assert/strict';
import {
  circuitApparentPower,
  circuitActivePower,
  circuitPointCount,
  mixedCircuitFields,
  mixedCircuitIssues,
  circuitLoadDescription,
} from '../lib/circuit-loads.ts';
import {
  downstreamPhaseDemand,
  balancePanelCircuits,
  circuitRequirements,
  voltageDropCriteria,
  selectPreliminaryBreaker,
  CIRCUIT_BREAKERS,
} from '../lib/electrical.ts';

const loads = () => [
  {
    name: 'Luces baños',
    kind: 'lighting',
    points: 10,
    unitPower: 20,
    unit: 'W',
    powerFactor: 0.8,
  },
  {
    name: 'Secamanos',
    kind: 'socket',
    points: 2,
    unitPower: 500,
    unit: 'W',
    powerFactor: 1,
  },
];
const mixed = (extra = {}) => ({
  id: 1,
  kind: 'MIX',
  phase: 'L2',
  breaker: 15,
  // Stale legacy aggregates must never override the breakdown.
  points: 1,
  unitVA: 1,
  powerFactor: 1,
  mixedLoads: loads(),
  ...extra,
});
test('mixto: suma W y VA por grupo y conserva el FP individual sin reducir Ib', () => {
  assert.equal(circuitApparentPower(mixed()), 1250);
  assert.equal(circuitActivePower(mixed()), 1200);
  assert.equal(circuitPointCount(mixed()), 12);
  const va = mixed({
    mixedLoads: [{ ...loads()[0], unit: 'VA', unitPower: 25 }, loads()[1]],
  });
  assert.equal(circuitApparentPower(va), 1250);
  assert.equal(circuitActivePower(va), 1200);
  const fields = mixedCircuitFields(loads());
  assert.equal(fields.points, 12);
  assert.equal(fields.unitVA * fields.points, 1250);
  assert.equal(fields.powerFactor, 1200 / 1250);
  assert.match(circuitLoadDescription(mixed()), /Secamanos: 2 × 500 W/);
});
test('mixto: límites municipales exactos y avisos independientes de protección y bocas', () => {
  const boundary = mixed({
    mixedLoads: [
      { ...loads()[0], points: 13, unit: 'VA', unitPower: 20 },
      { ...loads()[1], points: 2, unit: 'VA', unitPower: 530 },
    ],
  });
  assert.deepEqual(mixedCircuitIssues(boundary), []);
  assert.ok(
    mixedCircuitIssues({ ...boundary, breaker: 16 }).some((w) =>
      w.includes('protección supera 15 A'),
    ),
  );
  assert.ok(
    mixedCircuitIssues(
      mixed({ mixedLoads: [{ ...loads()[0], points: 14 }, loads()[1]] }),
    ).some((w) => w.includes('15 bocas')),
  );
  assert.ok(
    mixedCircuitIssues(
      mixed({ mixedLoads: [loads()[0], { ...loads()[1], unitPower: 600 }] }),
    ).some((w) => w.includes('supera 6 A')),
  );
  assert.ok(
    mixedCircuitIssues(mixed({ phase: '3Φ' })).some((w) =>
      w.includes('monofásico'),
    ),
  );
  assert.ok(
    mixedCircuitIssues(mixed({ mixedLoads: [loads()[0]] })).some((w) =>
      w.includes('completar'),
    ),
  );
});
test('mixto: cero cargas no produce NaN ni hereda potencias antiguas', () => {
  assert.equal(circuitApparentPower(mixed({ mixedLoads: [] })), 0);
  assert.deepEqual(mixedCircuitFields([]), {
    mixedLoads: [],
    points: 0,
    unitVA: 0,
    powerFactor: 1,
  });
});
test('mixto: alimentador y balance usan el desglose, aun con agregados antiguos', () => {
  const child = {
    id: 'ts1',
    parentId: 'tp',
    type: 'TS',
    supply: 'mono',
    feederPhase: 'L3',
    demandFactor: 0.8,
    circuits: [mixed()],
  };
  assert.deepEqual(downstreamPhaseDemand('tp', [child]), {
    L1: 0,
    L2: 0,
    L3: 1000,
  });
  const tp = {
    id: 'tp',
    type: 'TP',
    supply: 'tri',
    demandFactor: 1,
    circuits: [mixed({ phase: 'L3' })],
  };
  const balanced = balancePanelCircuits(tp, [tp, child]);
  assert.notEqual(balanced[0].phase, 'L3');
  assert.deepEqual(balanced[0].mixedLoads, loads());
});
test('mixto: sección, caída de iluminación y catálogo hasta 15 A', () => {
  assert.equal(circuitRequirements('MIX').minimumSectionMm2, 2.5);
  assert.equal(voltageDropCriteria('TS', 'MIX').totalBasis, 'aea-lighting');
  const ratings = CIRCUIT_BREAKERS.filter((rating) => rating <= 15);
  assert.equal(selectPreliminaryBreaker(5.7, 21, 15, ratings), 15);
  assert.equal(selectPreliminaryBreaker(16, 21, 20, ratings), null);
});
