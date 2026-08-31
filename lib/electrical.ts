export const STANDARD_BREAKERS = [
  6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125,
];
export const COPPER_RESISTIVITY = 0.018;
export const COPPER_TEMPERATURE_COEFFICIENT = 0.00393;
export const DEFAULT_CONDUCTOR_TEMPERATURE_C = 70;
export const CABLE_REFERENCE_URL =
  'https://latam.prysmian.com/sites/latam.prysmian.com/files/media/documents/PRY2020_Superastic%20Jet.pdf';

// Prysmian Superastic Jet/Flex, ed. 2020 p.3: Cu/PVC70, unipolar in conduit,
// 40°C ambient, 2 loaded conductors + PE. NOT universal or an LS0H specification.
export const PRELIMINARY_CONDUCTOR_CAPACITY: Record<number, number> = {
  1.5: 15,
  2.5: 21,
  4: 28,
  6: 36,
  10: 50,
  16: 66,
  25: 88,
  35: 109,
};
const THREE_LOADED_CAPACITY: Record<number, number> = {
  1.5: 14,
  2.5: 18,
  4: 25,
  6: 32,
  10: 44,
  16: 59,
  25: 77,
  35: 96,
};
const COPPER_R20_OHM_KM: Record<number, number> = {
  1.5: 13.3,
  2.5: 7.98,
  4: 4.95,
  6: 3.3,
  10: 1.91,
  16: 1.21,
  25: 0.78,
  35: 0.554,
};

export type AmpacitySettings = {
  mode?: 'reference' | 'declared';
  ambientC?: 20 | 30 | 40;
  groupedCircuits?: 1 | 2 | 3;
  declaredA?: number;
  basis?: string;
  conductorTemperatureC?: 20 | 70 | 90;
};
export function conductorAmpacity(
  section: number,
  threeLoaded: boolean,
  settings: AmpacitySettings = {},
) {
  if (settings.mode === 'declared') {
    return Number.isFinite(settings.declaredA) &&
      settings.declaredA! > 0 &&
      settings.basis?.trim()
      ? settings.declaredA!
      : null;
  }
  const base = (
    threeLoaded ? THREE_LOADED_CAPACITY : PRELIMINARY_CONDUCTOR_CAPACITY
  )[section];
  const temperatureFactor = { 20: 1.29, 30: 1.15, 40: 1 }[
    settings.ambientC ?? 40
  ];
  const groupingFactor = { 1: 1, 2: 0.8, 3: 0.7 }[
    settings.groupedCircuits ?? 1
  ];
  return base && temperatureFactor && groupingFactor
    ? base * temperatureFactor * groupingFactor
    : null;
}

export function resistanceAtTemperature(
  section: number,
  temperatureC = DEFAULT_CONDUCTOR_TEMPERATURE_C,
) {
  const temperature = Number.isFinite(temperatureC)
    ? Math.min(90, Math.max(20, temperatureC))
    : DEFAULT_CONDUCTOR_TEMPERATURE_C;
  const r20 =
    COPPER_R20_OHM_KM[section] ??
    (COPPER_RESISTIVITY * 1000) / Math.max(section, 0.1);
  return (
    (r20 / 1000) * (1 + COPPER_TEMPERATURE_COEFFICIENT * (temperature - 20))
  );
}

export function activePower(circuit: {
  points: number;
  unitVA: number;
  powerFactor: number;
}) {
  return (
    Math.max(0, circuit.points) *
    Math.max(0, circuit.unitVA) *
    Math.min(1, Math.max(0, circuit.powerFactor))
  );
}

type Supply = 'mono' | 'tri';
type SinglePhase = 'L1' | 'L2' | 'L3';
type Phase = SinglePhase | '3Φ';
type PhaseLoads = Record<SinglePhase, number>;
const PHASES: SinglePhase[] = ['L1', 'L2', 'L3'];
type CircuitLoad = { id: number; points: number; unitVA: number; phase: Phase };
type PanelLoad<C extends CircuitLoad = CircuitLoad> = {
  id: string;
  type: 'TP' | 'TS';
  parentId?: string | null;
  supply: Supply;
  demandFactor: number;
  feederPhase?: Phase;
  circuits: C[];
};

function power(circuit: CircuitLoad) {
  return Math.max(0, circuit.points) * Math.max(0, circuit.unitVA);
}

/** Downstream demand at the TP; feeder phase assignments are never changed. */
export function downstreamPhaseDemand(
  panelId: string,
  panels: PanelLoad[],
): PhaseLoads {
  const totals: PhaseLoads = { L1: 0, L2: 0, L3: 0 };
  for (const child of panels) {
    if (child.type !== 'TS' || child.parentId !== panelId) continue;
    for (const circuit of child.circuits) {
      const demand = power(circuit) * child.demandFactor;
      if (child.supply === 'mono') {
        const phase =
          child.feederPhase === 'L2' || child.feederPhase === 'L3'
            ? child.feederPhase
            : 'L1';
        totals[phase] += demand;
      } else if (circuit.phase === '3Φ') {
        for (const phase of PHASES) totals[phase] += demand / 3;
      } else {
        totals[circuit.phase] += demand;
      }
    }
  }
  return totals;
}

