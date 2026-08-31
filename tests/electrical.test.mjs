import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accumulatedVoltageDrop,
  balancePanelCircuits,
  conductorAmpacity,
  resistanceAtTemperature,
  activePower,
  downstreamPhaseDemand,
  feederVoltageDrop,
  PRELIMINARY_CONDUCTOR_CAPACITY,
  selectPreliminaryBreaker,
  STANDARD_BREAKERS,
} from '../lib/electrical.ts';

const circuit = (id, va, phase = 'L1') => ({
  id,
  points: 1,
  unitVA: va,
  phase,
  breaker: 16,
  conductor: 1.5,
});
const tp = (circuits = [], extra = {}) => ({
  id: 'tp',
  type: 'TP',
  supply: 'tri',
  demandFactor: 1,
  circuits,
  ...extra,
});
const ts = (circuits = [], extra = {}) => ({
  id: 'ts',
  type: 'TS',
  parentId: 'tp',
  supply: 'mono',
  demandFactor: 1,
  feederPhase: 'L1',
  circuits,
  ...extra,
});
const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test('001: referencia trazable 2/3 cargados, ambiente y agrupamiento', () => {
  assert.equal(conductorAmpacity(1.5, false), 15);
  assert.equal(conductorAmpacity(1.5, true), 14);
  assert.equal(conductorAmpacity(6, false), 36);
  assert.equal(conductorAmpacity(6, true), 32);
  close(
    conductorAmpacity(1.5, true, { ambientC: 30, groupedCircuits: 2 }),
    14 * 1.15 * 0.8,
  );
  close(
    conductorAmpacity(2.5, false, { ambientC: 20, groupedCircuits: 3 }),
    21 * 1.29 * 0.7,
  );
  assert.equal(conductorAmpacity(999, false), null);
  assert.equal(conductorAmpacity(1.5, false, { ambientC: 45 }), null);
  assert.equal(conductorAmpacity(1.5, false, { groupedCircuits: 9 }), null);
  assert.equal(
    selectPreliminaryBreaker(8, conductorAmpacity(1.5, false), 16),
    10,
  );
});

test('001: Iz manual exige valor y fuente; no vuelve silenciosamente a tabla', () => {
  for (const declaredA of [0, -1, NaN, Infinity, undefined]) {
    assert.equal(
      conductorAmpacity(1.5, false, {
        mode: 'declared',
        declaredA,
        basis: 'ficha',
      }),
      null,
    );
  }
  assert.equal(
    conductorAmpacity(1.5, false, {
      mode: 'declared',
      declaredA: 20,
      basis: '  ',
    }),
    null,
  );
  assert.equal(
    conductorAmpacity(1.5, false, {
      mode: 'declared',
      declaredA: 20,
      basis: 'Cable X, método Y, sección verificada',
    }),
    20,
  );
});

test('006/008: resistencia a 70°C, frío y sustitución numérica usan la misma temperatura', () => {
  close(resistanceAtTemperature(1.5, 20), 0.0133);
  close(resistanceAtTemperature(1.5, 70), 0.0133 * 1.1965);
  close(resistanceAtTemperature(1.5, 90), 0.0133 * 1.2751);
  const cold = feederVoltageDrop(10, 20, 1.5, 'mono', true, 20);
  const hot = feederVoltageDrop(10, 20, 1.5, 'mono');
  close(hot.volts / cold.volts, 1.1965);
  assert.equal(hot.temperatureC, 70);
  close(hot.volts, hot.factor * hot.resistanceOhmM * 20 * 10);
  assert.equal(
    feederVoltageDrop(10, 20, 1.5, 'mono', true, NaN).temperatureC,
    70,
  );
});

test('022: potencia activa usa el FP sin modificar potencia aparente', () => {
  assert.equal(activePower({ points: 4, unitVA: 100, powerFactor: 0.8 }), 320);
  assert.equal(activePower({ points: 4, unitVA: 100, powerFactor: 1 }), 400);
});

