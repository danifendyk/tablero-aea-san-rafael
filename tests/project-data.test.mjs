import test from 'node:test';
import assert from 'node:assert/strict';
import {
  finiteNumber,
  readStoredProject,
  saveStoredProject,
  resetStoredProject,
  canDeletePanel,
  highlightedCircuit,
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  saveStoredProjectIfUnchanged,
  safeCircuitId,
  nextCircuitId,
  normalizeCircuitIds,
  nextSectionalPanelNumber,
} from '../lib/project-data.ts';

function memory(entries = []) {
  const data = new Map(entries);
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}

test('019/016: null, vacío, booleanos y no finitos conservan fallback; límites de precios', () => {
  for (const value of [
    null,
    undefined,
    '',
    '  ',
    false,
    true,
    [],
    {},
    NaN,
    Infinity,
    'NaN',
  ])
    assert.equal(finiteNumber(value, 25, 0, 100), 25);
  assert.equal(finiteNumber(0, 25), 0);
  assert.equal(finiteNumber('2.5', 25), 2.5);
  assert.equal(finiteNumber(-100, 25, 0), 0);
  assert.equal(finiteNumber(1e20, 25, 0, 1e12), 1e12);
});

test('004: getter bloqueado, lectura y cuota no propagan excepciones', () => {
  const blocked = () => {
    throw Error('SecurityError');
  };
  assert.ok(readStoredProject(blocked).error);
  assert.ok(saveStoredProject(blocked, {}).includes('JSON'));
  const store = memory();
  store.setItem = () => {
    throw Error('QuotaExceededError');
  };
  assert.ok(saveStoredProject(() => store, {}));
  store.getItem = () => {
    throw Error('SecurityError');
  };
  assert.ok(readStoredProject(() => store).error);
});

test('004: datos corruptos no se borran ni se reemplazan por legacy', () => {
  for (const value of ['{bad', 'null', '[]', '123', '']) {
    const store = memory([
      [STORAGE_KEY, value],
      [LEGACY_STORAGE_KEY, '{"old":true}'],
    ]);
    assert.ok(readStoredProject(() => store).error);
    assert.equal(store.data.get(STORAGE_KEY), value);
    assert.ok(store.data.has(LEGACY_STORAGE_KEY));
  }
});

test('004/018: migración de legacy solo si falta v3', () => {
  const store = memory([[LEGACY_STORAGE_KEY, '{"old":true}']]);
  assert.equal(readStoredProject(() => store).legacy, true);
  assert.equal(
    saveStoredProject(() => store, { new: true }),
    null,
  );
  assert.deepEqual(readStoredProject(() => store).data, { new: true });
  assert.equal(readStoredProject(() => memory()).data, null);
});

test('018: reset escribe v3 antes de quitar legacy, incluso si removeItem falla', () => {
  for (const removeFails of [true, false]) {
    const store = memory([
      [STORAGE_KEY, '{"old":true}'],
      [LEGACY_STORAGE_KEY, '{"legacy":true}'],
    ]);
    if (removeFails)
      store.removeItem = () => {
        throw Error('blocked');
      };
    assert.equal(
      resetStoredProject(() => store, { fresh: true }),
      null,
    );
    assert.deepEqual(readStoredProject(() => store).data, { fresh: true });
    assert.equal(store.data.has(LEGACY_STORAGE_KEY), removeFails);
  }
});

test('018: reset fallido conserva el proyecto anterior y devuelve advertencia', () => {
  const store = memory([[STORAGE_KEY, '{"old":true}']]);
  store.setItem = () => {
    throw Error('quota');
  };
  assert.ok(resetStoredProject(() => store, {}));
  assert.deepEqual(readStoredProject(() => store).data, { old: true });
});

test('020: TP, ID desconocido y último tablero nunca se eliminan', () => {
  const panels = [
    { id: 'tp', type: 'TP' },
    { id: 'ts', type: 'TS' },
  ];
  assert.equal(canDeletePanel(panels, 'tp'), false);
  assert.equal(canDeletePanel(panels, 'otro'), false);
  assert.equal(canDeletePanel(panels, 'ts'), true);
  assert.equal(canDeletePanel([panels[1]], 'ts'), false);
});

