import test from 'node:test';
import assert from 'node:assert/strict';
import {
  circuitModuleSpan,
  differentialGroups,
  differentialLabel,
  buildPanelDevices,
  layoutDin,
  protectiveConductorSection,
  PHASE_CONDUCTOR_COLORS,
} from '../lib/panel-layout.ts';

const circuit = (id, kind = 'IUG', phase = 'L1', modules = 2) => ({
  id,
  name: `Circuito ${id}`,
  kind,
  phase,
  modules,
  breaker: 10,
});
const panel = (architecture = 'balanced', supply = 'tri') => ({
  id: 'tp',
  name: 'TP',
  type: 'TP',
  supply,
  architecture,
  includeDps: true,
  circuits: [
    circuit(1),
    circuit(2, 'TUG'),
    circuit(3, 'EMG'),
    circuit(4, 'FM', '3Φ'),
  ],
});

test('002: modelo 2P/4P respeta mínimo modular incluso al importar 3Φ con 2M', () => {
  assert.equal(circuitModuleSpan({ phase: 'L1', modules: 1 }), 2);
  assert.equal(circuitModuleSpan({ phase: '3Φ', modules: 2 }), 4);
  assert.equal(circuitModuleSpan({ phase: '3Φ', modules: 5 }), 5);
  assert.equal(circuitModuleSpan({ phase: '3Φ', modules: NaN }), 4);
  assert.equal(
    buildPanelDevices(panel(), [], 20).find((d) => d.circuitId === 4).span,
    4,
  );
});

test('003/013: PE protegido mínimo 2,5 y fases con colores distintos', () => {
  assert.equal(protectiveConductorSection(1.5), 2.5);
  assert.equal(protectiveConductorSection(6), 6);
  assert.equal(new Set(Object.values(PHASE_CONDUCTOR_COLORS)).size, 3);
  assert.equal(PHASE_CONDUCTOR_COLORS.L2, '#171717');
});

test('012: emergencia nunca comparte diferencial con cargas normales, en las tres arquitecturas', () => {
  for (const arch of ['essential', 'balanced', 'continuity']) {
    const p = panel(arch);
    const before = structuredClone(p);
    const groups = differentialGroups(p);
    const emergency = groups.find((g) =>
      g.circuits.some((c) => c.kind === 'EMG'),
    );
    assert.ok(emergency.circuits.every((c) => c.kind === 'EMG'));
    assert.equal(differentialLabel(p, 3), emergency.label);
    assert.deepEqual(
      groups.flatMap((g) => g.circuits.map((c) => c.id)).sort((a, b) => a - b),
      [1, 2, 3, 4],
    );
    const devices = buildPanelDevices(p, [], 20);
    assert.equal(
      devices.filter((d) => d.className === 'device-rcd').length,
      groups.length,
    );
    assert.equal(
      devices.filter((d) => d.circuitId !== undefined).length,
      p.circuits.length,
    );
    assert.deepEqual(p, before);
  }
});

test('sin circuitos propios no agrega ID; con alguna salida conserva los grupos reservados', () => {
  const p = panel();
  assert.equal(differentialGroups({ ...p, circuits: [] }).length, 0);
  assert.equal(
    differentialGroups({ ...p, circuits: [circuit(1, 'EMG')] }).length,
    3,
  );
});

test('arquitecturas 2/3/1: luces y tomas juntas, separadas por uso, o ID único', () => {
  const p = panel();
  const essential = differentialGroups({ ...p, architecture: 'essential' });
  assert.equal(essential.length, 2);
  assert.deepEqual(
    essential[0].circuits.map((c) => c.id),
    [1, 2, 4],
  );
  assert.deepEqual(
    essential[1].circuits.map((c) => c.id),
    [3],
  );
  const balanced = differentialGroups(p);
  assert.equal(balanced.length, 3);
  assert.deepEqual(
    balanced[0].circuits.map((c) => c.id),
    [1],
  );
  assert.deepEqual(
    balanced[1].circuits.map((c) => c.id),
    [2, 4],
  );
  assert.deepEqual(
    balanced[2].circuits.map((c) => c.id),
    [3],
  );
  const residential = differentialGroups({ ...p, architecture: 'residential' });
  assert.equal(residential.length, 1);
  assert.deepEqual(residential[0].circuits, p.circuits);
});