test('001: cable 1,5 mm² a 40°C no admite térmica de 16 A; sin calibre válido queda pendiente', () => {
  assert.equal(
    selectPreliminaryBreaker(15, PRELIMINARY_CONDUCTOR_CAPACITY[1.5], 16),
    null,
  );
});

test('protección: el margen opcional no invalida una térmica que cumple Ib <= In <= Iz', () => {
  assert.equal(selectPreliminaryBreaker(15, 16, 10), 16);
  assert.equal(selectPreliminaryBreaker(10, 10, 6), 10);
});

test('protección: corrige una térmica excesiva sin sobredimensionar el cable', () => {
  assert.equal(selectPreliminaryBreaker(8, 16, 25), 10);
  assert.equal(selectPreliminaryBreaker(12, 16, 20), 16);
});

test('protección: conserva una selección compatible, no reduce decisiones manuales válidas', () => {
  assert.equal(selectPreliminaryBreaker(8, 20, 20), 20);
});

test('protección: sin combinación válida devuelve pendiente, no una térmica insuficiente', () => {
  assert.equal(selectPreliminaryBreaker(18, 16, 16), null);
  assert.equal(selectPreliminaryBreaker(14, 15, 16), null);
  assert.equal(selectPreliminaryBreaker(126, 200, 125), null);
});

test('protección: capacidad desconocida o datos inválidos no se validan', () => {
  for (const capacity of [undefined, NaN, Infinity, 0, -1]) {
    assert.equal(selectPreliminaryBreaker(10, capacity, 16), null);
  }
  for (const current of [NaN, Infinity, -1]) {
    assert.equal(selectPreliminaryBreaker(current, 20, 16), null);
  }
});

test('protección: todas las selecciones cumplen el intervalo y el catálogo (barrido)', () => {
  for (const capacity of Object.values(PRELIMINARY_CONDUCTOR_CAPACITY)) {
    for (let current = 0; current <= 150; current += 0.5) {
      for (const existing of STANDARD_BREAKERS) {
        const selected = selectPreliminaryBreaker(current, capacity, existing);
        if (selected === null) {
          assert.equal(
            STANDARD_BREAKERS.some(
              (value) => value >= current && value <= capacity,
            ),
            false,
          );
        } else {
          assert.ok(STANDARD_BREAKERS.includes(selected));
          assert.ok(selected >= current && selected <= capacity);
        }
      }
    }
  }
});

test('TP: no coloca circuitos propios en L1 como si un TS de 3 kVA no existiera', () => {
  const panel = tp([circuit(1, 1000), circuit(2, 1000)]);
  const child = ts([circuit(1, 3000)]);
  const before = structuredClone([panel, child]);
  const balanced = balancePanelCircuits(panel, [panel, child]);
  assert.deepEqual(
    balanced.map((item) => item.phase),
    ['L2', 'L3'],
  );
  assert.deepEqual([panel, child], before);
});

test('TP: suma demanda de TS mono y trifásicos, aplica FS una sola vez y filtra el padre', () => {
  const panels = [
    ts([circuit(1, 5000)], { feederPhase: 'L2', demandFactor: 0.6 }),
    ts([circuit(1, 3000, '3Φ'), circuit(2, 1800)], {
      id: 'ts2',
      supply: 'tri',
      demandFactor: 0.5,
    }),
    ts([circuit(1, 99999)], { id: 'otro', parentId: 'otro-tp' }),
    tp([circuit(1, 99999)]),
  ];
  assert.deepEqual(downstreamPhaseDemand('tp', panels), {
    L1: 1400,
    L2: 3500,
    L3: 500,
  });
});

test('TP: compara carga local y carga de TS usando demanda, no instalada contra demanda', () => {
  const panel = tp([circuit(1, 5000), circuit(2, 5000), circuit(3, 5000)], {
    demandFactor: 0.1,
  });
  const child = ts([circuit(1, 1000)], { demandFactor: 0.8 });
  const balanced = balancePanelCircuits(panel, [child]);
  assert.ok(balanced.every((item) => item.phase !== 'L1'));
});