/** Greedy balancing of local circuits using the same demand basis as the TP. */
export function balancePanelCircuits<C extends CircuitLoad>(
  panel: PanelLoad<C>,
  panels: PanelLoad[],
): C[] {
  if (panel.supply !== 'tri')
    return panel.circuits.map((circuit) => ({ ...circuit }));
  const fixed =
    panel.type === 'TP'
      ? downstreamPhaseDemand(panel.id, panels)
      : { L1: 0, L2: 0, L3: 0 };
  for (const circuit of panel.circuits.filter((item) => item.phase === '3Φ')) {
    for (const phase of PHASES)
      fixed[phase] += (power(circuit) * panel.demandFactor) / 3;
  }
  const baseline = { ...fixed };
  for (const circuit of panel.circuits) {
    if (circuit.phase !== '3Φ')
      baseline[circuit.phase] += power(circuit) * panel.demandFactor;
  }
  const totals = { ...fixed };
  const assignments = new Map<number, Phase>();
  const movable = panel.circuits
    .filter((circuit) => circuit.phase !== '3Φ')
    .sort((a, b) => power(b) - power(a) || a.id - b.id);
  for (const circuit of movable) {
    if (power(circuit) * panel.demandFactor === 0) continue;
    // Keep the existing phase when tied: zero-demand panels need not be shuffled.
    const preferred = circuit.phase as SinglePhase;
    const best = PHASES.reduce(
      (least, phase) => (totals[phase] < totals[least] ? phase : least),
      preferred,
    );
    assignments.set(circuit.id, best);
    totals[best] += power(circuit) * panel.demandFactor;
  }
  // A greedy result must not worsen an already better manual distribution.
  const spread = (loads: PhaseLoads) =>
    Math.max(...Object.values(loads)) - Math.min(...Object.values(loads));
  const worse =
    Math.max(...Object.values(totals)) >
      Math.max(...Object.values(baseline)) + 1e-9 ||
    spread(totals) > spread(baseline) + 1e-9;
  return panel.circuits.map((circuit) => ({
    ...circuit,
    phase: worse
      ? circuit.phase
      : (assignments.get(circuit.id) ?? circuit.phase),
  }));
}

/** Preliminary Ib/In/Iz check only. The 15% headroom is optional, not a rule. */
export function selectPreliminaryBreaker(
  current: number,
  capacity: number,
  existing: number,
): number | null {
  if (
    !Number.isFinite(current) ||
    current < 0 ||
    !Number.isFinite(capacity) ||
    capacity <= 0
  )
    return null;
  const feasible = STANDARD_BREAKERS.filter(
    (rating) => rating >= current && rating <= capacity,
  );
  if (feasible.includes(existing)) return existing;
  return (
    feasible.find((rating) => rating >= current * 1.15) ?? feasible[0] ?? null
  );
}

export type FeederDrop = {
  volts: number;
  percent: number;
  factor: number;
  referenceVoltage: number;
  model: 'balanced-three-phase' | 'phase-neutral' | 'mixed-estimate';
  resistanceOhmM: number;
  temperatureC: number;
};

/** Temperature-corrected resistive approximation, not a phasor/harmonic calculation.
 * For mixed 3-phase loads, use a phase-neutral envelope at the highest phase
 * current, with equal phase/neutral sections. See docs/calculation-limits.md.
 */
export function feederVoltageDrop(
  current: number,
  lengthM: number,
  conductor: number,
  supply: Supply,
  hasSinglePhaseLoads = true,
  temperatureC = DEFAULT_CONDUCTOR_TEMPERATURE_C,
): FeederDrop {
  const balanced = supply === 'tri' && !hasSinglePhaseLoads;
  temperatureC = Number.isFinite(temperatureC)
    ? Math.min(90, Math.max(20, temperatureC))
    : DEFAULT_CONDUCTOR_TEMPERATURE_C;
  const factor = balanced ? Math.sqrt(3) : 2;
  const referenceVoltage = balanced ? 380 : 220;
  const resistanceOhmM = resistanceAtTemperature(conductor, temperatureC);
  const volts =
    factor * Math.max(0, lengthM) * Math.max(0, current) * resistanceOhmM;
  return {
    volts,
    percent: (volts / referenceVoltage) * 100,
    factor,
    referenceVoltage,
    resistanceOhmM,
    temperatureC,
    model: balanced
      ? 'balanced-three-phase'
      : supply === 'tri'
        ? 'mixed-estimate'
        : 'phase-neutral',
  };
}

/** Never add line-line volts directly to phase-neutral volts. */
export function accumulatedVoltageDrop(
  terminal: { percent: number },
  feeder: { percent: number },
  referenceVoltage: number,
) {
  const percent = terminal.percent + feeder.percent;
  return { percent, volts: (percent * referenceVoltage) / 100 };
}
