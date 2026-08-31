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