test('015: hover tiene prioridad y la selección se recupera al salir', () => {
  assert.equal(highlightedCircuit(2, 1), 2);
  assert.equal(highlightedCircuit(null, 1), 1);
  assert.equal(highlightedCircuit(null, null), null);
});

test('snapshot: vacío, v3 y legacy describen exactamente los bytes leídos', () => {
  assert.deepEqual(readStoredProject(() => memory()).snapshot, {
    current: null,
    legacy: null,
  });
  const legacy = '{"circuits":[]}';
  const store = memory([[LEGACY_STORAGE_KEY, legacy]]);
  assert.deepEqual(readStoredProject(() => store).snapshot, {
    current: null,
    legacy,
  });
  const current = '{"panels":[]}';
  store.setItem(STORAGE_KEY, current);
  assert.deepEqual(readStoredProject(() => store).snapshot, {
    current,
    legacy: null,
  });
  store.setItem(STORAGE_KEY, '{broken');
  assert.equal(readStoredProject(() => store).snapshot, null);
});

test('conflicto: una pestaña obsoleta no sobrescribe lo guardado por otra', () => {
  const store = memory([[STORAGE_KEY, '{"projectName":"Inicial"}']]);
  const tabA = readStoredProject(() => store);
  const tabB = readStoredProject(() => store);
  const savedB = saveStoredProjectIfUnchanged(
    () => store,
    { projectName: 'Trabajo nuevo de B' },
    tabB.snapshot,
  );
  assert.equal(savedB.ok, true);
  const bytesB = store.data.get(STORAGE_KEY);
  const savedA = saveStoredProjectIfUnchanged(
    () => store,
    { ...tabA.data, activePanelId: 'ts2' },
    tabA.snapshot,
  );
  assert.equal(savedA.ok, false);
  assert.equal(savedA.kind, 'conflict');
  assert.equal(store.data.get(STORAGE_KEY), bytesB);
  const reloadedA = readStoredProject(() => store);
  const afterReload = saveStoredProjectIfUnchanged(
    () => store,
    { ...reloadedA.data, activePanelId: 'ts2' },
    reloadedA.snapshot,
  );
  assert.equal(afterReload.ok, true);
  assert.deepEqual(readStoredProject(() => store).data, {
    projectName: 'Trabajo nuevo de B',
    activePanelId: 'ts2',
  });
  assert.deepEqual(
    afterReload.snapshot,
    readStoredProject(() => store).snapshot,
  );
});

test('conflicto: migración no pisa un v3 nuevo ni cambios posteriores de legacy', () => {
  for (const change of ['current', 'legacy']) {
    const store = memory([[LEGACY_STORAGE_KEY, '{"old":1}']]);
    const loaded = readStoredProject(() => store);
    const key = change === 'current' ? STORAGE_KEY : LEGACY_STORAGE_KEY;
    store.setItem(key, '{"other":2}');
    const before = [...store.data];
    const result = saveStoredProjectIfUnchanged(
      () => store,
      { migrated: true },
      loaded.snapshot,
    );
    assert.equal(result.ok, false);
    assert.equal(result.kind, 'conflict');
    assert.deepEqual([...store.data], before);
  }
});

test('guardado con snapshot: cuota, lectura corrupta y serialización fallida preservan bytes', () => {
  const store = memory([[STORAGE_KEY, '{"existing":true}']]);
  const snapshot = readStoredProject(() => store).snapshot;
  store.setItem = () => {
    throw Error('QuotaExceededError');
  };
  const failed = saveStoredProjectIfUnchanged(
    () => store,
    { replacement: true },
    snapshot,
  );
  assert.equal(failed.ok, false);
  assert.equal(failed.kind, 'storage');
  assert.equal(store.data.get(STORAGE_KEY), '{"existing":true}');
  const circular = {};
  circular.self = circular;
  assert.equal(
    saveStoredProjectIfUnchanged(() => store, circular, snapshot).kind,
    'storage',
  );
  assert.equal(
    saveStoredProjectIfUnchanged(() => store, {}, null).kind,
    'storage',
  );
  assert.equal(
    saveStoredProjectIfUnchanged(
      () => {
        throw Error('SecurityError');
      },
      {},
      snapshot,
    ).kind,
    'storage',
  );
  assert.equal(store.data.get(STORAGE_KEY), '{"existing":true}');
});