test('TS: balancea solo sus circuitos, conserva cargas trifásicas y orden de IDs', () => {
  const panel = ts(
    [
      circuit(3, 1000),
      circuit(7, 3000, '3Φ'),
      circuit(9, 1000),
      circuit(12, 1000),
    ],
    { supply: 'tri' },
  );
  const balanced = balancePanelCircuits(panel, [
    ts([circuit(1, 9000)], { id: 'hermano' }),
  ]);
  assert.deepEqual(
    balanced.map((item) => item.id),
    [3, 7, 9, 12],
  );
  assert.equal(balanced[1].phase, '3Φ');
  assert.deepEqual(
    balanced.filter((item) => item.phase !== '3Φ').map((item) => item.phase),
    ['L1', 'L2', 'L3'],
  );
});

test('balanceo: no empeora una distribución manual mejor que la heurística', () => {
  const panel = tp([
    circuit(1, 5, 'L1'),
    circuit(2, 5, 'L2'),
    circuit(3, 4, 'L1'),
    circuit(4, 4, 'L2'),
    circuit(5, 3, 'L3'),
    circuit(6, 3, 'L3'),
    circuit(7, 3, 'L3'),
  ]);
  assert.deepEqual(balancePanelCircuits(panel, []), panel.circuits);
});

test('balanceo: panel monofásico, vacío y demanda cero no cambian asignaciones', () => {
  const panel = ts([circuit(1, 500)]);
  assert.deepEqual(balancePanelCircuits(panel, []), panel.circuits);
  assert.deepEqual(balancePanelCircuits(tp(), []), []);
  const zero = tp([circuit(1, 500, 'L1'), circuit(2, 500, 'L3')], {
    demandFactor: 0,
  });
  assert.deepEqual(
    balancePanelCircuits(zero, [ts([circuit(1, 3000)])]),
    zero.circuits,
  );
});

test('alimentador monofásico: ida-retorno y porcentaje referido a 220 V', () => {
  const drop = feederVoltageDrop(20, 15, 6, 'mono');
  close(drop.volts, 2 * 20 * 15 * 0.0033 * 1.1965);
  close(drop.percent, (drop.volts / 220) * 100);
  assert.equal(drop.factor, 2);
  assert.equal(drop.referenceVoltage, 220);
  assert.equal(drop.model, 'phase-neutral');
});

test('alimentador trifásico mixto: fórmula y valor provienen del mismo modelo', () => {
  const drop = feederVoltageDrop(20, 15, 6, 'tri', true);
  assert.equal(drop.model, 'mixed-estimate');
  close(drop.volts, drop.factor * drop.resistanceOhmM * 15 * 20);
  close(drop.percent, (drop.volts / drop.referenceVoltage) * 100);
  close(drop.volts, 2 * 0.0033 * 1.1965 * 15 * 20);
  assert.equal(drop.referenceVoltage, 220);
});

test('alimentador exclusivamente trifásico: raíz de tres y referencia de 380 V', () => {
  const drop = feederVoltageDrop(20, 15, 6, 'tri', false);
  assert.equal(drop.model, 'balanced-three-phase');
  close(drop.factor, Math.sqrt(3));
  close(drop.volts, Math.sqrt(3) * 0.0033 * 1.1965 * 15 * 20);
  close(drop.percent, (drop.volts / 380) * 100);
});

test('alimentador: caída nula para longitud o corriente nulas', () => {
  assert.equal(feederVoltageDrop(0, 15, 6, 'tri', true).volts, 0);
  assert.equal(feederVoltageDrop(20, 0, 6, 'mono').percent, 0);
});

test('caída acumulada: convierte la suma porcentual a la base del circuito terminal', () => {
  const feeder = feederVoltageDrop(20, 15, 6, 'tri', true);
  const total = accumulatedVoltageDrop({ percent: 0.6 }, feeder, 380);
  close(total.percent, 0.6 + feeder.percent);
  close(total.volts, (total.percent * 380) / 100);
  assert.notEqual(total.volts, 0.006 * 380 + feeder.volts);
  close(
    accumulatedVoltageDrop({ percent: 0.6 }, feeder, 220).volts,
    0.006 * 220 + feeder.volts,
  );
});