test('equilibrada: el uso, no el índice, decide el ID; reordenar, duplicar y cambiar fase no mezcla grupos', () => {
  const p = panel();
  p.circuits = [
    circuit(10, 'EMG'),
    circuit(3, 'TUE'),
    circuit(7, 'IUG', 'L3'),
    circuit(5, 'FM', '3Φ'),
    circuit(6, 'TUG'),
    circuit(8, 'IUG', 'L2'),
  ];
  for (const circuits of [p.circuits, [...p.circuits].reverse()]) {
    const groups = differentialGroups({ ...p, circuits });
    assert.ok(
      groups
        .find((g) => g.label === 'ID A')
        .circuits.every((c) => c.kind === 'IUG'),
    );
    assert.ok(
      groups
        .find((g) => g.label === 'ID B')
        .circuits.every((c) => ['TUG', 'TUE', 'FM'].includes(c.kind)),
    );
    assert.ok(
      groups
        .find((g) => g.label === 'ID EMG')
        .circuits.every((c) => c.kind === 'EMG'),
    );
    for (const c of circuits)
      assert.equal(groups.filter((g) => g.circuits.includes(c)).length, 1);
  }
});

test('grupos reservados cuentan como equipos reales en cada ancho 2P/4P', () => {
  for (const supply of ['mono', 'tri'])
    for (const [architecture, count] of [
      ['essential', 2],
      ['balanced', 3],
      ['residential', 1],
    ]) {
      const p = { ...panel(architecture, supply), circuits: [circuit(1)] };
      const devices = buildPanelDevices(p, [], 10);
      assert.equal(
        devices.filter((d) => d.className === 'device-rcd').length,
        count,
      );
      assert.equal(
        devices
          .filter((d) => d.className === 'device-rcd')
          .reduce((sum, d) => sum + d.span, 0),
        count * (supply === 'tri' ? 4 : 2),
      );
    }
});

test('009/010: reserva sobre total ≥20% y mínimo 2, con todos los saltos de fila', () => {
  for (const width of [12, 16, 18, 24])
    for (const reserve of [0, 20, 25, 50, 80])
      for (let n = 0; n <= 120; n++) {
        const devices = Array.from({ length: n }, (_, i) => ({
          key: i,
          span: [4, 8, 2, 6][i % 4],
        }));
        const layout = layoutDin(devices, width, reserve);
        assert.equal(layout.placements.length, devices.length);
        assert.ok(layout.freeModules >= 2);
        assert.ok(
          layout.freeModules / layout.cabinetModules + 1e-10 >=
            Math.max(reserve, 20) / 100,
        );
        const occupied = new Set();
        for (const { device, start } of layout.placements) {
          assert.ok((start % width) + device.span <= width);
          assert.ok(start + device.span <= layout.cabinetModules);
          for (let offset = 0; offset < device.span; offset++) {
            assert.equal(occupied.has(start + offset), false);
            occupied.add(start + offset);
          }
        }
        assert.equal(occupied.size, layout.occupiedModules);
      }
});

test('010: no acepta un aparato mayor que el riel; no lo trunca', () => {
  assert.throws(() => layoutDin([{ span: 25 }], 24, 25));
  assert.throws(() => layoutDin([{ span: 0 }], 24, 25));
  const result = layoutDin(
    Array.from({ length: 12 }, () => ({ span: 8 })),
    12,
    20,
  );
  assert.equal(result.rows, 12);
  assert.equal(result.packingGaps, 44);
});
