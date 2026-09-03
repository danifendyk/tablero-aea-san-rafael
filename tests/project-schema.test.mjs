import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProjectStructure } from '../lib/project-schema.ts';

const makeCircuit = () => ({
  id: 1,
  name: 'Iluminación',
  kind: 'IUG',
  points: 8,
  unitVA: 100,
  phase: 'L1',
  powerFactor: 0.95,
  breaker: 10,
  conductor: 1.5,
  lengthM: 20,
  modules: 2,
});
const makePanel = () => ({
  id: 'tp',
  name: 'Principal',
  type: 'TP',
  parentId: null,
  supply: 'tri',
  demandFactor: 0.8,
  reservePercent: 25,
  modulesPerRow: 18,
  architecture: 'balanced',
  circuits: [makeCircuit()],
});
const makeProject = () => ({
  version: '3.0',
  projectName: 'Proyecto',
  panels: [makePanel()],
});

test('esquema: export v3 y borrador sin versión mantienen todos sus datos sin mutaciones', () => {
  for (const version of ['3.0', 3, undefined]) {
    const data = makeProject();
    data.version = version;
    data.panels.push({
      ...makePanel(),
      id: 'ts2',
      name: 'Seccional',
      type: 'TS',
      parentId: 'tp',
      circuits: [],
    });
    data.profile = {
      preset: 'hall',
      emergencyAutonomyHours: 0,
      emergencyEvidence: '',
      siteTestReady: false,
    };
    data.prices = { cabinet18: 25000, assemblyPercent: 20 };
    const before = structuredClone(data);
    const result = validateProjectStructure(data);
    assert.equal(result.ok, true);
    assert.equal(result.data, data);
    assert.deepEqual(data, before);
  }
});

test('esquema: un TP de tránsito vacío es válido; circuitos ausentes o dañados jamás se vuelven vacíos', () => {
  const empty = makeProject();
  empty.panels[0].circuits = [];
  assert.equal(validateProjectStructure(empty).ok, true);
  for (const circuits of [
    undefined,
    null,
    'broken',
    {},
    [null],
    [42],
    [[]],
    [{}],
  ]) {
    const data = makeProject();
    data.panels[0].circuits = circuits;
    const before = structuredClone(data);
    assert.equal(validateProjectStructure(data).ok, false);
    assert.deepEqual(data, before);
  }
  assert.equal(
    validateProjectStructure({
      version: '3.0',
      panels: [{ type: 'TP', circuits: 'broken' }],
    }).ok,
    false,
  );
});

test('esquema: no descarta tableros inválidos ni tolera raíz/IDs/topología ambiguos', () => {
  for (const root of [null, [], 1, 'text', {}, { panels: [] }])
    assert.equal(validateProjectStructure(root).ok, false);
  for (const bad of [
    null,
    2,
    [],
    {},
    { ...makePanel(), id: 'tp' },
    { ...makePanel(), id: 'tp2' },
  ]) {
    const data = makeProject();
    data.panels.push(bad);
    assert.equal(validateProjectStructure(data).ok, false);
  }
  const orphan = makeProject();
  orphan.panels.push({
    ...makePanel(),
    type: 'TS',
    id: 'ts',
    parentId: 'unknown',
  });
  assert.equal(validateProjectStructure(orphan).ok, false);
});

test('esquema: requiere datos esenciales reales en cada circuito, no inventa una plantilla', () => {
  for (const key of [
    'id',
    'name',
    'kind',
    'points',
    'unitVA',
    'phase',
    'powerFactor',
    'breaker',
    'conductor',
    'lengthM',
    'modules',
  ]) {
    const data = makeProject();
    delete data.panels[0].circuits[0][key];
    const result = validateProjectStructure(data);
    assert.equal(result.ok, false, key);
    assert.ok(result.error.includes(key));
  }
  for (const [key, value] of [
    ['points', null],
    ['breaker', NaN],
    ['unitVA', Infinity],
    ['phase', 'L4'],
    ['kind', 'unknown'],
    ['ampacity', []],
  ]) {
    const data = makeProject();
    data.panels[0].circuits[0][key] = value;
    assert.equal(validateProjectStructure(data).ok, false, key);
  }
});

test('esquema: los IDs numéricos inseguros/duplicados son reparables sin perder los circuitos', () => {
  const data = makeProject();
  data.panels[0].circuits = [
    { ...makeCircuit(), id: 9007199254740992 },
    { ...makeCircuit(), id: 9007199254740992, name: 'Segundo' },
  ];
  assert.equal(validateProjectStructure(data).ok, true);
  assert.equal(data.panels[0].circuits.length, 2);
});

test('esquema: perfil/precios ausentes permiten compatibilidad; tipos presentes dañados se rechazan', () => {
  assert.equal(validateProjectStructure(makeProject()).ok, true);
  for (const [key, value] of [
    ['profile', null],
    ['profile', []],
    ['profile', { siteTestReady: 'true' }],
    ['profile', { emergencyAutonomyHours: 'broken' }],
    ['prices', null],
    ['prices', []],
    ['prices', { cabinet18: 'broken' }],
  ])
    assert.equal(
      validateProjectStructure({ ...makeProject(), [key]: value }).ok,
      false,
    );
});

test('esquema: valida opciones nuevas de selectividad, Clase II y cable LSOH', () => {
  const data = makeProject();
  data.panels[0].tpDifferentialMode = 'none';
  data.panels[0].feederWiring = 'classII-underground';
  data.profile = { interiorCableStandard: 'iram62267' };
  assert.equal(validateProjectStructure(data).ok, true);

  for (const [target, key, value] of [
    ['panel', 'tpDifferentialMode', 'automatic'],
    ['panel', 'feederWiring', 'underground'],
    ['profile', 'interiorCableStandard', 'pvc'],
  ]) {
    const invalid = structuredClone(data);
    if (target === 'panel') invalid.panels[0][key] = value;
    else invalid.profile[key] = value;
    assert.equal(validateProjectStructure(invalid).ok, false, key);
  }
});

test('esquema: v2 solo entra por migración explícita y nunca sustituye circuitos ausentes', () => {
  const data = {
    version: '2.0',
    supply: 'tri',
    demandFactor: 0.8,
    circuits: [makeCircuit()],
  };
  delete data.circuits[0].modules;
  assert.equal(validateProjectStructure(data).ok, false);
  assert.equal(validateProjectStructure(data, { legacy: true }).ok, true);
  assert.equal(
    validateProjectStructure({ ...data, circuits: undefined }, { legacy: true })
      .ok,
    false,
  );
  assert.equal(
    validateProjectStructure({ ...data, circuits: [null] }, { legacy: true })
      .ok,
    false,
  );
  assert.equal(
    validateProjectStructure(makeProject(), { legacy: true }).ok,
    false,
  );
  assert.equal(
    validateProjectStructure({ ...makeProject(), version: '4.0' }).ok,
    false,
  );
});