test('guardado con snapshot: el resultado permite ediciones sucesivas y no reescribe bytes iguales', () => {
  const store = memory();
  const first = saveStoredProjectIfUnchanged(
    () => store,
    { revision: 1 },
    readStoredProject(() => store).snapshot,
  );
  assert.equal(first.ok, true);
  const second = saveStoredProjectIfUnchanged(
    () => store,
    { revision: 2 },
    first.snapshot,
  );
  assert.equal(second.ok, true);
  store.setItem = () => {
    throw Error('No debe escribir otra vez');
  };
  assert.equal(
    saveStoredProjectIfUnchanged(() => store, { revision: 2 }, second.snapshot)
      .ok,
    true,
  );
});

test('IDs: enteros inseguros, fracciones y formatos inválidos se sustituyen sin redondeos', () => {
  for (const invalid of [
    Number.MAX_SAFE_INTEGER + 1,
    Infinity,
    NaN,
    1.2,
    -1,
    0,
    null,
    undefined,
    '',
    true,
    {},
  ])
    assert.equal(safeCircuitId(invalid, 7), 7);
  assert.equal(safeCircuitId('12'), 12);
  assert.equal(safeCircuitId(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
  assert.equal(safeCircuitId(NaN, Infinity), 1);
});

test('IDs: agregar en el máximo busca un hueco seguro y conserva identificadores existentes', () => {
  assert.equal(nextCircuitId([]), 1);
  assert.equal(nextCircuitId([2, 5]), 6);
  assert.equal(nextCircuitId([Number.MAX_SAFE_INTEGER, 1, 2]), 3);
  assert.equal(nextCircuitId([Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]), 1);
  const circuits = [
    { id: Number.MAX_SAFE_INTEGER, name: 'Máximo original' },
    { id: Number.MAX_SAFE_INTEGER, name: 'Duplicado' },
    { id: 1, name: 'ID uno existente' },
    { id: 9007199254740992, name: 'Inseguro' },
    { id: 9007199254740992, name: 'Inseguro repetido' },
  ];
  const before = structuredClone(circuits);
  const repaired = normalizeCircuitIds(circuits);
  assert.deepEqual(circuits, before);
  assert.deepEqual(
    repaired.map((c) => c.name),
    circuits.map((c) => c.name),
  );
  assert.deepEqual(
    repaired.map((c) => c.id),
    [Number.MAX_SAFE_INTEGER, 2, 1, 3, 4],
  );
  assert.equal(new Set(repaired.map((c) => c.id)).size, circuits.length);
  assert.equal(repaired[0], circuits[0]);
  assert.equal(repaired[2], circuits[2]);
});

test('nombres TS: borrar TS1 no reutiliza TS2 y variantes existentes reservan su número', () => {
  assert.equal(nextSectionalPanelNumber([{ name: 'TP' }]), 1);
  assert.equal(
    nextSectionalPanelNumber([{ name: 'TS2 · Tablero Seccional' }]),
    3,
  );
  assert.equal(
    nextSectionalPanelNumber([
      { name: 'TS2 · Salón' },
      { name: ' ts 04 (Copia)' },
      { name: 'TS1' },
      { name: 'Otro tablero' },
    ]),
    5,
  );
  assert.equal(
    nextSectionalPanelNumber([
      { name: `TS${Number.MAX_SAFE_INTEGER}` },
      { name: 'TS1' },
    ]),
    2,
  );
});
