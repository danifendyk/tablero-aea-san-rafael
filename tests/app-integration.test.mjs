import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  buildPanelDevices,
  layoutDin,
  differentialGroups,
} from '../lib/panel-layout.ts';

// Execute the actual page's pure functions and memo bodies, without a browser or
// duplicating its electrical logic. Only UI primitives/icons are replaced.
const require = createRequire(import.meta.url);
const source = readFileSync(
  new URL('../app/page.tsx', import.meta.url),
  'utf8',
);
const ast = ts.createSourceFile(
  'page.tsx',
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
function memoBody(name) {
  let callback;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name)
      callback = node.initializer.arguments[0].getText(ast);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(callback, `No se encontró ${name}`);
  return callback;
}

test('001: todas las plantillas IUG de código, incluido crear TS, evitan térmica de 16 A con 1,5 mm²', () => {
  let count = 0;
  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const properties = Object.fromEntries(
        node.properties
          .filter(ts.isPropertyAssignment)
          .map((p) => [p.name.getText(ast), p.initializer.getText(ast)]),
      );
      if (properties.kind === "'IUG'" && properties.conductor === '1.5') {
        count++;
        assert.ok(
          Number(properties.breaker) <= 15,
          `IUG inválido: ${node.getText(ast)}`,
        );
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(count >= 3);
});
const appended = `
export const audit = { normalizePanels, normalizeCircuit, normalizePrices, normalizeProfile, INITIAL_PANELS, INITIAL_PROFILE, DEFAULT_PRICES, PanelFront, SingleLineDiagram, MultiLineDiagram, ProjectPrintSummary, PriceInput, AmpacityEditor, FeederReviews, reviewFeeder, emergencyAutonomyDeclared, cabinetFor, circuitCurrent, voltageDrop };
export function calculatePanels(panels) { return (${memoBody('panelCalculations')})(); }
export function calculateCosts(activePanel, panels, prices) { return (${memoBody('costOptions')})(); }
export function calculateProjectCosts(panels, prices) { return (${memoBody('projectCostSummary')})(); }
export function calculateWarnings(activePanel, calculations, tpPanel, panels, profile, isPublicVenue) { const panelCalculations = calculatePanels(panels); return (${memoBody('warnings')})(); }
`;
const compiled = ts.transpileModule(source + appended, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;
const ui = {
  Input: 'input',
  Label: 'label',
  NativeSelect: 'select',
  NativeSelectOption: 'option',
  Button: 'button',
  Badge: 'span',
  Separator: 'hr',
};
const customRequire = (name) => {
  if (name.startsWith('@/lib/')) return require(`../lib/${name.slice(6)}.ts`);
  if (name.startsWith('@/components/ui/')) return ui;
  if (name === 'lucide-react') return new Proxy({}, { get: () => 'svg' });
  return require(name);
};
const pageModule = { exports: {} };
vm.runInThisContext(`(function(exports,require,module){${compiled}\n})`, {
  filename: 'audit-page.cjs',
})(pageModule.exports, customRequire, pageModule);
const {
  audit: app,
  calculatePanels,
  calculateCosts,
  calculateProjectCosts,
  calculateWarnings,
} = pageModule.exports;
const html = (Component, props) =>
  renderToStaticMarkup(React.createElement(Component, props));
const clone = (value) => structuredClone(value);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const makeCircuit = (id, extra = {}) =>
  app.normalizeCircuit(
    {
      id,
      name: `Salida única ${id}`,
      kind: 'IUG',
      points: 1,
      unitVA: 500,
      phase: 'L1',
      ...extra,
    },
    id - 1,
    'tri',
  );
const makePanel = (extra = {}) => ({
  ...clone(app.INITIAL_PANELS[0]),
  id: 'tp',
  type: 'TP',
  name: 'TP',
  circuits: [makeCircuit(1)],
  ...extra,
});

test('TP/TS: 48,8 A con alimentador de 32 A y 6 mm² se advierte desde ambos tableros y al imprimir', () => {
  const tp = makePanel({ circuits: [] });
  const child = makePanel({
    id: 'ts1',
    name: 'TS1',
    type: 'TS',
    parentId: tp.id,
    demandFactor: 1,
    feederBreaker: 32,
    feederConductor: 6,
    feederLengthM: 15,
    circuits: Array.from({ length: 5 }, (_, i) =>
      makeCircuit(i + 1, {
        kind: 'TUE',
        phase: 'L3',
        unitVA: 2147.2,
        breaker: 20,
        conductor: 4,
      }),
    ),
  });
  const panels = [tp, child];
  const before = clone(panels);
  const calculations = calculatePanels(panels);
  close(calculations.get('ts1').mainCurrent, 48.8);
  assert.equal(calculations.get('ts1').mainBreaker, 63);
  assert.equal(calculations.get('tp').mainBreaker, 63);
  for (const panel of panels) {
    const warnings = calculateWarnings(
      panel,
      calculations.get(panel.id),
      tp,
      panels,
      app.INITIAL_PROFILE,
      false,
    );
    assert.ok(
      warnings.some(
        (w) => w.includes('TS1') && w.includes('32 A es menor que Ib 48,8 A'),
      ),
    );
    assert.ok(warnings.some((w) => w.includes('No aumentar solo la térmica')));
    const review = html(app.FeederReviews, { panel, panels, calculations });
    assert.ok(review.includes('role="alert"'));
    assert.ok(review.includes('48,8 A'));
    assert.ok(review.includes('Cable 6 mm²'));
    assert.ok(review.includes('32,0 A'));
  }
  const printed = html(app.ProjectPrintSummary, {
    projectName: 'Regresión TP/TS',
    panels,
    calculations,
  });
  assert.equal(printed.split('No aumentar solo la térmica').length - 1, 2);
  const front = html(app.PanelFront, {
    devices: buildPanelDevices(child, [], 63),
    rows: 3,
    modulesPerRow: 18,
    panelType: 'TS',
    hasDps: false,
    hasFeeders: false,
  });
  assert.ok(front.includes('Maniobra'));
  assert.ok(front.includes('sin disparo por sobrecorriente'));
  assert.ok(
    html(app.SingleLineDiagram, {
      panel: child,
      calculation: calculations.get('ts1'),
    }).includes('maniobra, sin disparo por sobrecorriente'),
  );
  assert.deepEqual(
    panels,
    before,
    'No se deben ajustar térmicas ni cables del usuario',
  );
});

test('alimentador: un corte local de 63 A no invalida por sí solo una térmica de 32 A', () => {
  const child = makePanel({
    id: 'ts1',
    type: 'TS',
    feederBreaker: 32,
    feederConductor: 6,
  });
  const calculation = {
    ...calculatePanels([child]).get('ts1'),
    mainCurrent: 32,
    mainBreaker: 63,
    feederDrop: { percent: 0.5 },
  };
  assert.deepEqual(app.reviewFeeder(child, calculation).issues, []);
  const markup = html(app.FeederReviews, {
    panel: child,
    panels: [child],
    calculations: new Map([['ts1', calculation]]),
  });
  assert.ok(!markup.includes('role="alert"'));
  assert.ok(markup.includes('No valida la instalación'));
});

test('alimentador: aumentar solo In o desconocer Iz nunca resuelve la revisión', () => {
  const child = makePanel({
    id: 'ts1',
    type: 'TS',
    feederBreaker: 63,
    feederConductor: 6,
  });
  const calculation = {
    ...calculatePanels([child]).get('ts1'),
    mainCurrent: 48.8,
  };
  const issues = app.reviewFeeder(child, calculation).issues;
  assert.ok(
    issues.some((issue) => issue.includes('La demanda supera Iz 32,0 A')),
  );
  assert.ok(issues.some((issue) => issue.includes('63 A supera Iz 32,0 A')));
  const unknown = {
    ...child,
    feederAmpacity: { mode: 'declared', declaredA: 80, basis: '' },
  };
  assert.equal(app.reviewFeeder(unknown, calculation).capacity, null);
  assert.ok(
    app
      .reviewFeeder(unknown, calculation)
      .issues.some((issue) => issue.includes('Falta una Iz')),
  );
});

test('001/002/019: normalización real de página, valores vacíos y módulos trifásicos', () => {
  const c = app.normalizeCircuit(
    { kind: 'IUG', breaker: null, conductor: '', phase: '3Φ', modules: 2 },
    0,
    'tri',
  );
  assert.equal(c.breaker, 10);
  assert.equal(c.conductor, 1.5);
  assert.equal(c.modules, 4);
  const panels = app.normalizePanels([
    makePanel({ circuits: [makeCircuit(1), makeCircuit(1)] }),
  ]);
  assert.notEqual(panels[0].circuits[0].id, panels[0].circuits[1].id);
  assert.equal(app.normalizePanels([{ type: 'TS' }]), null);
});

test('007: TP directo 2,5% no dispara límite AEA 2%, conserva observación municipal', () => {
  const circuit = makeCircuit(1, {
    unitVA: 1000,
    conductor: 2.5,
    breaker: 10,
    lengthM: 1,
  });
  circuit.lengthM = 2.5 / app.voltageDrop(circuit, 'tri').percent;
  const panel = makePanel({ circuits: [circuit] });
  const warnings = calculateWarnings(
    panel,
    calculatePanels([panel]).get('tp'),
    panel,
    [panel],
    app.INITIAL_PROFILE,
    false,
  );
  assert.ok(
    warnings.some((w) => w.includes('Ord. 72/83') && w.includes('2 %')),
  );
  assert.ok(!warnings.some((w) => w.includes('criterio AEA')));
});

test('008/022: TP suma P propia y P de TS una vez; no usa FP para bajar Ib', () => {
  const tp = makePanel({
    circuits: [makeCircuit(1, { unitVA: 1000, powerFactor: 0.8 })],
  });
  const child = makePanel({
    id: 'ts',
    type: 'TS',
    parentId: 'tp',
    supply: 'mono',
    feederPhase: 'L2',
    demandFactor: 0.5,
    circuits: [makeCircuit(2, { unitVA: 2000, powerFactor: 0.5 })],
  });
  const calculations = calculatePanels([tp, child]);
  assert.equal(calculations.get('tp').activeInstalledW, 1800);
  assert.equal(calculations.get('ts').activeInstalledW, 1000);
  close(calculations.get('ts').mainCurrent, 1000 / 220);
  const feeder = calculations.get('ts').feederDrop;
  close(
    feeder.volts,
    feeder.factor *
      feeder.resistanceOhmM *
      (child.feederLengthM ?? 15) *
      calculations.get('ts').mainCurrent,
  );
});

test('009/010/012: cálculos, lista de equipos y presupuesto coinciden en todas las arquitecturas', () => {
  for (const architecture of [
    'essential',
    'balanced',
    'residential',
    'continuity',
  ])
    for (const modulesPerRow of [12, 16, 18, 24]) {
      const panel = makePanel({
        architecture,
        modulesPerRow,
        circuits: Array.from({ length: 15 }, (_, i) =>
          makeCircuit(i + 1, {
            phase: i % 3 ? 'L1' : '3Φ',
            kind: i % 5 ? 'TUG' : 'EMG',
            modules: i % 2 ? 8 : 4,
          }),
        ),
      });
      const calculation = calculatePanels([panel]).get('tp');
      const devices = buildPanelDevices(panel, [], calculation.mainBreaker);
      const layout = layoutDin(devices, modulesPerRow, panel.reservePercent);
      assert.equal(calculation.occupiedModules, layout.occupiedModules);
      assert.equal(calculation.cabinetModules, layout.cabinetModules);
      const cost = calculateCosts(panel, [panel], app.DEFAULT_PRICES).find(
        (c) => c.id === architecture,
      );
      assert.equal(cost.modules, layout.occupiedModules);
      assert.equal(
        cost.lines[0].value,
        app.cabinetFor(layout.cabinetModules, app.DEFAULT_PRICES).value,
      );
      const groups = differentialGroups(panel);
      const expectedRcd = groups.reduce(
        (sum, g) =>
          sum +
          (g.span === 4 ? app.DEFAULT_PRICES.rcd4P : app.DEFAULT_PRICES.rcd2P) *
            (panel.differentialType === 'AC'
              ? 1
              : 1 + app.DEFAULT_PRICES.typeAPremium / 100),
        0,
      );
      close(
        cost.lines.find((line) => line.label.includes('tipo')).value,
        expectedRcd,
      );
      close(
        calculateProjectCosts([panel], app.DEFAULT_PRICES).total,
        cost.total,
      );
      const frontal = html(app.PanelFront, {
        devices,
        rows: calculation.rows,
        modulesPerRow,
        panelType: 'TP',
        hasDps: true,
        hasFeeders: false,
      });
      for (const device of devices)
        assert.ok(
          frontal.includes(device.label),
          `Dispositivo oculto: ${device.label}`,
        );
      assert.ok(frontal.includes(`Riel DIN ${layout.rows}`));
      const undersized = html(app.PanelFront, {
        devices,
        rows: 1,
        modulesPerRow,
        panelType: 'TP',
        hasDps: true,
        hasFeeders: false,
      });
      for (const device of devices)
        assert.ok(undersized.includes(device.label));
    }
});

test('003/011/012/013/014/024: esquemas con >6 circuitos, PE, colores, EMG, cañerías y resaltado', () => {
  const panel = makePanel({
    circuits: Array.from({ length: 14 }, (_, i) =>
      makeCircuit(i + 1, {
        phase: i === 1 ? '3Φ' : 'L1',
        kind: i === 2 ? 'EMG' : 'IUG',
        conduit: i === 0 ? 'Acero RS 19 (declarado)' : '',
      }),
    ),
  });
  const calculations = calculatePanels([panel]);
  const unifilar = html(app.SingleLineDiagram, {
    panel,
    calculation: calculations.get('tp'),
  });
  const multi = html(app.MultiLineDiagram, {
    panel,
    childPanels: [],
    calculations,
    highlightedCircuitId: 2,
  });
  for (const circuit of panel.circuits) {
    assert.ok(unifilar.includes(circuit.name));
    assert.ok(multi.includes(circuit.name));
  }
  assert.ok(!unifilar.includes('mr-[75px]'));
  assert.ok(unifilar.includes('ID EMG'));
  assert.ok(unifilar.includes('Acero RS 19'));
  assert.ok(unifilar.includes('pendiente de dimensionar'));
  assert.ok(multi.includes('PE · 2.5 mm²'));
  assert.ok(!multi.includes('PE · 1.5 mm²'));
  for (const color of [
    '#8b4513',
    '#171717',
    '#dc2626',
    '#38bdf8',
    'repeating-linear-gradient',
  ])
    assert.ok(multi.includes(color));
  assert.ok(multi.includes('ring-amber-400'));
  // Exercise the actual row handlers, not merely the rendered class.
  const hovered = [];
  const tree = app.MultiLineDiagram({
    panel,
    childPanels: [],
    calculations,
    onHoverCircuit: (id) => hovered.push(id),
  });
  const tableRows = tree.props.children[0].props.children[1].props.children;
  tableRows[1].props.onMouseEnter();
  tableRows[1].props.onMouseLeave();
  assert.deepEqual(hovered, [2, undefined]);
});

test('016/023: PriceInput real limita negativos/NaN y los seis gabinetes son editables', () => {
  const values = [];
  const tree = app.PriceInput({
    label: 'Prueba',
    value: 100,
    onChange: (v) => values.push(v),
  });
  const input = tree.props.children[1].props.children[0];
  for (const value of ['-50', '', 'NaN', '1000000000000000', '350'])
    input.props.onChange({ target: { value } });
  assert.deepEqual(values, [0, 100, 100, 1e12, 350]);
  assert.equal(
    app.normalizePrices({ ...app.DEFAULT_PRICES, cabinet18: -5 }).cabinet18,
    0,
  );
  for (const modules of [16, 18, 24, 36, 54, 72]) {
    assert.equal(
      app.cabinetFor(modules, app.DEFAULT_PRICES).value,
      app.DEFAULT_PRICES[`cabinet${modules}`],
    );
    assert.ok(source.includes(`value={prices.cabinet${modules}}`));
  }
});

test('017: impresión incluye frontal, unifilar y multifilar para TP y TS', () => {
  const tp = makePanel();
  const child = makePanel({
    id: 'ts',
    name: 'TS del salón',
    type: 'TS',
    parentId: 'tp',
  });
  const panels = [tp, child];
  const printed = html(app.ProjectPrintSummary, {
    projectName: 'SALÓN prueba',
    panels,
    calculations: calculatePanels(panels),
  });
  for (const label of [
    'Vista frontal DIN',
    'Esquema unifilar funcional',
    'Cuadro multifilar preliminar',
  ])
    assert.equal(printed.split(label).length - 1, 2);
  const css = readFileSync(
    new URL('../app/globals.css', import.meta.url),
    'utf8',
  );
  assert.ok(css.includes('overflow: visible !important'));
  assert.ok(css.includes('min-width: 0 !important'));
  assert.ok(css.includes('table-header-group'));
});

test('025: autonomía exige >=2h y evidencia; normalizar no inventa cumplimiento', () => {
  assert.equal(app.emergencyAutonomyDeclared({}), false);
  assert.equal(
    app.emergencyAutonomyDeclared({ emergencyAutonomyHours: 2 }),
    false,
  );
  assert.equal(
    app.emergencyAutonomyDeclared({
      emergencyAutonomyHours: 1.9,
      emergencyEvidence: 'Ensayo',
    }),
    false,
  );
  assert.equal(
    app.emergencyAutonomyDeclared({
      emergencyAutonomyHours: 2,
      emergencyEvidence: 'Ensayo 30/8',
    }),
    true,
  );
  assert.equal(
    app.emergencyAutonomyDeclared(
      app.normalizeProfile({
        emergencyAutonomyHours: null,
        emergencyEvidence: '',
      }),
    ),
    false,
  );
});

test('arquitecturas: JSON mantiene residencial y legado, sin quitar circuitos ni validaciones', () => {
  for (const architecture of [
    'essential',
    'balanced',
    'residential',
    'continuity',
  ]) {
    const panel = makePanel({
      architecture,
      circuits: [makeCircuit(1), makeCircuit(2, { kind: 'EMG' })],
    });
    const restored = app.normalizePanels(JSON.parse(JSON.stringify([panel])));
    assert.equal(restored[0].architecture, architecture);
    assert.equal(restored[0].circuits.length, 2);
    assert.equal(restored[0].circuits[1].kind, 'EMG');
  }
});

test('domiciliaria: advertencia global en salón, aunque el tablero activo sea otro; vivienda no la dispara', () => {
  const panel = makePanel();
  const child = makePanel({
    id: 'ts',
    type: 'TS',
    parentId: 'tp',
    architecture: 'residential',
    name: 'TS con ID único',
  });
  const panels = [panel, child];
  const calculations = calculatePanels(panels);
  const publicWarnings = calculateWarnings(
    panel,
    calculations.get('tp'),
    panel,
    panels,
    app.INITIAL_PROFILE,
    true,
  );
  assert.ok(
    publicWarnings.some(
      (w) => w.includes('TS con ID único') && w.includes('domiciliaria'),
    ),
  );
  const homeWarnings = calculateWarnings(
    child,
    calculations.get('ts'),
    panel,
    panels,
    app.INITIAL_PROFILE,
    false,
  );
  assert.ok(!homeWarnings.some((w) => w.includes('domiciliaria')));
  const printed = html(app.ProjectPrintSummary, {
    projectName: 'SALÓN',
    panels,
    calculations,
    publicVenue: true,
  });
  assert.ok(printed.includes('ADVERTENCIA: ID único domiciliario'));
});

test('2/3/1 equipos, presupuesto y reservas; TP de tránsito no duplica ID de los TS', () => {
  const p = makePanel({
    circuits: [
      makeCircuit(1),
      makeCircuit(2, { kind: 'TUG' }),
      makeCircuit(3, { kind: 'EMG' }),
    ],
  });
  const options = calculateCosts(p, [p], app.DEFAULT_PRICES);
  for (const [id, count] of [
    ['essential', 2],
    ['balanced', 3],
    ['residential', 1],
  ])
    assert.equal(options.find((o) => o.id === id).differentialCount, count);
  const transit = makePanel({ circuits: [] });
  const child = {
    ...p,
    id: 'ts',
    type: 'TS',
    parentId: 'tp',
    architecture: 'essential',
  };
  assert.equal(differentialGroups(transit).length, 0);
  assert.equal(differentialGroups(child).length, 2);
  const localCost = calculateCosts(
    transit,
    [transit, child],
    app.DEFAULT_PRICES,
  ).find((o) => o.id === transit.architecture);
  assert.equal(localCost.differentialCount, 0);
  const reserveOnly = makePanel({
    architecture: 'balanced',
    circuits: [makeCircuit(1)],
  });
  const unifilar = html(app.SingleLineDiagram, {
    panel: reserveOnly,
    calculation: calculatePanels([reserveOnly]).get('tp'),
  });
  assert.ok(unifilar.includes('ID B · 30 mA · reservado'));
  assert.ok(unifilar.includes('ID EMG · 30 mA · reservado'));
});

test('integración: página completa se renderiza sin navegador ni excepciones', () => {
  const result = html(pageModule.exports.default, {});
  assert.ok(result.includes('Memoria de cálculo'));
  assert.ok(result.includes('Rθ'));
  assert.ok(result.includes('Potencia activa instalada'));
  assert.ok(result.includes('Autonomía de emergencia'));
  assert.ok(result.includes('Económica · Salón'));
  assert.ok(result.includes('Equilibrada · Continuidad en salón'));
  assert.ok(result.includes('Esencial domiciliaria'));
  assert.ok(!result.includes('Legado · ID por circuito'));
});
