'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  BookOpenCheck,
  Building2,
  Calculator,
  CheckCircle2,
  CircuitBoard,
  Copy,
  DollarSign,
  ExternalLink,
  FileSpreadsheet,
  FolderDown,
  FolderUp,
  Info,
  Layers,
  LayoutDashboard,
  Network,
  Plus,
  Printer,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingUp,
  Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Separator } from '@/components/ui/separator';
import {
  accumulatedVoltageDrop,
  activePower,
  balancePanelCircuits,
  conductorAmpacity,
  CABLE_REFERENCE_URL,
  DEFAULT_CONDUCTOR_TEMPERATURE_C,
  downstreamPhaseDemand,
  feederVoltageDrop,
  PRELIMINARY_CONDUCTOR_CAPACITY as CONDUCTOR_CAPACITY,
  selectPreliminaryBreaker,
  selectHeadDevice,
  circuitRequirements,
  feederRequirements,
  voltageDropCriteria,
  AEA_CONDUCTOR_REFERENCE_URL,
  STANDARD_BREAKERS,
  type FeederDrop,
  type AmpacitySettings,
} from '@/lib/electrical';
import { toExcelCsv } from '@/lib/csv';
import {
  buildPanelDevices,
  ARCHITECTURE_OPTIONS,
  LEGACY_ARCHITECTURE,
  architectureDetails,
  circuitModuleSpan,
  differentialGroups,
  differentialLabel,
  tpDifferentialDevice,
  layoutDin,
  protectiveConductorSection,
  PHASE_CONDUCTOR_COLORS,
} from '@/lib/panel-layout';
import {
  canDeletePanel,
  finiteNumber,
  highlightedCircuit,
  readStoredProject,
  safeCircuitId,
  nextCircuitId,
  normalizeCircuitIds,
  nextSectionalPanelNumber,
  saveStoredProjectIfUnchanged,
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  type ProjectStorageSnapshot,
} from '@/lib/project-data';
import { validateProjectStructure } from '@/lib/project-schema';

export type Supply = 'mono' | 'tri';
export type Phase = 'L1' | 'L2' | 'L3' | '3Φ';
export type CircuitKind = 'IUG' | 'TUG' | 'TUE' | 'EMG' | 'FM';
export type Architecture =
  | 'essential'
  | 'balanced'
  | 'residential'
  | 'continuity';
export type ExperienceMode = 'guided' | 'technical';
export type ProjectPreset = 'hall' | 'commercial' | 'residential' | 'custom';
export type WorkType = 'new' | 'remodel' | 'survey';
export type EvacuationClass = 'BD1' | 'BD2' | 'BD3' | 'BD4';
export type PanelType = 'TP' | 'TS';
export type DifferentialType = 'AC' | 'A';
export type TpDifferentialMode = 'none' | 'selective300' | 'instant30';
export type FeederWiring =
  | 'classII-underground'
  | 'classII-conduit'
  | 'other'
  | 'pending';
export type InteriorCableStandard = 'iram62267' | 'other' | 'pending';

export type ProjectProfile = {
  preset: ProjectPreset;
  workType: WorkType;
  widthM: number;
  lengthM: number;
  occupancy: number;
  evacuation: EvacuationClass;
  prospectiveShortCircuitKa: number;
  breakingCapacityKa: number;
  groundResistanceOhm: number;
  planScale: '1:50' | '1:100';
  descriptiveMemoryReady: boolean;
  registeredProfessionalReady: boolean;
  siteTestReady: boolean;
  emergencyAutonomyHours?: number;
  emergencyEvidence?: string;
  emergencySystem?: EmergencySystem;
  interiorCableStandard: InteriorCableStandard;
};

export type EmergencySystem = 'centralized' | 'autonomous';

export type Circuit = {
  id: number;
  name: string;
  kind: CircuitKind;
  points: number;
  unitVA: number;
  phase: Phase;
  powerFactor: number;
  breaker: number;
  conductor: number;
  lengthM: number;
  modules: number;
  ampacity?: AmpacitySettings;
  conduit?: string;
};

export type CircuitTemplate = Omit<Circuit, 'id' | 'name' | 'phase'> & {
  label: string;
  shortName: string;
};

export type Panel = {
  id: string;
  name: string;
  type: PanelType;
  parentId?: string | null;
  supply: Supply;
  demandFactor: number;
  reservePercent: number;
  modulesPerRow: number;
  architecture: Architecture;
  includeDps?: boolean;
  differentialType?: DifferentialType;
  tpDifferentialMode?: TpDifferentialMode;
  circuits: Circuit[];
  feederLengthM?: number;
  feederConductor?: number;
  feederBreaker?: number;
  feederPhase?: Phase;
  feederAmpacity?: AmpacitySettings;
  feederConduit?: string;
  feederWiring?: FeederWiring;
};

export type PanelCalculation = {
  ownInstalledVA: number;
  installedVA: number;
  demandVA: number;
  mainCurrent: number;
  mainBreaker: number | null;
  currentBasedBreaker: number | null;
  maxBranchBreaker: number;
  baseModules: number;
  occupiedModules: number;
  recommendedModules: number;
  rows: number;
  cabinetModules: number;
  phaseVA: { L1: number; L2: number; L3: number };
  phaseCurrent: { L1: number; L2: number; L3: number };
  imbalance: number;
  widthMm: number;
  heightMm: number;
  feederDrop: FeederDrop;
  activeInstalledW: number;
};

export type PriceCatalog = {
  mcb2P: number;
  mcb4P: number;
  rcd2P: number;
  rcd4P: number;
  spd2P: number;
  spd4P: number;
  cabinet16: number;
  cabinet18: number;
  cabinet24: number;
  cabinet36: number;
  cabinet54: number;
  cabinet72: number;
  typeAPremium: number;
  accessoriesPercent: number;
  assemblyPercent: number;
  selectiveRcd2P: number;
  selectiveRcd4P: number;
};

export type CostLine = { label: string; value: number };
export type PanelDevice = {
  key: string;
  circuitId?: number;
  label: string;
  fullName: string;
  detail: string;
  span: number;
  className: string;
};

export type CostOption = {
  id: Architecture;
  title: string;
  subtitle: string;
  modules: number;
  cabinetLabel: string;
  material: number;
  total: number;
  continuity: string;
  protection: string;
  differentialCount: number;
  nominalCount: number | null;
  groups: { label: string; circuits: string[] }[];
  lines: CostLine[];
};

const INITIAL_PROFILE: ProjectProfile = {
  preset: 'hall',
  workType: 'new',
  widthM: 24,
  lengthM: 10,
  occupancy: 120,
  evacuation: 'BD3',
  prospectiveShortCircuitKa: 3,
  breakingCapacityKa: 6,
  groundResistanceOhm: 3,
  planScale: '1:100',
  descriptiveMemoryReady: false,
  registeredProfessionalReady: false,
  siteTestReady: false,
  emergencySystem: 'centralized',
  interiorCableStandard: 'iram62267',
};

const DEFAULT_PRICES: PriceCatalog = {
  mcb2P: 10995,
  mcb4P: 29995,
  rcd2P: 41132,
  rcd4P: 98995,
  spd2P: 81186,
  spd4P: 193708,
  cabinet16: 31000,
  cabinet18: 41500,
  cabinet24: 55333,
  cabinet36: 83000,
  cabinet54: 124500,
  cabinet72: 166000,
  typeAPremium: 35,
  accessoriesPercent: 12,
  assemblyPercent: 20,
  selectiveRcd2P: 0,
  selectiveRcd4P: 0,
};

const PRICE_SOURCES = [
  {
    label: 'Térmica SICA 2P curva C',
    detail: '$10.995 · 4,5 kA',
    href: 'https://easy.com.ar/electricidad/termicas-y-diferenciales',
  },
  {
    label: 'Térmica SICA 4P 40 A',
    detail: '$29.995 · 4,5 kA',
    href: 'https://www.easy.com.ar/interruptor-termom-4x40a-sica-4-5-ka/p',
  },
  {
    label: 'Diferencial SICA 2P 40 A',
    detail: '$41.131,50 · 30 mA · clase AC',
    href: 'https://easy.com.ar/interruptor-difer-2x40a-30ma--sica/p',
  },
  {
    label: 'Diferencial SICA 4P 63 A',
    detail: '$98.995 · 30 mA',
    href: 'https://easy.com.ar/electricidad/termicas-y-diferenciales',
  },
  {
    label: 'DPS CHINT tetrapolar',
    detail: '$193.708 · 65 kA · contado',
    href: 'https://www.electromisiones.com.ar/183-protectores_de_tension',
  },
  {
    label: 'Gabinete Genrod 36 módulos',
    detail: '$83.000 · embutir',
    href: 'https://easy.com.ar/gabinete-36p-p-embutir-q-energy-genrod/p',
  },
  {
    label: 'Cable IMSA 2,5 mm² · 100 m',
    detail: '$114.390 · referencia fuera del tablero',
    href: 'https://www.easy.com.ar/unipol-2-5bl-plastix-cf--x100m/p',
  },
  {
    label: 'Cable Prysmian Afumex 2,5 mm²',
    detail: '$126.995 · baja emisión de humos/halógenos',
    href: 'https://www.easy.com.ar/unipolar-2-5-negro-afumex-750-x-100m/p',
  },
];

const TEMPLATES: Record<CircuitKind, CircuitTemplate> = {
  IUG: {
    label: 'Iluminación general',
    shortName: 'Iluminación',
    kind: 'IUG',
    points: 10,
    unitVA: 100,
    powerFactor: 0.95,
    breaker: 10,
    conductor: 1.5,
    lengthM: 24,
    modules: 2,
  },
  TUG: {
    label: 'Tomacorrientes generales',
    shortName: 'Tomacorrientes',
    kind: 'TUG',
    points: 8,
    unitVA: 220,
    powerFactor: 0.9,
    breaker: 20,
    conductor: 2.5,
    lengthM: 20,
    modules: 2,
  },
  TUE: {
    label: 'Uso especial / dedicado',
    shortName: 'Uso especial',
    kind: 'TUE',
    points: 1,
    unitVA: 2500,
    powerFactor: 0.9,
    breaker: 20,
    conductor: 4,
    lengthM: 20,
    modules: 2,
  },
  EMG: {
    label: 'Iluminación de emergencia',
    shortName: 'Emergencia',
    kind: 'EMG',
    points: 6,
    unitVA: 20,
    powerFactor: 0.95,
    breaker: 10,
    conductor: 1.5,
    lengthM: 24,
    modules: 2,
  },
  FM: {
    label: 'Fuerza motriz',
    shortName: 'Fuerza motriz',
    kind: 'FM',
    points: 1,
    unitVA: 1500,
    powerFactor: 0.85,
    breaker: 16,
    conductor: 2.5,
    lengthM: 20,
    modules: 2,
  },
};

const INITIAL_CIRCUITS_TP: Circuit[] = [
  {
    id: 1,
    name: 'Iluminación salón principal',
    kind: 'IUG',
    points: 12,
    unitVA: 100,
    phase: 'L1',
    powerFactor: 0.95,
    breaker: 10,
    conductor: 1.5,
    lengthM: 24,
    modules: 2,
  },
  {
    id: 2,
    name: 'Tomacorrientes salón',
    kind: 'TUG',
    points: 10,
    unitVA: 220,
    phase: 'L2',
    powerFactor: 0.9,
    breaker: 20,
    conductor: 2.5,
    lengthM: 20,
    modules: 2,
  },
  {
    id: 3,
    name: 'Luces y carteles de emergencia',
    kind: 'EMG',
    points: 8,
    unitVA: 20,
    phase: 'L3',
    powerFactor: 0.95,
    breaker: 10,
    conductor: 1.5,
    lengthM: 24,
    modules: 2,
  },
  {
    id: 4,
    name: 'Audio y multimedia',
    kind: 'TUE',
    points: 1,
    unitVA: 1800,
    phase: 'L1',
    powerFactor: 0.9,
    breaker: 16,
    conductor: 2.5,
    lengthM: 18,
    modules: 2,
  },
];

const INITIAL_PANELS: Panel[] = [
  {
    id: 'tp',
    name: 'Tablero Principal (TP)',
    type: 'TP',
    parentId: null,
    supply: 'tri',
    demandFactor: 0.8,
    reservePercent: 25,
    modulesPerRow: 18,
    architecture: 'balanced',
    includeDps: true,
    differentialType: 'A',
    tpDifferentialMode: 'none',
    circuits: [],
  },
  {
    id: 'ts1',
    name: 'TS1 · Tablero interior de la iglesia',
    type: 'TS',
    parentId: 'tp',
    supply: 'tri',
    demandFactor: 0.8,
    reservePercent: 25,
    modulesPerRow: 18,
    architecture: 'balanced',
    includeDps: false,
    differentialType: 'A',
    feederLengthM: 15,
    feederConductor: 6,
    feederBreaker: 32,
    feederPhase: '3Φ',
    feederWiring: 'classII-underground',
    feederConduit: 'Cable IRAM 2178 en tendido subterráneo; verificar instalación y envolventes Clase II.',
    circuits: INITIAL_CIRCUITS_TP,
  },
];

function createPanelId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

// One review for the TS and its outgoing feeder in the TP. Never changes ratings.
function reviewFeeder(panel: Panel, calculation: PanelCalculation) {
  const breaker = panel.feederBreaker ?? 32;
  const section = panel.feederConductor ?? 6;
  const capacity = conductorAmpacity(
    section,
    panel.supply === 'tri',
    panel.feederAmpacity,
  );
  const current = calculation.mainCurrent;
  const issues: string[] = [];
  const minimumSection = feederRequirements().minimumSectionMm2;
  if (minimumSection !== null && section < minimumSection)
    issues.push(
      `La sección ${section} mm² es inferior al mínimo de ${minimumSection} mm² para el alimentador.`,
    );
  if (current > breaker)
    issues.push(
      `La térmica de ${breaker} A es menor que Ib ${formatNumber(current, 1)} A: el alimentador no alcanza para la demanda.`,
    );
  if (capacity === null) {
    issues.push('Falta una Iz de diseño válida y su fuente/condiciones.');
  } else {
    if (current > capacity)
      issues.push(
        `La demanda supera Iz ${formatNumber(capacity, 1)} A del cable de ${section} mm². No aumentar solo la térmica: revisar cable y demanda.`,
      );
    if (breaker > capacity)
      issues.push(
        `La térmica de ${breaker} A supera Iz ${formatNumber(capacity, 1)} A del cable de ${section} mm²: protección contra sobrecarga incompatible.`,
      );
  }
  if (calculation.feederDrop.percent > 1)
    issues.push(
      `Caída del alimentador ${formatNumber(calculation.feederDrop.percent, 2)} %: supera el criterio de diseño del 1 %.`,
    );
  return { breaker, section, capacity, current, issues };
}

function formatPower(va: number) {
  return va >= 1000
    ? `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(va / 1000)} kVA`
    : `${Math.round(va)} VA`;
}

function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));
}

function cabinetFor(modules: number, prices: PriceCatalog) {
  if (modules <= 16) return { label: '16 M', value: prices.cabinet16 };
  if (modules <= 18) return { label: '18 M', value: prices.cabinet18 };
  if (modules <= 24) return { label: '24 M', value: prices.cabinet24 };
  if (modules <= 36) return { label: '36 M', value: prices.cabinet36 };
  if (modules <= 54) return { label: '54 M', value: prices.cabinet54 };
  if (modules <= 72) return { label: '72 M', value: prices.cabinet72 };
  const cabinets = Math.ceil(modules / 72);
  return { label: `${cabinets} × 72 M`, value: cabinets * prices.cabinet72 };
}

function architectureOccupiedModules(
  architecture: Architecture,
  supply: Supply,
  circuits: Circuit[],
  childPanels: Panel[] = [],
  includeDps = true,
) {
  return buildPanelDevices(
    {
      id: 'dimensionado',
      name: '',
      type: 'TP',
      supply,
      architecture,
      includeDps,
      circuits,
    },
    childPanels,
    0,
  ).reduce((sum, device) => sum + device.span, 0);
}

function circuitPower(circuit: Circuit) {
  return Math.max(0, circuit.points) * Math.max(0, circuit.unitVA);
}

function circuitCurrent(circuit: Circuit, supply: Supply) {
  const voltage = circuit.phase === '3Φ' && supply === 'tri' ? 380 : 220;
  const divisor = circuit.phase === '3Φ' && supply === 'tri' ? Math.sqrt(3) : 1;
  return circuitPower(circuit) / (divisor * voltage);
}

function voltageDrop(circuit: Circuit, supply: Supply) {
  const current = circuitCurrent(circuit, supply);
  const threePhase = circuit.phase === '3Φ' && supply === 'tri';
  return feederVoltageDrop(
    current,
    circuit.lengthM,
    circuit.conductor,
    threePhase ? 'tri' : 'mono',
    false,
    circuit.ampacity?.conductorTemperatureC ?? DEFAULT_CONDUCTOR_TEMPERATURE_C,
  );
}

function projectCircuits(preset: ProjectPreset): Circuit[] {
  const base = INITIAL_CIRCUITS_TP.map((circuit) => ({ ...circuit }));
  if (preset === 'hall') return base;
  if (preset === 'commercial') {
    return [
      { ...base[0], name: 'Iluminación salón de ventas', points: 14 },
      { ...base[1], name: 'Tomacorrientes generales', points: 12 },
      { ...base[2], name: 'Luces de emergencia y salida', points: 6 },
      {
        ...base[3],
        name: 'Aire acondicionado / equipo',
        unitVA: 2500,
        breaker: 20,
        conductor: 4,
      },
    ];
  }
  if (preset === 'residential') {
    return [
      { ...base[0], name: 'Iluminación general PB', points: 10 },
      { ...base[1], name: 'Tomacorrientes generales', points: 10 },
      {
        ...base[3],
        id: 3,
        name: 'Cocina y tomas especiales',
        unitVA: 2500,
        breaker: 20,
        conductor: 4,
        phase: 'L1',
      },
    ];
  }
  return base;
}

function phaseColor(phase: Phase) {
  return {
    L1: 'bg-amber-900',
    L2: 'bg-neutral-900',
    L3: 'bg-red-600',
    '3Φ': 'bg-violet-500',
  }[phase];
}

function physicalCircuitPhase(panel: Panel, circuit: Circuit): Phase {
  if (
    panel.type === 'TS' &&
    panel.supply === 'mono' &&
    ['L1', 'L2', 'L3'].includes(String(panel.feederPhase))
  )
    return panel.feederPhase as Phase;
  return circuit.phase;
}

function circuitPhaseLabel(panel: Panel, circuit: Circuit) {
  const physical = physicalCircuitPhase(panel, circuit);
  return panel.type === 'TS' && panel.supply === 'mono' && physical !== 'L1'
    ? `L1 local · ${physical} en TP`
    : circuit.phase;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function panelHasDps(panel: Panel) {
  return panel.includeDps ?? panel.type === 'TP';
}

function panelDifferentialType(panel: Panel): DifferentialType {
  return panel.differentialType === 'AC' ? 'AC' : 'A';
}

function panelTpDifferentialMode(panel: Panel): TpDifferentialMode {
  return panel.type === 'TP' &&
    ['selective300', 'instant30'].includes(String(panel.tpDifferentialMode))
    ? (panel.tpDifferentialMode as TpDifferentialMode)
    : 'none';
}

function isClassIIFeeder(panel: Panel) {
  return (
    panel.feederWiring === 'classII-underground' ||
    panel.feederWiring === 'classII-conduit'
  );
}

function feederWiringLabel(panel: Panel) {
  if (panel.feederWiring === 'classII-underground')
    return 'Clase II · cable IRAM 2178 subterráneo';
  if (panel.feederWiring === 'classII-conduit')
    return 'Clase II · cañería y envolventes aislantes';
  if (panel.feederWiring === 'other') return 'Sin condición Clase II declarada';
  return 'Condición de aislación pendiente';
}

function panelDifferentialCount(panel: Panel) {
  return differentialGroups(panel).length +
    (tpDifferentialDevice(panel) ? 1 : 0);
}

function normalizePrices(value: unknown): PriceCatalog {
  const raw = isRecord(value) ? value : {};
  return Object.fromEntries(
    Object.entries(DEFAULT_PRICES).map(([key, fallback]) => [
      key,
      finiteNumber(
        raw[key],
        fallback,
        0,
        key.endsWith('Percent') || key === 'typeAPremium' ? 1000 : 1e12,
      ),
    ]),
  ) as PriceCatalog;
}

function normalizeProfile(value: unknown): ProjectProfile {
  const raw = isRecord(value) ? value : {};
  return {
    preset: ['hall', 'commercial', 'residential', 'custom'].includes(
      String(raw.preset),
    )
      ? (raw.preset as ProjectPreset)
      : INITIAL_PROFILE.preset,
    workType: ['new', 'remodel', 'survey'].includes(String(raw.workType))
      ? (raw.workType as WorkType)
      : INITIAL_PROFILE.workType,
    widthM: finiteNumber(raw.widthM, INITIAL_PROFILE.widthM, 1),
    lengthM: finiteNumber(raw.lengthM, INITIAL_PROFILE.lengthM, 1),
    occupancy: Math.round(
      finiteNumber(raw.occupancy, INITIAL_PROFILE.occupancy, 1),
    ),
    evacuation: ['BD1', 'BD2', 'BD3', 'BD4'].includes(String(raw.evacuation))
      ? (raw.evacuation as EvacuationClass)
      : INITIAL_PROFILE.evacuation,
    prospectiveShortCircuitKa: finiteNumber(
      raw.prospectiveShortCircuitKa,
      INITIAL_PROFILE.prospectiveShortCircuitKa,
      0,
    ),
    breakingCapacityKa: finiteNumber(
      raw.breakingCapacityKa,
      INITIAL_PROFILE.breakingCapacityKa,
      0,
    ),
    groundResistanceOhm: finiteNumber(
      raw.groundResistanceOhm,
      INITIAL_PROFILE.groundResistanceOhm,
      0,
    ),
    planScale: raw.planScale === '1:50' ? '1:50' : '1:100',
    descriptiveMemoryReady: raw.descriptiveMemoryReady === true,
    registeredProfessionalReady: raw.registeredProfessionalReady === true,
    siteTestReady: raw.siteTestReady === true,
    emergencyAutonomyHours: finiteNumber(raw.emergencyAutonomyHours, 0, 0, 168),
    emergencyEvidence:
      typeof raw.emergencyEvidence === 'string'
        ? raw.emergencyEvidence.slice(0, 1000)
        : '',
    emergencySystem: ['centralized', 'autonomous'].includes(
      String(raw.emergencySystem),
    )
      ? (raw.emergencySystem as EmergencySystem)
      : INITIAL_PROFILE.emergencySystem ?? 'centralized',
    interiorCableStandard: ['iram62267', 'other'].includes(
      String(raw.interiorCableStandard),
    )
      ? (raw.interiorCableStandard as InteriorCableStandard)
      : 'pending',
  };
}

function normalizeAmpacity(value: unknown): AmpacitySettings {
  const raw = isRecord(value) ? value : {};
  const mode = raw.mode === 'declared' ? 'declared' : 'reference';
  return {
    mode,
    ambientC: [20, 30, 40].includes(Number(raw.ambientC))
      ? (Number(raw.ambientC) as 20 | 30 | 40)
      : 40,
    groupedCircuits: [1, 2, 3].includes(Number(raw.groupedCircuits))
      ? (Number(raw.groupedCircuits) as 1 | 2 | 3)
      : 1,
    conductorTemperatureC:
      mode === 'declared' && raw.conductorTemperatureC === 90
        ? 90
        : raw.conductorTemperatureC === 20
          ? 20
          : 70,
    declaredA: finiteNumber(raw.declaredA, 0, 0, 10000),
    basis: typeof raw.basis === 'string' ? raw.basis.slice(0, 1000) : '',
  };
}

function normalizeCircuit(
  value: unknown,
  index: number,
  supply: Supply,
): Circuit {
  const raw = isRecord(value) ? value : {};
  const kind = ['IUG', 'TUG', 'TUE', 'EMG', 'FM'].includes(String(raw.kind))
    ? (raw.kind as CircuitKind)
    : 'IUG';
  const template = TEMPLATES[kind];
  const requestedPhase = ['L1', 'L2', 'L3', '3Φ'].includes(String(raw.phase))
    ? (raw.phase as Phase)
    : 'L1';
  const phase = supply === 'mono' ? 'L1' : requestedPhase;
  const requestedBreaker = finiteNumber(raw.breaker, template.breaker, 1);
  const breaker = requestedBreaker;
  const requestedConductor = finiteNumber(
    raw.conductor,
    template.conductor,
    0.1,
  );
  const conductor = CONDUCTOR_CAPACITY[requestedConductor]
    ? requestedConductor
    : template.conductor;

  return {
    id: safeCircuitId(raw.id, index + 1),
    name:
      typeof raw.name === 'string' && raw.name.trim()
        ? raw.name.trim()
        : `${template.shortName} ${index + 1}`,
    kind,
    points: Math.round(finiteNumber(raw.points, template.points, 0)),
    unitVA: finiteNumber(raw.unitVA, template.unitVA, 0),
    phase,
    powerFactor: finiteNumber(raw.powerFactor, template.powerFactor, 0.1, 1),
    breaker,
    conductor,
    lengthM: finiteNumber(raw.lengthM, template.lengthM, 0),
    modules: circuitModuleSpan({
      phase,
      modules: finiteNumber(raw.modules, template.modules, 2, 8),
    }),
    ampacity: normalizeAmpacity(raw.ampacity),
    conduit: typeof raw.conduit === 'string' ? raw.conduit.slice(0, 300) : '',
  };
}

function normalizePanels(value: unknown): Panel[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (value.some((entry) => !isRecord(entry) || !Array.isArray(entry.circuits) || entry.circuits.some((circuit: unknown) => !isRecord(circuit)))) return null;
  const records = value as Record<string, unknown>[];
  const tpRecords = records.filter((item) => item.type === 'TP');
  if (tpRecords.length !== 1) return null;

  const usedIds = new Set<string>();
  const normalized = records.map((raw, panelIndex) => {
    const type: PanelType = raw.type === 'TP' ? 'TP' : 'TS';
    const fallbackId = type === 'TP' ? 'tp' : `ts-${panelIndex}`;
    let id =
      typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : fallbackId;
    while (usedIds.has(id)) id = `${id}-${panelIndex + 1}`;
    usedIds.add(id);
    const supply: Supply = raw.supply === 'mono' ? 'mono' : 'tri';
    const circuits = normalizeCircuitIds((raw.circuits as unknown[]).map((circuit, index) => normalizeCircuit(circuit, index, supply)));
    const feederPhase: Phase =
      supply === 'tri'
        ? '3Φ'
        : ['L1', 'L2', 'L3'].includes(String(raw.feederPhase))
          ? (raw.feederPhase as Phase)
          : 'L1';

    return {
      id,
      name:
        typeof raw.name === 'string' && raw.name.trim()
          ? raw.name.trim()
          : type === 'TP'
            ? 'Tablero Principal (TP)'
            : `TS${panelIndex} · Tablero Seccional`,
      type,
      parentId:
        type === 'TP'
          ? null
          : typeof raw.parentId === 'string'
            ? raw.parentId
            : null,
      supply,
      demandFactor: finiteNumber(
        raw.demandFactor,
        type === 'TP' ? 0.8 : 0.85,
        0.1,
        1,
      ),
      reservePercent: finiteNumber(raw.reservePercent, 25, 20, 80),
      modulesPerRow: [12, 16, 18, 24].includes(Number(raw.modulesPerRow))
        ? Number(raw.modulesPerRow)
        : 18,
      architecture: [
        'essential',
        'balanced',
        'residential',
        'continuity',
      ].includes(String(raw.architecture))
        ? (raw.architecture as Architecture)
        : 'balanced',
      includeDps:
        typeof raw.includeDps === 'boolean' ? raw.includeDps : type === 'TP',
      differentialType: raw.differentialType === 'AC' ? 'AC' : 'A',
      tpDifferentialMode:
        type === 'TP' &&
        ['selective300', 'instant30'].includes(String(raw.tpDifferentialMode))
          ? (raw.tpDifferentialMode as TpDifferentialMode)
          : 'none',
      circuits,
      feederLengthM:
        type === 'TS' ? finiteNumber(raw.feederLengthM, 15, 1) : undefined,
      feederConductor:
        type === 'TS' && CONDUCTOR_CAPACITY[Number(raw.feederConductor)]
          ? Number(raw.feederConductor)
          : type === 'TS'
            ? 6
            : undefined,
      feederBreaker:
        type === 'TS'
          ? finiteNumber(raw.feederBreaker, 32, 1)
          : undefined,
      feederPhase: type === 'TS' ? feederPhase : undefined,
      feederAmpacity:
        type === 'TS' ? normalizeAmpacity(raw.feederAmpacity) : undefined,
      feederConduit:
        typeof raw.feederConduit === 'string'
          ? raw.feederConduit.slice(0, 300)
          : '',
      feederWiring:
        type === 'TS' &&
        [
          'classII-underground',
          'classII-conduit',
          'other',
          'pending',
        ].includes(String(raw.feederWiring))
          ? (raw.feederWiring as FeederWiring)
          : type === 'TS'
            ? 'pending'
            : undefined,
    } satisfies Panel;
  });

  const tp = normalized.find((panel) => panel.type === 'TP');
  if (!tp) return null;
  return normalized.map((panel) => {
    if (panel.type !== 'TS') return panel;
    if (tp.supply === 'mono') {
      return {
        ...panel,
        parentId: tp.id,
        supply: 'mono',
        feederPhase: 'L1',
        circuits: panel.circuits.map((circuit) => ({
          ...circuit,
          phase: 'L1' as Phase,
        })),
      };
    }
    return { ...panel, parentId: tp.id };
  });
}

function normalizeProject(value: unknown, legacy = false) {
  const result = validateProjectStructure(value, { legacy });
  if (!result.ok) throw new Error(result.error);
  const data = result.data;
  const sourcePanels = legacy ? [{ ...INITIAL_PANELS[0], ...data, id: 'tp', type: 'TP', parentId: null }] : data.panels;
  const panels = normalizePanels(sourcePanels);
  if (!panels) throw new Error('Proyecto sin TP válido');
  return {
    panels,
    profile: normalizeProfile(data.profile),
    prices: normalizePrices(data.prices),
    projectName: typeof data.projectName === 'string' && data.projectName.trim() ? data.projectName.trim() : 'Proyecto importado',
    experienceMode: (data.experienceMode === 'technical' ? 'technical' : 'guided') as ExperienceMode,
    activePanelId: panels.some((panel) => panel.id === data.activePanelId) ? String(data.activePanelId) : panels[0].id,
  };
}

function ratingLabel(value: number | null | undefined) { return value == null ? 'Sin dimensionar' : `${value} A`; }

function diagnosePanel(activePanel: Panel, calculations: PanelCalculation, panels: Panel[], panelCalculations: Map<string, PanelCalculation>) {
  const tpPanel = panels.find((panel) => panel.type === 'TP') ?? activePanel;
    const messages: string[] = [];
    activePanel.circuits.forEach((circuit, index) => {
      const circuitNumber = index + 1;
      if (
        (circuit.kind === 'IUG' || circuit.kind === 'TUG') &&
        circuit.points > 15
      ) {
        messages.push(
          `C${circuitNumber}: supera el criterio conservador de 15 bocas.`,
        );
      }
      if (circuit.kind === 'TUE' && circuit.points > 12) {
        messages.push(
          `C${circuitNumber}: supera el límite reglamentario de 12 bocas para TUE (AEA 771, Tabla 771.13.I).`,
        );
      }
      if (circuitCurrent(circuit, activePanel.supply) > circuit.breaker) {
        messages.push(
          `C${circuitNumber}: la corriente estimada supera la protección seleccionada.`,
        );
      }
      const minimum = circuitRequirements(circuit.kind).minimumSectionMm2;
      if (minimum !== null && circuit.conductor < minimum) messages.push(`C${circuitNumber}: sección ${circuit.conductor} mm² inferior al mínimo de ${minimum} mm² para ${circuit.kind}; revisar el circuito.`);
      const cableCapacity = conductorAmpacity(
        circuit.conductor,
        circuit.phase === '3Φ',
        circuit.ampacity,
      );
      if (!cableCapacity) {
        messages.push(
          `C${circuitNumber}: no hay capacidad preliminar para la sección seleccionada.`,
        );
      } else if (circuit.breaker > cableCapacity) {
        messages.push(
          `C${circuitNumber}: la térmica de ${circuit.breaker} A supera Iz preliminar ${cableCapacity} A; revisar sección y protección.`,
        );
      }
      const circuitDropPercent = voltageDrop(
        circuit,
        activePanel.supply,
      ).percent;
      const totalDropPercent =
        circuitDropPercent +
        (activePanel.type === 'TS' ? calculations.feederDrop.percent : 0);
      const criteria = voltageDropCriteria(activePanel.type, circuit.kind);
      const terminalLimit = criteria.terminalLimitPercent;
      const totalLimit = criteria.totalLimitPercent;
      if (circuitDropPercent > terminalLimit) {
        messages.push(
          `C${circuitNumber}: caída del circuito ${circuitDropPercent.toFixed(1)} %; supera el criterio de diseño de ${terminalLimit} % desde el ${activePanel.type}.`,
        );
      }
      if (circuitDropPercent > 2)
        messages.push(
          `C${circuitNumber}: además supera el 2 % indicado para cables de circuitos por la Ord. 72/83, III.2.9.4. Confirmar el criterio municipal del expediente.`,
        );
      if (totalDropPercent > totalLimit) {
        messages.push(
          `C${circuitNumber}: caída total estimada ${totalDropPercent.toFixed(1)} % (circuito + alimentador); supera ${totalLimit} %.`,
        );
      }
    });

    const feeders =
      activePanel.type === 'TS'
        ? [activePanel]
        : panels.filter(
            (panel) => panel.type === 'TS' && panel.parentId === activePanel.id,
          );
    for (const feeder of feeders) {
      const feederCalculation = panelCalculations.get(feeder.id);
      if (feederCalculation)
        messages.push(
          ...reviewFeeder(feeder, feederCalculation).issues.map(
            (issue) => `Alimentador a ${feeder.name}: ${issue}`,
          ),
        );
    }

    if (activePanel.type === 'TS') {
      const feederBreaker = activePanel.feederBreaker ?? 32;
      const maxTerminalBreaker = activePanel.circuits.reduce(
        (maximum, circuit) => Math.max(maximum, circuit.breaker),
        0,
      );
      if (feederBreaker < maxTerminalBreaker) {
        messages.push(
          `Alimentador: revisar selectividad; su térmica de ${feederBreaker} A es menor que una protección terminal de ${maxTerminalBreaker} A.`,
        );
      }
      if (tpPanel.supply === 'mono' && activePanel.supply === 'tri') {
        messages.push(
          'Incompatibilidad: un TP monofásico no puede alimentar un TS trifásico.',
        );
      }
      if (
        activePanel.supply === 'mono' &&
        tpPanel.supply === 'tri' &&
        !['L1', 'L2', 'L3'].includes(String(activePanel.feederPhase))
      ) {
        messages.push(
          'Alimentador monofásico: seleccionar la fase L1, L2 o L3 del TP.',
        );
      }
    }

    if (calculations.imbalance > 0.2) {
      messages.push('El desbalance de fases estimado supera el 20 %.');
    }
    if (calculations.mainBreaker === null) {
      messages.push(
        'Cabecera sin dimensionar: demanda o protección requerida fuera del rango modelado (125 A), o datos de alimentador incompletos.',
      );
    }
    return messages;
}

function diagnoseProject(panels: Panel[], profile: ProjectProfile, isPublicVenue: boolean) {
  const messages: string[] = [];
    const tp = panels.find((panel) => panel.type === 'TP');
    const sectionalPanels = tp
      ? panels.filter(
          (panel) => panel.type === 'TS' && panel.parentId === tp.id,
        )
      : [];
    if (profile.breakingCapacityKa < profile.prospectiveShortCircuitKa) {
      messages.push(
        'El poder de corte declarado es menor que la corriente de cortocircuito presunta.',
      );
    }
    if (profile.groundResistanceOhm > 10) {
      messages.push(
        'La resistencia de puesta a tierra supera 10 Ω, máximo indicado por la Ordenanza 72/83.',
      );
    }
    const isAutonomousEmergency = profile.emergencySystem === 'autonomous';
    if (
      isPublicVenue &&
      !isAutonomousEmergency &&
      !panels.some((panel) =>
        panel.circuits.some((circuit) => circuit.kind === 'EMG'),
      )
    ) {
      messages.push(
        'El proyecto de pública concurrencia no tiene ningún circuito de iluminación de emergencia (o seleccione modalidad de equipos autónomos si corresponde).',
      );
    }
    if (
      isPublicVenue &&
      isAutonomousEmergency &&
      !panels.some((panel) =>
        panel.circuits.some((circuit) => circuit.kind === 'IUG'),
      )
    ) {
      messages.push(
        'Emergencia autónoma: falta al menos un circuito de iluminación normal (IUG) para alimentar los cargadores de las luminarias autónomas.',
      );
    }
    if (isPublicVenue) {
      if (profile.interiorCableStandard !== 'iram62267')
        messages.push(
          'Pública concurrencia: falta declarar cables interiores LSOH de baja emisión de humos y libres de halógenos (IRAM 62267) o justificar otra especificación con el profesional y la inspección.',
        );
      if (tp?.circuits.length)
        messages.push(
          'El TP del pilar conserva circuitos terminales. Para continuidad de servicio, revisar su traslado a un tablero interior con diferenciales sectorizados.',
        );
      for (const panel of panels.filter(
        (item) => item.architecture === 'residential' && item.circuits.length,
      )) {
        messages.push(
          `${panel.name}: arquitectura domiciliaria de ID único en pública concurrencia. No separa iluminación/tomas ni emergencia; revisar AEA 718 y Ordenanza 72/83. No se considera una solución validada para este salón.`,
        );
      }
    }
    if (tp && sectionalPanels.length) {
      const tpMode = panelTpDifferentialMode(tp);
      const allFeedersClassII = sectionalPanels.every(isClassIIFeeder);
      if (tpMode === 'instant30')
        messages.push(
          'Riesgo de corte total: un diferencial instantáneo de 30 mA en el TP queda aguas arriba de los diferenciales interiores y puede apagar toda la instalación. Revisar selectividad y exigencias de la autoridad.',
        );
      if (tpMode === 'none' && !allFeedersClassII)
        messages.push(
          'TP sin diferencial general: al menos una línea seccional no tiene condición Clase II documentada. Confirmar protección contra contactos indirectos y criterio de la autoridad.',
        );
      if (tpMode === 'selective300')
        messages.push(
          'TP con diferencial selectivo de 300 mA: documentar curvas, tiempos y coordinación con los diferenciales de 30 mA aguas abajo; la etiqueta Tipo S no demuestra selectividad por sí sola.',
        );
    }
    if (isPublicVenue && !emergencyAutonomyDeclared(profile))
      messages.push(
        isAutonomousEmergency
          ? 'Emergencia autónoma: falta declarar autonomía ≥2 h y ficha técnica de los bloques autónomos (IRAM-AADL J 2027).'
          : 'Emergencia: falta declarar autonomía ≥2 h y una referencia de ensayo/ficha. Un circuito EMG no demuestra autonomía ni iluminancia.',
      );
    return messages;
}

export default function Home() {
  const [experienceMode, setExperienceMode] =
    useState<ExperienceMode>('guided');
  const [profile, setProfile] = useState<ProjectProfile>(INITIAL_PROFILE);
  const [projectName, setProjectName] = useState('IGLESIA · SALÓN 24 × 10 m');
  const [panels, setPanels] = useState<Panel[]>(INITIAL_PANELS);
  const [activePanelId, setActivePanelId] = useState<string>('ts1');
  const [prices, setPrices] = useState<PriceCatalog>(DEFAULT_PRICES);
  const [optimizationMessage, setOptimizationMessage] = useState('');
  const [persistenceReady, setPersistenceReady] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [hoveredCircuitId, setHoveredCircuitId] = useState<number | null>(null);
  const [selectedCircuitId, setSelectedCircuitId] = useState<number | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storageSnapshotRef = useRef<ProjectStorageSnapshot | null>(null);
  const navigationRef = useRef({ activePanelId, experienceMode });
  useEffect(() => { navigationRef.current = { activePanelId, experienceMode }; }, [activePanelId, experienceMode]);

  function applyProject(project: ReturnType<typeof normalizeProject>) {
    setPanels(project.panels);
    setProfile(project.profile);
    setPrices(project.prices);
    setProjectName(project.projectName);
    setExperienceMode(project.experienceMode);
    setActivePanelId(project.activePanelId);
  }

  function reloadSavedProject() {
    if (!window.confirm('Se descartarán los cambios de esta pestaña. Exportá primero el JSON si querés conservarlos. ¿Cargar el proyecto guardado?')) return;
    const stored = readStoredProject(() => window.localStorage);
    try {
      if (stored.error || !stored.data) throw new Error(stored.error ?? 'No hay proyecto guardado.');
      const project = normalizeProject(stored.data, stored.legacy);
      storageSnapshotRef.current = stored.snapshot;
      applyProject(project);
      setPersistenceError(null);
      setStorageBlocked(false);
    } catch (error) { setPersistenceError(error instanceof Error ? error.message : 'No se pudo cargar el proyecto.'); }
  }

  // Active panel helper
  const activePanel = useMemo(() => {
    return (
      panels.find((p) => p.id === activePanelId) ??
      panels[0] ??
      INITIAL_PANELS[0]
    );
  }, [panels, activePanelId]);
  const tpPanel = useMemo(
    () =>
      panels.find((panel) => panel.type === 'TP') ??
      panels[0] ??
      INITIAL_PANELS[0],
    [panels],
  );

  // Restore only complete, validated projects; leave invalid stored bytes untouched.
  useEffect(() => {
    const stored = readStoredProject(() => window.localStorage);
    storageSnapshotRef.current = stored.snapshot;
    let error = stored.error;
    let restored: ReturnType<typeof normalizeProject> | null = null;
    if (stored.data) {
      try { restored = normalizeProject(stored.data, stored.legacy); }
      catch (failure) { error = `Guardado inválido; no se sobrescribió. ${failure instanceof Error ? failure.message : ''} Exportá una copia antes de reemplazarlo.`; }
    }
    queueMicrotask(() => {
      if (restored) applyProject(restored);
      setPersistenceError(error);
      setStorageBlocked(Boolean(error));
      setPersistenceReady(true);
    });
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setSelectedCircuitId(null);
      setHoveredCircuitId(null);
    });
  }, [activePanelId]);

  // Navigation never writes a project. Web Locks serialize cooperating tabs;
  // comparison against the loaded snapshot rejects stale writers.
  useEffect(() => {
    if (!persistenceReady || storageBlocked) return;
    let cancelled = false;
    const save = () => {
      if (cancelled) return;
      const result = saveStoredProjectIfUnchanged(() => window.localStorage, {
        version: '3.0', ...navigationRef.current, profile, projectName, panels, prices,
      }, storageSnapshotRef.current);
      if (result.ok) storageSnapshotRef.current = result.snapshot;
      queueMicrotask(() => {
        if (cancelled) return;
        setPersistenceError(result.ok ? null : result.error);
        if (!result.ok) setStorageBlocked(true);
      });
    };
    if (navigator.locks) void navigator.locks.request(STORAGE_KEY, save).catch(() => {
      if (!cancelled) { setPersistenceError('No se pudo bloquear el guardado. Exportá el JSON para conservar los cambios.'); setStorageBlocked(true); }
    });
    else save();
    return () => { cancelled = true; };
  }, [panels, persistenceReady, prices, profile, projectName, storageBlocked]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== STORAGE_KEY && event.key !== LEGACY_STORAGE_KEY) return;
      const latest = readStoredProject(() => window.localStorage);
      if (JSON.stringify(latest.snapshot) === JSON.stringify(storageSnapshotRef.current)) return;
      setStorageBlocked(true);
      setPersistenceError('Otra pestaña cambió el proyecto guardado. El guardado automático está pausado. Exportá los cambios de esta pestaña o cargá la versión guardada.');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Panel mutations
  const updateActivePanel = <K extends keyof Panel>(
    key: K,
    value: Panel[K],
  ) => {
    setOptimizationMessage('');
    if (key === 'reservePercent')
      value = finiteNumber(value, 25, 20, 80) as Panel[K];
    setPanels((current) =>
      current.map((p) => {
        if (p.id !== activePanel.id) return p;
        const next = { ...p, [key]: value };
        if (
          key === 'feederConductor' &&
          value !== p.feederConductor &&
          next.feederAmpacity?.mode === 'declared'
        )
          next.feederAmpacity = {
            ...next.feederAmpacity,
            declaredA: 0,
            basis: '',
          };
        return next;
      }),
    );
  };

  const changePanelSupply = (panelId: string, nextSupply: Supply) => {
    setOptimizationMessage('');
    const targetPanel = panels.find((panel) => panel.id === panelId);
    if (
      targetPanel?.type === 'TS' &&
      nextSupply === 'tri' &&
      tpPanel.supply === 'mono'
    ) {
      setOptimizationMessage(
        'No se puede alimentar un TS trifásico desde un TP monofásico.',
      );
      return;
    }
    setPanels((current) => {
      const target = current.find((panel) => panel.id === panelId);
      const currentTp = current.find((panel) => panel.type === 'TP');
      if (!target || !currentTp) return current;

      return current.map((panel) => {
        const isTarget = panel.id === panelId;
        const mustFollowMonoTp =
          target.type === 'TP' && nextSupply === 'mono' && panel.type === 'TS';
        if (!isTarget && !mustFollowMonoTp) return panel;
        const normalizedSupply = mustFollowMonoTp ? 'mono' : nextSupply;
        return {
          ...panel,
          supply: normalizedSupply,
          feederAmpacity:
            panel.feederAmpacity?.mode === 'declared'
              ? { ...panel.feederAmpacity, declaredA: 0, basis: '' }
              : panel.feederAmpacity,
          feederPhase:
            panel.type === 'TS'
              ? normalizedSupply === 'tri'
                ? '3Φ'
                : mustFollowMonoTp
                  ? 'L1'
                  : panel.feederPhase === 'L2' || panel.feederPhase === 'L3'
                    ? panel.feederPhase
                    : 'L1'
              : undefined,
          circuits:
            normalizedSupply === 'mono'
              ? panel.circuits.map((circuit) => ({
                  ...circuit,
                  phase: 'L1' as Phase,
                  modules: 2,
                  ampacity:
                    circuit.ampacity?.mode === 'declared'
                      ? { ...circuit.ampacity, declaredA: 0, basis: '' }
                      : circuit.ampacity,
                }))
              : panel.circuits,
        };
      });
    });
  };

  const addSectionalPanel = () => {
    setOptimizationMessage('');
    const nextIndex = nextSectionalPanelNumber(panels);
    const newId = createPanelId('ts');
    const newPanel: Panel = {
      id: newId,
      name: `TS${nextIndex} · Tablero Seccional`,
      type: 'TS',
      parentId: tpPanel.id,
      supply: tpPanel.supply,
      demandFactor: 0.85,
      reservePercent: 25,
      modulesPerRow: 18,
      architecture:
        profile.preset === 'residential' ? 'residential' : 'balanced',
      includeDps: false,
      differentialType: profile.preset === 'residential' ? 'AC' : 'A',
      feederLengthM: 15,
      feederConductor: 6,
      feederBreaker: 32,
      feederPhase: tpPanel.supply === 'tri' ? '3Φ' : 'L1',
      feederWiring: 'pending',
      circuits: [
        {
          id: 1,
          name: `Iluminación TS${nextIndex}`,
          kind: 'IUG',
          points: 8,
          unitVA: 100,
          phase: 'L1',
          powerFactor: 0.95,
          breaker: 10,
          conductor: 1.5,
          lengthM: 18,
          modules: 2,
        },
        {
          id: 2,
          name: `Tomacorrientes TS${nextIndex}`,
          kind: 'TUG',
          points: 6,
          unitVA: 220,
          phase: tpPanel.supply === 'mono' ? 'L1' : 'L2',
          powerFactor: 0.9,
          breaker: 20,
          conductor: 2.5,
          lengthM: 15,
          modules: 2,
        },
      ],
    };
    setPanels((current) => [...current, newPanel]);
    setActivePanelId(newId);
  };

  const duplicatePanel = (panel: Panel) => {
    setOptimizationMessage('');
    const newId = createPanelId('ts');
    const nextIndex = nextSectionalPanelNumber(panels);
    const duplicated: Panel = {
      ...panel,
      id: newId,
      name: `TS${nextIndex} · ${panel.name.replace(/^TS\d+\s*·\s*/, '')} (Copia)`,
      type: 'TS',
      parentId: tpPanel.id,
      circuits: panel.circuits.map((circuit) => ({ ...circuit })),
    };
    setPanels((current) => [...current, duplicated]);
    setActivePanelId(newId);
  };

  const deletePanel = (id: string) => {
    if (!canDeletePanel(panels, id)) return;
    setOptimizationMessage('');
    const remaining = panels.filter((p) => p.id !== id);
    setPanels(remaining);
    if (activePanelId === id) {
      setActivePanelId(remaining[0].id);
    }
  };

  // Calculations per panel
  const panelCalculations = useMemo(() => {
    const map = new Map<string, PanelCalculation>();
    const rootPanel = panels.find((panel) => panel.type === 'TP');
    const childPanelsForTP = rootPanel
      ? panels.filter(
          (panel) => panel.type === 'TS' && panel.parentId === rootPanel.id,
        )
      : [];

    panels.forEach((panel) => {
      const isTP = panel.type === 'TP';
      const ownInstalledVA = panel.circuits.reduce(
        (total, circuit) => total + circuitPower(circuit),
        0,
      );

      // For TP: aggregate demand from all child sectional panels
      let childDemandVA = 0;
      if (isTP) {
        childPanelsForTP.forEach((child) => {
          const childOwnInstalledVA = child.circuits.reduce(
            (total, c) => total + circuitPower(c),
            0,
          );
          childDemandVA += childOwnInstalledVA * child.demandFactor;
        });
      }

      const installedVA =
        ownInstalledVA +
        (isTP
          ? childPanelsForTP.reduce(
              (total, child) =>
                total +
                child.circuits.reduce(
                  (sum, circuit) => sum + circuitPower(circuit),
                  0,
                ),
              0,
            )
          : 0);
      const demandVA = ownInstalledVA * panel.demandFactor + childDemandVA;
      const activeInstalledW =
        panel.circuits.reduce((sum, circuit) => sum + activePower(circuit), 0) +
        (isTP
          ? childPanelsForTP.reduce(
              (sum, child) =>
                sum +
                child.circuits.reduce(
                  (total, circuit) => total + activePower(circuit),
                  0,
                ),
              0,
            )
          : 0);
      const phaseVA = { L1: 0, L2: 0, L3: 0 };

      panel.circuits.forEach((circuit) => {
        const power = circuitPower(circuit);
        // For TP, apply its own demandFactor directly into phaseVA
        const adjustedPower = isTP ? power * panel.demandFactor : power;
        if (circuit.phase === '3Φ') {
          phaseVA.L1 += adjustedPower / 3;
          phaseVA.L2 += adjustedPower / 3;
          phaseVA.L3 += adjustedPower / 3;
        } else {
          phaseVA[circuit.phase] += adjustedPower;
        }
      });

      // For TP: also distribute child panel loads into phase balance
      if (isTP) {
        const downstream = downstreamPhaseDemand(panel.id, childPanelsForTP);
        phaseVA.L1 += downstream.L1;
        phaseVA.L2 += downstream.L2;
        phaseVA.L3 += downstream.L3;
      }

      // For TP: phaseVA already includes demand factors, so divide by 220 directly
      // For TS: phaseVA is raw power, so multiply by demandFactor
      const phaseCurrent = {
        L1: (phaseVA.L1 * (isTP ? 1 : panel.demandFactor)) / 220,
        L2: (phaseVA.L2 * (isTP ? 1 : panel.demandFactor)) / 220,
        L3: (phaseVA.L3 * (isTP ? 1 : panel.demandFactor)) / 220,
      };
      const mainCurrent =
        panel.supply === 'tri'
          ? Math.max(phaseCurrent.L1, phaseCurrent.L2, phaseCurrent.L3)
          : demandVA / 220;
      const maxOutgoingBreaker = panel.circuits.reduce(
        (max, c) => Math.max(max, c.breaker),
        0,
      );
      const maxFeederBreaker = isTP
        ? childPanelsForTP.reduce(
            (max, c) => Math.max(max, c.feederBreaker ?? 0),
            0,
          )
        : 0;
      const maxBranchBreaker = Math.max(maxOutgoingBreaker, maxFeederBreaker);
      const head = selectHeadDevice({ type: panel.type, current: mainCurrent, maxBranchBreaker, feederBreaker: panel.feederBreaker });
      const currentBasedBreaker = head.currentBasedRating;
      const mainBreaker = head.rating;
      const includeDps = panelHasDps(panel);
      const baseModules = architectureOccupiedModules(
        panel.architecture,
        panel.supply,
        [],
        [],
        includeDps,
      );
      const layout = layoutDin(
        buildPanelDevices(panel, isTP ? childPanelsForTP : [], mainBreaker),
        panel.modulesPerRow,
        panel.reservePercent,
      );
      const { occupiedModules, recommendedModules, rows, cabinetModules } =
        layout;

      const phaseValues = Object.values(phaseVA);
      const averagePhase =
        phaseValues.reduce((sum, value) => sum + value, 0) / 3;
      const imbalance =
        panel.supply === 'tri' && averagePhase > 0
          ? Math.max(
              ...phaseValues.map((value) => Math.abs(value - averagePhase)),
            ) / averagePhase
          : 0;

      const feederDrop =
        panel.type === 'TS'
          ? feederVoltageDrop(
              mainCurrent,
              panel.feederLengthM ?? 15,
              panel.feederConductor ?? 6,
              panel.supply,
              panel.circuits.some((circuit) => circuit.phase !== '3Φ'),
              panel.feederAmpacity?.conductorTemperatureC ??
                DEFAULT_CONDUCTOR_TEMPERATURE_C,
            )
          : feederVoltageDrop(0, 0, 6, 'mono');

      map.set(panel.id, {
        ownInstalledVA,
        installedVA,
        demandVA,
        mainCurrent,
        mainBreaker,
        currentBasedBreaker,
        maxBranchBreaker,
        baseModules,
        occupiedModules,
        recommendedModules,
        rows,
        cabinetModules,
        phaseVA,
        phaseCurrent,
        imbalance,
        widthMm: panel.modulesPerRow * 18 + 80,
        heightMm: rows * 150 + 80,
        feederDrop,
        activeInstalledW,
      });
    });

    return map;
  }, [panels]);

  const calculations = useMemo(() => {
    return (
      panelCalculations.get(activePanel.id) ?? {
        ownInstalledVA: 0,
        installedVA: 0,
        demandVA: 0,
        mainCurrent: 0,
        mainBreaker: 25,
        currentBasedBreaker: 25,
        maxBranchBreaker: 0,
        baseModules: 12,
        occupiedModules: 0,
        recommendedModules: 0,
        rows: 1,
        cabinetModules: 18,
        phaseVA: { L1: 0, L2: 0, L3: 0 },
        phaseCurrent: { L1: 0, L2: 0, L3: 0 },
        imbalance: 0,
        widthMm: 404,
        heightMm: 230,
        feederDrop: feederVoltageDrop(0, 0, 6, 'mono'),
        activeInstalledW: 0,
      }
    );
  }, [panelCalculations, activePanel.id]);

  // Global totals
  const globalSummary = useMemo(() => {
    const rootPanel = panels.find((panel) => panel.type === 'TP');
    const tpCalc = rootPanel ? panelCalculations.get(rootPanel.id) : undefined;
    const fallbackInstalled = panels.reduce(
      (total, panel) =>
        total + (panelCalculations.get(panel.id)?.ownInstalledVA ?? 0),
      0,
    );
    const fallbackDemand = panels.reduce(
      (total, panel) =>
        total + (panelCalculations.get(panel.id)?.demandVA ?? 0),
      0,
    );
    return {
      totalInstalledVA: tpCalc?.installedVA ?? fallbackInstalled,
      totalDemandVA: tpCalc?.demandVA ?? fallbackDemand,
      totalPanels: panels.length,
      tpMainBreaker: tpCalc ? tpCalc.mainBreaker : calculations.mainBreaker,
    };
  }, [calculations, panelCalculations, panels]);

  const isPublicVenue =
    profile.preset === 'hall' ||
    profile.occupancy >= 50 ||
    profile.evacuation !== 'BD1';
  const projectArea =
    Math.max(0, profile.widthM) * Math.max(0, profile.lengthM);
  const areaPerPerson =
    profile.occupancy > 0 ? projectArea / profile.occupancy : 0;

  const projectDiagnostics = useMemo(() => diagnoseProject(panels, profile, isPublicVenue), [panels, profile, isPublicVenue]);
  const panelDiagnostics = useMemo(() => new Map(panels.map((panel) => [panel.id, diagnosePanel(panel, panelCalculations.get(panel.id)!, panels, panelCalculations)])), [panels, panelCalculations]);
  const warnings = useMemo(() => [...(panelDiagnostics.get(activePanel.id) ?? []), ...projectDiagnostics], [activePanel.id, panelDiagnostics, projectDiagnostics]);
  const projectWarnings = useMemo(() => [...projectDiagnostics, ...panels.flatMap((panel) => (panelDiagnostics.get(panel.id) ?? []).map((message) => `${panel.name}: ${message}`))], [panels, panelDiagnostics, projectDiagnostics]);

  const costOptions = useMemo<CostOption[]>(() => {
    const children =
      activePanel.type === 'TP'
        ? panels.filter(
            (panel) => panel.type === 'TS' && panel.parentId === activePanel.id,
          )
        : [];
    const differentialType = panelDifferentialType(activePanel);
    const typeFactor =
      differentialType === 'A' ? 1 + prices.typeAPremium / 100 : 1;
    // Keep legacy quotes readable without offering this mode as a new choice.
    return [...ARCHITECTURE_OPTIONS, LEGACY_ARCHITECTURE].map(
      (definition): CostOption => {
        const panel = { ...activePanel, architecture: definition.id };
        const groups = differentialGroups(panel);
        const layout = layoutDin(
          buildPanelDevices(panel, children, 0),
          panel.modulesPerRow,
          panel.reservePercent,
        );
        const cabinet = cabinetFor(layout.cabinetModules, prices);
        const tpDifferential = tpDifferentialDevice(panel);
        const lines: CostLine[] = [
          { label: `Gabinete DIN (${cabinet.label})`, value: cabinet.value },
          {
            label: `${panel.type === 'TP' ? 'IGA' : 'Corte local'} ${panel.supply === 'tri' ? '4P' : '2P'}`,
            value: panel.supply === 'tri' ? prices.mcb4P : prices.mcb2P,
          },
          {
            label: `${groups.length} diferenciales · tipo ${differentialType}`,
            value: groups.reduce(
              (sum, group) =>
                sum +
                (group.span === 4 ? prices.rcd4P : prices.rcd2P) * typeFactor,
              0,
            ),
          },
          {
            label: `Térmicas de circuitos (${panel.circuits.length})`,
            value: panel.circuits.reduce(
              (sum, circuit) =>
                sum + (circuit.phase === '3Φ' ? prices.mcb4P : prices.mcb2P),
              0,
            ),
          },
        ];
        if (tpDifferential)
          lines.splice(2, 0, {
            label:
              panelTpDifferentialMode(panel) === 'selective300'
                ? 'Diferencial general TP 300 mA · Tipo S'
                : 'Diferencial general TP 30 mA · instantáneo',
            value:
              panelTpDifferentialMode(panel) === 'selective300'
                ? panel.supply === 'tri'
                  ? prices.selectiveRcd4P
                  : prices.selectiveRcd2P
                : (panel.supply === 'tri' ? prices.rcd4P : prices.rcd2P) *
                  typeFactor,
          });
        if (panelHasDps(panel))
          lines.splice(2, 0, {
            label: `DPS ${panel.supply === 'tri' ? '3P+N' : '1P+N'} transitorias`,
            value: panel.supply === 'tri' ? prices.spd4P : prices.spd2P,
          });
        if (children.length)
          lines.push({
            label: `Térmicas alimentadores TS (${children.length})`,
            value: children.reduce(
              (sum, child) =>
                sum + (child.supply === 'tri' ? prices.mcb4P : prices.mcb2P),
              0,
            ),
          });
        const material = lines.reduce((sum, line) => sum + line.value, 0);
        return {
          id: definition.id,
          title: definition.title,
          subtitle: definition.subtitle,
          differentialCount: groups.length,
          nominalCount: definition.nominalCount,
          groups: groups.map((group) => ({
            label: group.label,
            circuits: group.circuits.map(
              (circuit) =>
                `C${panel.circuits.findIndex((item) => item.id === circuit.id) + 1} · ${circuit.name}`,
            ),
          })),
          modules: layout.occupiedModules,
          cabinetLabel: cabinet.label,
          material,
          total:
            material *
            (1 + prices.accessoriesPercent / 100) *
            (1 + prices.assemblyPercent / 100),
          protection:
            definition.id === 'residential'
              ? 'Un grupo común. Destinada a vivienda; no validada para pública concurrencia.'
              : 'Separación de emergencia. No certifica por sí sola AEA 718 ni un mínimo reglamentario.',
          continuity: definition.behavior,
          lines,
        };
      },
    );
  }, [activePanel, panels, prices]);

  const selectedCost = useMemo(() => {
    return (
      costOptions.find((option) => option.id === activePanel.architecture) ??
      costOptions[1]
    );
  }, [activePanel.architecture, costOptions]);

  const recommendedCost = useMemo(() => {
    return isPublicVenue
      ? (costOptions.find((option) => option.id === 'balanced') ??
          costOptions[1])
      : (costOptions.find((option) => option.id === 'residential') ??
          costOptions[0]);
  }, [costOptions, isPublicVenue]);

  const projectCostSummary = useMemo(() => {
    const byPanel = panels.map((panel) => {
      const children =
        panel.type === 'TP'
          ? panels.filter(
              (child) => child.type === 'TS' && child.parentId === panel.id,
            )
          : [];
      const cabinet = cabinetFor(
        layoutDin(
          buildPanelDevices(panel, children, 0),
          panel.modulesPerRow,
          panel.reservePercent,
        ).cabinetModules,
        prices,
      );
      const head = panel.supply === 'tri' ? prices.mcb4P : prices.mcb2P;
      const spd = panel.supply === 'tri' ? prices.spd4P : prices.spd2P;
      const typeFactor =
        panelDifferentialType(panel) === 'A'
          ? 1 + prices.typeAPremium / 100
          : 1;
      const rcd2P = prices.rcd2P * typeFactor;
      const rcd4P = prices.rcd4P * typeFactor;
      const differentialCost = differentialGroups(panel).reduce(
        (sum, group) => sum + (group.span === 4 ? rcd4P : rcd2P),
        0,
      );
      const tpDifferentialCost = tpDifferentialDevice(panel)
        ? panelTpDifferentialMode(panel) === 'selective300'
          ? panel.supply === 'tri'
            ? prices.selectiveRcd4P
            : prices.selectiveRcd2P
          : panel.supply === 'tri'
            ? rcd4P
            : rcd2P
        : 0;
      const terminalBreakers = panel.circuits.reduce(
        (total, circuit) =>
          total + (circuit.phase === '3Φ' ? prices.mcb4P : prices.mcb2P),
        0,
      );
      const feederBreakers = children.reduce(
        (total, child) =>
          total + (child.supply === 'tri' ? prices.mcb4P : prices.mcb2P),
        0,
      );
      const material =
        cabinet.value +
        head +
        (panelHasDps(panel) ? spd : 0) +
        tpDifferentialCost +
        differentialCost +
        terminalBreakers +
        feederBreakers;
      const total =
        material *
        (1 + prices.accessoriesPercent / 100) *
        (1 + prices.assemblyPercent / 100);
      return { id: panel.id, name: panel.name, material, total };
    });
    return {
      byPanel,
      material: byPanel.reduce((sum, item) => sum + item.material, 0),
      total: byPanel.reduce((sum, item) => sum + item.total, 0),
    };
  }, [panels, prices]);

  const selectedDrivers = useMemo(() => {
    return [...selectedCost.lines]
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  }, [selectedCost.lines]);

  const complianceItems = useMemo(() => {
    return [
      ...(isPublicVenue
        ? [
            {
              group: 'AEA 90364-7-718 · pública concurrencia',
              label: 'Cables interiores LSOH · IRAM 62267',
              ready: profile.interiorCableStandard === 'iram62267',
              action:
                profile.interiorCableStandard === 'iram62267'
                  ? 'Especificación declarada; verificar marcación, certificación y alcance en obra.'
                  : 'Falta declarar la especificación LSOH o justificar otra solución con el profesional y la inspección.',
            },
            {
              group: 'Ordenanza 72/83 · III.2.22',
              label: 'Autonomía de emergencia ≥2 h declarada',
              ready: emergencyAutonomyDeclared(profile),
              action: emergencyAutonomyDeclared(profile)
                ? `${profile.emergencyAutonomyHours} h · ${profile.emergencyEvidence}. Evidencia declarada, no validada.`
                : 'Faltan duración y referencia de ensayo/ficha. La presencia de EMG no verifica autonomía ni lux.',
            },
          ]
        : []),
      {
        group: 'Municipalidad de San Rafael',
        label: 'Plano a escala verificado',
        ready: false,
        action: `Escala solicitada: ${profile.planScale}. El selector no genera ni verifica un plano a escala; falta comprobar el plano de planta y la admisibilidad de esa escala.`,
      },
      {
        group: 'Ordenanza 72/83',
        label: 'Puesta a tierra ≤ 10 Ω',
        ready: profile.groundResistanceOhm <= 10,
        action:
          profile.groundResistanceOhm <= 10
            ? `${profile.groundResistanceOhm} Ω declarado`
            : 'Supera el límite de 10 Ω',
      },
      {
        group: 'AEA 90364-7-771/718',
        label: 'Poder de corte declarado ≥ Ik declarada',
        ready: profile.breakingCapacityKa >= profile.prospectiveShortCircuitKa,
        action: `${profile.breakingCapacityKa} kA adoptado / ${profile.prospectiveShortCircuitKa} kA presunto. Comparación de datos ingresados; falta respaldar Ik y la selección del equipo.`,
      },
      {
        group: 'Expediente municipal',
        label: 'Memoria descriptiva y planos visados',
        ready: profile.descriptiveMemoryReady,
        action: profile.descriptiveMemoryReady
          ? 'Memoria lista'
          : 'Falta redactar la memoria descriptiva',
      },
      {
        group: 'Matriculación y firma',
        label: 'Profesional habilitado (COPA / COPIG)',
        ready: profile.registeredProfessionalReady,
        action: profile.registeredProfessionalReady
          ? 'Profesional asignado'
          : 'Falta designar profesional firmante',
      },
      {
        group: 'Ensayos y verificación',
        label: 'Resistencia de aislamiento y continuidad',
        ready: profile.siteTestReady,
        action: profile.siteTestReady
          ? 'Ensayos listos'
          : 'Falta asentar protocolo de medición',
      },
    ];
  }, [profile, isPublicVenue]);

  function updateProfile<K extends keyof ProjectProfile>(
    key: K,
    value: ProjectProfile[K],
  ) {
    setProfile((current) => normalizeProfile({ ...current, [key]: value }));
  }

  function applyPreset(preset: ProjectPreset) {
    if (preset === 'custom') {
      updateProfile('preset', preset);
      return;
    }
    const nextCircuits = projectCircuits(preset);
    const existingInterior = panels.find((panel) => panel.type === 'TS');
    const interiorId = existingInterior?.id ?? createPanelId('ts');
    const config = {
      hall: {
        name: 'IGLESIA · SALÓN 24 × 10 m',
        widthM: 24,
        lengthM: 10,
        occupancy: 120,
        evacuation: 'BD3' as EvacuationClass,
        supply: 'tri' as Supply,
        architecture: 'balanced' as Architecture,
        differentialType: 'A' as DifferentialType,
        interiorCableStandard: 'iram62267' as InteriorCableStandard,
      },
      commercial: {
        name: 'LOCAL COMERCIAL · 12 × 8 m',
        widthM: 12,
        lengthM: 8,
        occupancy: 40,
        evacuation: 'BD2' as EvacuationClass,
        supply: 'tri' as Supply,
        architecture: 'balanced' as Architecture,
        differentialType: 'A' as DifferentialType,
        interiorCableStandard: 'iram62267' as InteriorCableStandard,
      },
      residential: {
        name: 'VIVIENDA UNIFAMILIAR',
        widthM: 10,
        lengthM: 8,
        occupancy: 5,
        evacuation: 'BD1' as EvacuationClass,
        supply: 'mono' as Supply,
        architecture: 'residential' as Architecture,
        differentialType: 'AC' as DifferentialType,
        interiorCableStandard: 'other' as InteriorCableStandard,
      },
    }[preset];

    setProfile((current) => ({
      ...current,
      preset,
      widthM: config.widthM,
      lengthM: config.lengthM,
      occupancy: config.occupancy,
      evacuation: config.evacuation,
      interiorCableStandard: config.interiorCableStandard,
    }));
    setProjectName(config.name);
    setPanels((current) => {
      const next = current.map((panel) => {
        if (panel.type === 'TP') {
          return {
            ...panel,
            supply: config.supply,
            architecture: config.architecture,
            includeDps: true,
            differentialType: config.differentialType,
            tpDifferentialMode: 'none' as TpDifferentialMode,
            circuits: [],
          };
        }
        if (panel.id === interiorId) {
          return {
            ...panel,
            name:
              preset === 'hall'
                ? 'TS1 · Tablero interior de la iglesia'
                : panel.name,
            parentId: tpPanel.id,
            supply: config.supply,
            architecture: config.architecture,
            differentialType: config.differentialType,
            feederPhase: config.supply === 'tri' ? ('3Φ' as Phase) : ('L1' as Phase),
            feederWiring: 'classII-conduit' as FeederWiring,
            circuits: nextCircuits.map((circuit) => ({
              ...circuit,
              phase: config.supply === 'mono' ? ('L1' as Phase) : circuit.phase,
              modules:
                config.supply === 'mono'
                  ? Math.min(circuit.modules, 2)
                  : circuit.modules,
            })),
          };
        }
        if (config.supply === 'mono') {
          return {
            ...panel,
            supply: 'mono' as Supply,
            feederPhase: 'L1' as Phase,
            circuits: panel.circuits.map((circuit) => ({
              ...circuit,
              phase: 'L1' as Phase,
              modules: Math.min(circuit.modules, 2),
              ampacity:
                circuit.ampacity?.mode === 'declared'
                  ? { ...circuit.ampacity, declaredA: 0, basis: '' }
                  : circuit.ampacity,
            })),
            feederAmpacity:
              panel.feederAmpacity?.mode === 'declared'
                ? { ...panel.feederAmpacity, declaredA: 0, basis: '' }
                : panel.feederAmpacity,
          };
        }
        return panel;
      });
      if (!existingInterior)
        next.push({
          id: interiorId,
          name:
            preset === 'hall'
              ? 'TS1 · Tablero interior de la iglesia'
              : 'TS1 · Tablero interior',
          type: 'TS',
          parentId: tpPanel.id,
          supply: config.supply,
          demandFactor: 0.85,
          reservePercent: 25,
          modulesPerRow: 18,
          architecture: config.architecture,
          includeDps: false,
          differentialType: config.differentialType,
          feederLengthM: 15,
          feederConductor: 6,
          feederBreaker: 32,
          feederPhase: config.supply === 'tri' ? '3Φ' : 'L1',
          feederWiring: 'classII-conduit',
          circuits: nextCircuits.map((circuit) => ({
            ...circuit,
            phase: config.supply === 'mono' ? ('L1' as Phase) : circuit.phase,
            modules:
              config.supply === 'mono'
                ? Math.min(circuit.modules, 2)
                : circuit.modules,
          })),
        });
      return next;
    });
    setActivePanelId(interiorId);
    setOptimizationMessage(
      'Preajuste aplicado: TP de tránsito y circuitos terminales en el tablero interior.',
    );
  }

  function updateCircuit<K extends keyof Circuit>(
    id: number,
    key: K,
    value: Circuit[K],
  ) {
    updateActivePanel(
      'circuits',
      activePanel.circuits.map((circuit) => {
        if (circuit.id !== id) return circuit;
        const next = { ...circuit, [key]: value };
        if (
          (key === 'conductor' || key === 'phase') &&
          value !== circuit[key] &&
          next.ampacity?.mode === 'declared'
        )
          next.ampacity = { ...next.ampacity, declaredA: 0, basis: '' };
        next.modules = circuitModuleSpan(next);
        return next;
      }),
    );
  }

  function addCircuit(kind: CircuitKind) {
    const template = TEMPLATES[kind];
    const newId = nextCircuitId(activePanel.circuits.map((item) => item.id));
    const defaultPhase: Phase =
      activePanel.supply === 'mono'
        ? 'L1'
        : (['L1', 'L2', 'L3'] as const)[activePanel.circuits.length % 3];

    const newCircuit: Circuit = {
      id: newId,
      name: `${template.shortName} ${activePanel.circuits.filter((item) => item.kind === kind).length + 1}`,
      kind,
      points: template.points,
      unitVA: template.unitVA,
      phase: defaultPhase,
      powerFactor: template.powerFactor,
      breaker: template.breaker,
      conductor: template.conductor,
      lengthM: template.lengthM,
      modules: template.modules,
    };
    updateActivePanel('circuits', [...activePanel.circuits, newCircuit]);
  }

  function duplicateCircuit(circuit: Circuit) {
    const newId =
      nextCircuitId(activePanel.circuits.map((item) => item.id));
    const duplicated: Circuit = {
      ...circuit,
      id: newId,
      name: `${circuit.name} (copia)`,
    };
    updateActivePanel('circuits', [...activePanel.circuits, duplicated]);
  }

  function optimizeProject() {
    const pending: string[] = [];
    const balanced = balancePanelCircuits(activePanel, panels);
    const optimized = balanced.map((circuit, index) => {
      const current = circuitCurrent(circuit, activePanel.supply);
      const capacity = conductorAmpacity(
        circuit.conductor,
        circuit.phase === '3Φ',
        circuit.ampacity,
      );
      const selected = selectPreliminaryBreaker(
        current,
        capacity ?? NaN,
        circuit.breaker,
      );
      if (selected === null) {
        pending.push(
          `C${index + 1}: sin térmica compatible con Ib ${formatNumber(current)} A e Iz preliminar ${capacity ?? 'desconocida'} A; revisar carga y cable`,
        );
        return circuit;
      }
      return { ...circuit, breaker: selected };
    });
    updateActivePanel('circuits', optimized);
    const phaseMessage =
      activePanel.supply === 'tri'
        ? activePanel.type === 'TP'
          ? 'Se revisó el reparto de circuitos propios considerando las cargas de los TS y sus factores de demanda. Las fases de sus alimentadores no se cambiaron.'
          : 'Se revisó el reparto de fases de este TS.'
        : 'En monofásico no hay fases para balancear.';
    setOptimizationMessage(
      `${phaseMessage} ${pending.length ? `Optimización parcial: ${pending.join('; ')}. Se conservaron sus térmicas para revisión, sin validarlas.` : 'Las térmicas de los circuitos quedan dentro del chequeo preliminar Ib ≤ In ≤ Iz.'} No se modificaron alimentadores ni cables. No verifica selectividad, cortocircuito ni condiciones reales de instalación.`,
    );
  }

  function resetProject() {
    if (!window.confirm('¿Restablecer el proyecto? Se reemplazarán todos los tableros, circuitos y precios. Exportá un JSON antes si querés conservarlos.')) return;
    applyProject({ panels: INITIAL_PANELS, profile: INITIAL_PROFILE, prices: DEFAULT_PRICES, projectName: 'IGLESIA · SALÓN 24 × 10 m', experienceMode, activePanelId: 'ts1' });
    setOptimizationMessage('Proyecto restablecido.');
  }

  // Export JSON
  function exportProjectJSON() {
    const projectData = {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      projectName,
      experienceMode,
      profile,
      panels,
      activePanelId,
      prices,
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_tablero_aea.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Import JSON
  function importProjectJSON(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const project = normalizeProject(JSON.parse(e.target?.result as string));
        applyProject(project);
        setOptimizationMessage(storageBlocked ? 'Proyecto importado en memoria. El guardado sigue pausado; exportá el JSON para conservarlo.' : 'Proyecto importado correctamente.');
      } catch (error) {
        alert(
          `Error al leer el proyecto: ${error instanceof Error ? error.message : 'formato inválido'}.`,
        );
      }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  }

  // Export CSV
  function exportCircuitsCSV(allPanels = false) {
    const targetPanels = allPanels ? panels : [activePanel];
    const rows: (string | number)[][] = [
      [
        'Tablero',
        'Clase',
        'ID',
        'Nombre',
        'Tipo',
        'Bocas',
        'VA por boca',
        'Potencia [VA]',
        'Fase',
        'Ib [A]',
        'Protección In [A]',
        'Conductor [mm²]',
        'Longitud [m]',
        'Caída tramo [%]',
        'Caída total estimada [%]',
        'Módulos DIN',
        'FP declarado',
        'P instalada [W]',
        'Cañería declarada',
        'Especificación de cable / aislación',
      ],
    ];
    const rounded = (value: number) => Number(value.toFixed(2));

    targetPanels.forEach((panel) => {
      if (panel.type === 'TP') {
        panels
          .filter((child) => child.type === 'TS' && child.parentId === panel.id)
          .forEach((child, index) => {
            const childCalculation = panelCalculations.get(child.id);
            const drop = rounded(childCalculation?.feederDrop.percent ?? 0);
            rows.push([
              panel.name,
              'Alimentador (demanda)',
              `A${index + 1}`,
              child.name,
              'TS',
              '',
              '',
              rounded(childCalculation?.demandVA ?? 0),
              child.supply === 'tri' ? '3Φ' : (child.feederPhase ?? 'L1'),
              rounded(childCalculation?.mainCurrent ?? 0),
              child.feederBreaker ?? 32,
              child.feederConductor ?? 6,
              child.feederLengthM ?? 15,
              drop,
              drop,
              child.supply === 'tri' ? 4 : 2,
              '',
              rounded(childCalculation?.activeInstalledW ?? 0),
              child.feederConduit ?? '',
              feederWiringLabel(child),
            ]);
          });
      }
      panel.circuits.forEach((c, index) => {
        const power = circuitPower(c);
        const current = circuitCurrent(c, panel.supply);
        const drop = voltageDrop(c, panel.supply);
        const totalDrop =
          drop.percent +
          (panel.type === 'TS'
            ? (panelCalculations.get(panel.id)?.feederDrop.percent ?? 0)
            : 0);
        rows.push([
          panel.name,
          'Circuito terminal (instalada)',
          `C${index + 1}`,
          c.name,
          c.kind,
          c.points,
          c.unitVA,
          power,
          circuitPhaseLabel(panel, c),
          rounded(current),
          c.breaker,
          c.conductor,
          c.lengthM,
          rounded(drop.percent),
          rounded(totalDrop),
          circuitModuleSpan(c),
          c.powerFactor,
          rounded(activePower(c)),
          c.conduit ?? '',
          profile.interiorCableStandard === 'iram62267'
            ? 'LSOH · IRAM 62267'
            : profile.interiorCableStandard === 'other'
              ? 'Otra especificación declarada'
              : 'Pendiente',
        ]);
      });
    });

    const blob = new Blob([toExcelCsv(rows)], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_cargas.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const childPanels = useMemo(() => {
    return activePanel.type === 'TP'
      ? panels.filter(
          (panel) => panel.type === 'TS' && panel.parentId === activePanel.id,
        )
      : [];
  }, [activePanel.id, activePanel.type, panels]);

  const devices = useMemo(
    () => buildPanelDevices(activePanel, childPanels, calculations.mainBreaker),
    [activePanel, calculations.mainBreaker, childPanels],
  );

  const activeHighlightedCircuitId = highlightedCircuit(
    hoveredCircuitId,
    selectedCircuitId,
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hidden file input for JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={importProjectJSON}
      />

      <header className="print-hide sticky top-0 z-40 border-b border-white/10 bg-slate-950 text-white shadow-lg shadow-slate-950/10">
        <div className="mx-auto flex max-w-[1680px] flex-col items-stretch justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-400 text-slate-950 shadow-[0_0_24px_rgba(251,191,36,.25)]">
              <CircuitBoard className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">
                  Tablero AEA
                </h1>
                <Badge className="border border-amber-300/20 bg-amber-300/10 text-amber-200">
                  multi-tablero
                </Badge>
              </div>
              <p className="truncate text-xs text-slate-400">
                Predimensionado · San Rafael, Mendoza
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:bg-white/10 hover:text-white"
              onClick={() => fileInputRef.current?.click()}
              title="Importar proyecto desde archivo JSON"
            >
              <FolderUp data-icon="inline-start" />
              <span className="hidden sm:inline">Importar</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:bg-white/10 hover:text-white"
              onClick={exportProjectJSON}
              title="Guardar proyecto completo en formato JSON"
            >
              <FolderDown data-icon="inline-start" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:bg-white/10 hover:text-white"
              onClick={() => exportCircuitsCSV(true)}
              title="Descargar todos los tableros y circuitos en CSV para Excel es-AR (punto y coma, coma decimal)"
            >
              <FileSpreadsheet data-icon="inline-start" />
              <span className="hidden sm:inline">CSV · Excel es-AR</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:bg-white/10 hover:text-white"
              onClick={resetProject}
            >
              <RotateCcw data-icon="inline-start" />
              <span className="hidden sm:inline">Restablecer</span>
            </Button>
            <Button
              size="sm"
              className="bg-amber-400 text-slate-950 hover:bg-amber-300"
              onClick={() => window.print()}
            >
              <Printer data-icon="inline-start" />
              Imprimir proyecto
            </Button>
          </div>
        </div>
      </header>

      <section className="print-sheet mx-auto flex max-w-[1680px] flex-col px-4 py-5 print:hidden lg:px-6">
        {persistenceError && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm text-amber-950"
          >
            <span>{persistenceError}</span>
            {storageBlocked && (
              <Button type="button" size="sm" variant="outline" onClick={reloadSavedProject}>
                Cargar versión guardada
              </Button>
            )}
          </div>
        )}
        {/* Print Header */}
        <div className="mb-4 hidden items-start justify-between border-b-2 border-slate-900 pb-3 print:flex">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em]">
              Planilla de predimensionado eléctrico
            </p>
            <h1 className="text-2xl font-bold">{projectName}</h1>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
              {activePanel.name} (
              {activePanel.type === 'TP'
                ? 'Tablero Principal'
                : 'Tablero Seccional'}
              )
            </p>
          </div>
          <div className="text-right text-xs">
            <p>San Rafael · Mendoza</p>
            <p>AEA 90364 vigente · 771/718 · Ord. Gral. 72/83</p>
          </div>
        </div>

        {/* Global Architecture / Hierarchy Banner */}
        <div className="print-hide mb-4 rounded-2xl border bg-slate-900 p-4 text-white shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-amber-400/10 text-amber-300">
                <Network className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  Arquitectura de distribución
                </p>
                <h2 className="text-sm font-semibold sm:text-base">
                  Jerarquía de Tableros: Acometida → {panels.length} Tablero
                  {panels.length > 1 ? 's' : ''}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="rounded-lg bg-white/5 px-3 py-1.5 font-mono">
                <span className="text-slate-400">Demanda global:</span>{' '}
                <strong className="text-amber-300">
                  {formatPower(globalSummary.totalDemandVA)}
                </strong>
              </div>
              <div className="rounded-lg bg-white/5 px-3 py-1.5 font-mono">
                <span className="text-slate-400">Potencia total:</span>{' '}
                <strong className="text-slate-200">
                  {formatPower(globalSummary.totalInstalledVA)}
                </strong>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400 hover:text-slate-950"
                onClick={addSectionalPanel}
              >
                <Plus data-icon="inline-start" /> Agregar Tablero Seccional (TS)
              </Button>
            </div>
          </div>

          {/* Panel tabs bar */}
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
            {panels.map((p) => {
              const calc = panelCalculations.get(p.id);
              const isActive = p.id === activePanel.id;
              return (
                <div
                  key={p.id}
                  className={`group flex items-center rounded-xl border transition-all ${
                    isActive
                      ? 'border-amber-400 bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300'
                      : 'border-white/15 bg-white/5 text-slate-300 hover:border-white/30 hover:bg-white/10'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActivePanelId(p.id);
                      setOptimizationMessage('');
                    }}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-left"
                  >
                    <Layers
                      className={`size-4 ${isActive ? 'text-slate-950' : 'text-amber-400'}`}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold">
                          {p.name}
                        </span>
                        <span
                          className={`rounded px-1 text-[9px] font-bold ${
                            isActive
                              ? 'bg-slate-950 text-amber-300'
                              : 'bg-white/10 text-slate-400'
                          }`}
                        >
                          {p.type}
                        </span>
                      </div>
                      {calc && (
                        <p
                          className={`font-mono text-[10px] ${isActive ? 'text-slate-800' : 'text-slate-400'}`}
                        >
                          {formatPower(calc.demandVA)} ·{' '}
                          {calc.mainCurrent.toFixed(1)} A ·{' '}
                          {calc.occupiedModules} M
                        </p>
                      )}
                      <p className={`text-[9px] ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                        {(panelDiagnostics.get(p.id)?.length ?? 0) + projectDiagnostics.length}{' '}
                        alertas en este tablero
                      </p>
                    </div>
                  </button>

                  {p.type === 'TS' && (
                    <div className="flex items-center pr-2">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className={`size-6 rounded ${
                          isActive
                            ? 'text-slate-950 hover:bg-slate-900/10'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicatePanel(p);
                        }}
                        title="Duplicar este tablero seccional"
                      >
                        <Copy className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className={`size-6 rounded ${
                          isActive
                            ? 'text-rose-950 hover:bg-rose-500/20'
                            : 'text-rose-400 hover:bg-rose-500/20'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`¿Eliminar ${p.name}?`))
                            deletePanel(p.id);
                        }}
                        title="Eliminar este tablero seccional"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Project Definition Card */}
        <section className="print-hide mb-5 overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b bg-slate-950 p-4 text-white lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-300">
                <LayoutDashboard className="size-4" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">
                  Definir proyecto general
                </p>
              </div>
              <h2 className="mt-1 text-lg font-semibold">
                Del ambiente al tablero en pocos datos
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Elegí una base, corregí dimensiones y ocupación; después ajustá
                los circuitos reales.
              </p>
            </div>
            <div className="flex rounded-lg border border-white/15 bg-white/5 p-1">
              <Button
                size="sm"
                variant="ghost"
                className={
                  experienceMode === 'guided'
                    ? 'bg-white text-slate-950 hover:bg-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }
                onClick={() => setExperienceMode('guided')}
              >
                Rápido
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={
                  experienceMode === 'technical'
                    ? 'bg-white text-slate-950 hover:bg-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }
                onClick={() => setExperienceMode('technical')}
              >
                <SlidersHorizontal data-icon="inline-start" /> Técnico
              </Button>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ['hall', 'SALÓN'],
                  ['commercial', 'Comercio'],
                  ['residential', 'Vivienda'],
                  ['custom', 'Personalizado'],
                ] as Array<[ProjectPreset, string]>
              ).map(([preset, label]) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    profile.preset === preset
                      ? 'border-amber-400 bg-amber-50 text-amber-950 ring-1 ring-amber-200'
                      : 'hover:border-slate-300 hover:bg-muted/30'
                  }`}
                >
                  <span className="text-xs font-semibold">{label}</span>
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    {preset === 'hall'
                      ? 'Pública concurrencia · emergencia'
                      : preset === 'commercial'
                        ? 'Atención al público'
                        : preset === 'residential'
                          ? 'Uso doméstico'
                          : 'Sin supuestos previos'}
                  </span>
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
              <div className="space-y-1.5 sm:col-span-2">
                <Label
                  htmlFor="quick-project-name"
                  className="text-xs text-muted-foreground"
                >
                  Nombre del proyecto
                </Label>
                <Input
                  id="quick-project-name"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  className="font-medium"
                />
              </div>
              <QuickNumber
                label="Ancho"
                value={profile.widthM}
                suffix="m"
                min={1}
                onChange={(value) => updateProfile('widthM', value)}
              />
              <QuickNumber
                label="Largo"
                value={profile.lengthM}
                suffix="m"
                min={1}
                onChange={(value) => updateProfile('lengthM', value)}
              />
              <QuickNumber
                label="Ocupación"
                value={profile.occupancy}
                suffix="pers."
                min={1}
                onChange={(value) => updateProfile('occupancy', value)}
              />
              <div className="space-y-1.5">
                <Label
                  htmlFor="active-panel-name"
                  className="text-xs text-muted-foreground"
                >
                  Nombre del Tablero
                </Label>
                <Input
                  id="active-panel-name"
                  value={activePanel.name}
                  onChange={(event) =>
                    updateActivePanel('name', event.target.value)
                  }
                  className="font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="quick-supply"
                  className="text-xs text-muted-foreground"
                >
                  Suministro ({activePanel.type})
                </Label>
                <NativeSelect
                  id="quick-supply"
                  className="w-full"
                  value={activePanel.supply}
                  onChange={(event) => {
                    const nextSupply = event.target.value as Supply;
                    changePanelSupply(activePanel.id, nextSupply);
                  }}
                >
                  <NativeSelectOption value="mono">
                    220 V mono
                  </NativeSelectOption>
                  <NativeSelectOption
                    value="tri"
                    disabled={
                      activePanel.type === 'TS' && tpPanel.supply === 'mono'
                    }
                  >
                    380/220 V tri
                  </NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="rounded-xl border bg-muted/25 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Superficie
                </p>
                <p className="mt-1 font-mono text-lg font-bold">
                  {projectArea.toFixed(0)} m²
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {areaPerPerson.toFixed(2)} m²/persona
                </p>
              </div>
            </div>

            {isPublicVenue && (
              <div className="mt-4 grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-emerald-950 sm:grid-cols-[minmax(0,1fr)_minmax(240px,.45fr)] sm:items-end">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" />
                  <div>
                    <p className="text-sm font-bold">
                      Cables interiores en pública concurrencia
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-emerald-900/80">
                      Para el salón se adopta cable LSOH, no propagador del
                      incendio, libre de halógenos y de baja emisión de humos.
                      Verificá marcación IRAM 62267 y la exigencia concreta del
                      expediente.
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="interior-cable-standard" className="text-sm">
                    Especificación declarada
                  </Label>
                  <NativeSelect
                    id="interior-cable-standard"
                    className="w-full bg-white"
                    value={profile.interiorCableStandard}
                    onChange={(event) =>
                      updateProfile(
                        'interiorCableStandard',
                        event.target.value as InteriorCableStandard,
                      )
                    }
                  >
                    <NativeSelectOption value="iram62267">
                      LSOH · IRAM 62267
                    </NativeSelectOption>
                    <NativeSelectOption value="pending">
                      Pendiente de definir
                    </NativeSelectOption>
                    <NativeSelectOption value="other">
                      Otra especificación
                    </NativeSelectOption>
                  </NativeSelect>
                </div>
              </div>
            )}

            {/* Feeder configuration if Seccional */}
            {activePanel.type === 'TS' && (
              <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-sky-950">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="size-4 text-sky-700" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-sky-900">
                        Línea Seccional (Alimentador desde TP hacia{' '}
                        {activePanel.name})
                      </p>
                      <p className="text-[10px] text-sky-800/80">
                        Configuración del cable y de la térmica que lo protege
                        dentro del Tablero Principal.
                      </p>
                    </div>
                  </div>
                  <Badge className="border-sky-300 bg-white text-sky-900">
                    ΔV Alimentador: {calculations.feederDrop.percent.toFixed(2)}{' '}
                    % ({calculations.feederDrop.volts.toFixed(1)} V)
                  </Badge>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <QuickNumber
                    label="Longitud alimentador"
                    value={activePanel.feederLengthM ?? 15}
                    suffix="m"
                    min={1}
                    onChange={(val) => updateActivePanel('feederLengthM', val)}
                  />
                  <div className="space-y-1.5">
                    <Label htmlFor="feeder-section" className="text-xs text-muted-foreground">
                      Sección alimentador
                    </Label>
                    <NativeSelect
                      id="feeder-section"
                      className="w-full bg-white"
                      value={activePanel.feederConductor ?? 6}
                      onChange={(e) =>
                        updateActivePanel(
                          'feederConductor',
                          Number(e.target.value),
                        )
                      }
                    >
                      {[4, 6, 10, 16, 25, 35].map((val) => (
                        <NativeSelectOption key={val} value={val}>
                          {val} mm²
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="feeder-breaker" className="text-xs text-muted-foreground">
                      Térmica en el TP para este alimentador
                    </Label>
                    <NativeSelect
                      id="feeder-breaker"
                      className="w-full bg-white"
                      value={activePanel.feederBreaker ?? 32}
                      onChange={(e) =>
                        updateActivePanel(
                          'feederBreaker',
                          Number(e.target.value),
                        )
                      }
                    >
                      {STANDARD_BREAKERS.map((val) => (
                        <NativeSelectOption key={val} value={val}>
                          {val} A ({activePanel.supply === 'tri' ? '4P' : '2P'})
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="feeder-phase" className="text-xs text-muted-foreground">
                      Fase tomada del TP
                    </Label>
                    <NativeSelect
                      id="feeder-phase"
                      className="w-full bg-white"
                      value={
                        activePanel.supply === 'tri'
                          ? '3Φ'
                          : (activePanel.feederPhase ?? 'L1')
                      }
                      disabled={
                        activePanel.supply === 'tri' ||
                        tpPanel.supply === 'mono'
                      }
                      onChange={(event) =>
                        updateActivePanel(
                          'feederPhase',
                          event.target.value as Phase,
                        )
                      }
                    >
                      {activePanel.supply === 'tri' ? (
                        <NativeSelectOption value="3Φ">
                          L1 + L2 + L3
                        </NativeSelectOption>
                      ) : tpPanel.supply === 'mono' ? (
                        <NativeSelectOption value="L1">
                          L1 del TP monofásico
                        </NativeSelectOption>
                      ) : (
                        <>
                          <NativeSelectOption value="L1">L1</NativeSelectOption>
                          <NativeSelectOption value="L2">L2</NativeSelectOption>
                          <NativeSelectOption value="L3">L3</NativeSelectOption>
                        </>
                      )}
                    </NativeSelect>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {activePanel.type === 'TS' && (
          <section className="mb-5 rounded-2xl border bg-card p-4">
            <h3 className="mb-3 font-semibold">Condiciones del alimentador</h3>
            <AmpacityEditor
              section={activePanel.feederConductor ?? 6}
              threeLoaded={activePanel.supply === 'tri'}
              settings={activePanel.feederAmpacity}
              onChange={(value) => updateActivePanel('feederAmpacity', value)}
            />
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="feeder-wiring" className="text-sm">
                Condición de aislación de la línea TP → {activePanel.name}
              </Label>
              <NativeSelect
                id="feeder-wiring"
                className="w-full"
                value={activePanel.feederWiring ?? 'pending'}
                onChange={(event) =>
                  updateActivePanel(
                    'feederWiring',
                    event.target.value as FeederWiring,
                  )
                }
              >
                <NativeSelectOption value="classII-underground">
                  Clase II · cable IRAM 2178 subterráneo
                </NativeSelectOption>
                <NativeSelectOption value="classII-conduit">
                  Clase II · cañería plástica + envolventes aislantes
                </NativeSelectOption>
                <NativeSelectOption value="other">
                  No cumple condición Clase II declarada
                </NativeSelectOption>
                <NativeSelectOption value="pending">
                  Pendiente de verificar
                </NativeSelectOption>
              </NativeSelect>
              <p className="text-xs text-muted-foreground">
                Esta declaración gobierna la recomendación del diferencial en el
                TP; no reemplaza la inspección de todo el recorrido.
              </p>
            </div>
            <label htmlFor="feeder-conduit" className="mt-3 block text-xs">
              Cañería del alimentador: material, diámetro y referencia
              <Input
                id="feeder-conduit"
                className="mt-1"
                value={activePanel.feederConduit ?? ''}
                placeholder="Pendiente de dimensionar; no se deduce de la corriente"
                maxLength={500}
                onChange={(e) =>
                  updateActivePanel('feederConduit', e.target.value)
                }
              />
            </label>
          </section>
        )}

        {/* Technical parameters for active panel */}
        {experienceMode === 'technical' && (
          <div className="print-hide mb-5 grid gap-3 rounded-2xl border bg-card p-4 shadow-sm lg:grid-cols-3 xl:grid-cols-[minmax(240px,1.3fr)_repeat(6,minmax(110px,.55fr))]">
            <div className="space-y-1.5">
              <Label
                htmlFor="panel-select-tech"
                className="text-xs text-muted-foreground"
              >
                Tablero activo
              </Label>
              <NativeSelect
                id="panel-select-tech"
                className="w-full font-medium"
                value={activePanel.id}
                onChange={(e) => {
                  setActivePanelId(e.target.value);
                  setOptimizationMessage('');
                }}
              >
                {panels.map((p) => (
                  <NativeSelectOption key={p.id} value={p.id}>
                    {p.name} ({p.type})
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="supply-tech"
                className="text-xs text-muted-foreground"
              >
                Suministro
              </Label>
              <NativeSelect
                id="supply-tech"
                className="w-full"
                value={activePanel.supply}
                onChange={(event) => {
                  const nextSupply = event.target.value as Supply;
                  changePanelSupply(activePanel.id, nextSupply);
                }}
              >
                <NativeSelectOption value="mono">
                  Monofásico · 220 V
                </NativeSelectOption>
                <NativeSelectOption
                  value="tri"
                  disabled={
                    activePanel.type === 'TS' && tpPanel.supply === 'mono'
                  }
                >
                  Trifásico · 380/220 V
                </NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="demand" className="text-xs text-muted-foreground">
                Simultaneidad (fs)
              </Label>
              <Input
                id="demand"
                type="number"
                min="0.1"
                max="1"
                step="0.05"
                value={activePanel.demandFactor}
                onChange={(event) =>
                  updateActivePanel('demandFactor', Number(event.target.value))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="reserve"
                className="text-xs text-muted-foreground"
              >
                Reserva sobre capacidad total
              </Label>
              <div className="relative">
                <Input
                  id="reserve"
                  type="number"
                  min="20"
                  max="80"
                  value={activePanel.reservePercent}
                  onChange={(event) =>
                    updateActivePanel(
                      'reservePercent',
                      Number(event.target.value),
                    )
                  }
                  className="pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="modules-row"
                className="text-xs text-muted-foreground"
              >
                Módulos por fila
              </Label>
              <NativeSelect
                id="modules-row"
                className="w-full"
                value={activePanel.modulesPerRow}
                onChange={(event) =>
                  updateActivePanel('modulesPerRow', Number(event.target.value))
                }
              >
                {[12, 16, 18, 24].map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {value} módulos
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="dps-local"
                className="text-xs text-muted-foreground"
              >
                DPS en este tablero
              </Label>
              <NativeSelect
                id="dps-local"
                className="w-full"
                value={panelHasDps(activePanel) ? 'yes' : 'no'}
                onChange={(event) =>
                  updateActivePanel('includeDps', event.target.value === 'yes')
                }
              >
                <NativeSelectOption value="yes">Incluido</NativeSelectOption>
                <NativeSelectOption value="no">No incluido</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="differential-type"
                className="text-xs text-muted-foreground"
              >
                Tipo diferencial
              </Label>
              <NativeSelect
                id="differential-type"
                className="w-full"
                value={panelDifferentialType(activePanel)}
                onChange={(event) =>
                  updateActivePanel(
                    'differentialType',
                    event.target.value as DifferentialType,
                  )
                }
              >
                <NativeSelectOption value="AC">Tipo AC</NativeSelectOption>
                <NativeSelectOption value="A">Tipo A</NativeSelectOption>
              </NativeSelect>
            </div>
          </div>
        )}

        {activePanel.type === 'TP' && (
          <section className="mb-5 overflow-hidden rounded-2xl border border-sky-200 bg-card shadow-sm">
            <div className="grid gap-4 bg-sky-950 p-4 text-white lg:grid-cols-[minmax(0,1fr)_minmax(280px,.5fr)] lg:items-end">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-400/15 text-sky-300">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">
                    Protección diferencial general del TP
                  </p>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-sky-100/80">
                    La termomagnética omnipolar de cabecera se mantiene siempre.
                    El diferencial del pilar se configura aparte de los 30 mA de
                    los circuitos interiores para no confundir protección con
                    selectividad.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tp-differential-mode" className="text-sm text-sky-100">
                  Decisión de proyecto
                </Label>
                <NativeSelect
                  id="tp-differential-mode"
                  className="w-full border-sky-700 bg-sky-900 text-white"
                  value={panelTpDifferentialMode(activePanel)}
                  onChange={(event) =>
                    updateActivePanel(
                      'tpDifferentialMode',
                      event.target.value as TpDifferentialMode,
                    )
                  }
                >
                  <NativeSelectOption value="none">
                    Sin diferencial en TP · línea Clase II
                  </NativeSelectOption>
                  <NativeSelectOption value="selective300">
                    Selectivo Tipo S · 300 mA
                  </NativeSelectOption>
                  <NativeSelectOption value="instant30">
                    Instantáneo · 30 mA (tablero único)
                  </NativeSelectOption>
                </NativeSelect>
              </div>
            </div>
            <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <p className="text-sm font-semibold">
                  {panelTpDifferentialMode(activePanel) === 'none'
                    ? 'TP de tránsito: IGA → línea seccional → diferenciales de 30 mA en TS1.'
                    : panelTpDifferentialMode(activePanel) === 'selective300'
                      ? 'ID selectivo de 300 mA aguas arriba: requiere coordinación documentada con los 30 mA interiores.'
                      : 'ID instantáneo de 30 mA aguas arriba: puede producir el corte total del edificio.'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {childPanels.length
                    ? `${childPanels.filter(isClassIIFeeder).length} de ${childPanels.length} líneas seccionales declaradas Clase II.`
                    : 'No hay tableros seccionales vinculados al TP.'}
                </p>
              </div>
              <Badge
                className={
                  panelTpDifferentialMode(activePanel) === 'instant30'
                    ? 'border-red-300 bg-red-50 text-red-900'
                    : childPanels.length > 0 && childPanels.every(isClassIIFeeder)
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-amber-300 bg-amber-50 text-amber-900'
                }
              >
                {panelTpDifferentialMode(activePanel) === 'instant30'
                  ? 'Riesgo de apagado total'
                  : childPanels.length > 0 && childPanels.every(isClassIIFeeder)
                    ? 'Recorrido Clase II declarado'
                    : 'Verificación pendiente'}
              </Badge>
            </div>
          </section>
        )}

        {(activePanel.type !== 'TP' || activePanel.circuits.length > 0) && (
        <section className="mb-5 rounded-2xl border bg-card p-4 shadow-sm">
          <Label
            htmlFor="architecture-choice"
            className="text-base font-semibold"
          >
            Arquitectura de diferenciales · {activePanel.name}
          </Label>
          <NativeSelect
            id="architecture-choice"
            className="mt-3 w-full"
            value={activePanel.architecture}
            onChange={(event) =>
              updateActivePanel(
                'architecture',
                event.target.value as Architecture,
              )
            }
          >
            {costOptions
              .filter((option) => option.id !== 'continuity')
              .map((option) => (
                <NativeSelectOption key={option.id} value={option.id}>
                  {option.title} · {option.differentialCount} disyuntor
                  {option.differentialCount === 1 ? '' : 'es'}
                </NativeSelectOption>
              ))}
            {activePanel.architecture === 'continuity' && (
              <NativeSelectOption value="continuity">
                Legado · ID por circuito (conservado)
              </NativeSelectOption>
            )}
          </NativeSelect>
          <p className="mt-3 text-sm font-semibold">
            {selectedCost.differentialCount} diferenciales terminales en este tablero ·{' '}
            {panels.reduce(
              (sum, panel) => sum + panelDifferentialCount(panel),
              0,
            )}{' '}
            en el proyecto
          </p>
          <p className="mt-1 text-sm">{selectedCost.continuity}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedCost.groups.map((group) => (
              <span
                key={group.label}
                className="rounded-lg border bg-muted/40 px-3 py-2 text-xs"
              >
                <strong>{group.label}:</strong>{' '}
                {group.circuits.join(' · ') || 'reservado, sin circuitos'}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            La elección corresponde a este tablero, no reemplaza las opciones de
            los demás TP/TS. Grupos reservados incluidos en módulos y precio.
            Sin circuitos propios: 0 ID terminales; la protección del
            alimentador se verifica aparte. Asignación según tipo
            IUG/TUG/TUE/FM/EMG, no según nombre.
          </p>
          {isPublicVenue && activePanel.architecture === 'residential' && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-950"
            >
              Atención: opción domiciliaria en salón de pública concurrencia. Un
              único ID corta también la emergencia si está conectada al tablero.
              Elegí una arquitectura con EMG independiente y verificá el
              proyecto; esta opción no se presenta como cumplimiento AEA 718.
            </p>
          )}
          {activePanel.architecture === 'continuity' && (
            <p className="mt-3 text-xs text-amber-800">
              Configuración anterior conservada sin quitar equipos. Elegir una
              de las tres opciones reemplazará la agrupación de este tablero.
            </p>
          )}
        </section>
        )}

        {/* Panel Metrics */}
        <p className="mb-3 text-sm text-muted-foreground">
          Potencia activa instalada estimada:{' '}
          <strong className="text-foreground">
            {formatNumber(calculations.activeInstalledW / 1000, 2)} kW
          </strong>{' '}
          · Según el factor de potencia declarado; no es una medición ni reduce
          Ib.
        </p>
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <Metric
            label={`Potencia (${activePanel.name})`}
            value={formatPower(calculations.installedVA)}
          />
          <Metric
            label="Demanda calculada"
            value={formatPower(calculations.demandVA)}
          />
          <Metric
            label="Corriente nominal Ib"
            value={`${calculations.mainCurrent.toFixed(1)} A`}
          />
          <Metric
            label={
              activePanel.type === 'TP'
                ? 'IGA sugerido'
                : 'Corte local sugerido'
            }
            value={ratingLabel(calculations.mainBreaker)}
            emphasis
          />
          <Metric
            label="Gabinete sugerido"
            value={`${calculations.rows} × ${activePanel.modulesPerRow} M`}
            emphasis
          />
          <Metric
            label="Ocupación / reserva"
            value={`${calculations.occupiedModules} / ${calculations.cabinetModules - calculations.occupiedModules} M`}
          />
        </div>

        {/* Circuits Section for Active Panel */}
        <div className="space-y-5">
          <section className="min-w-0 rounded-2xl border bg-card shadow-sm">
            <div className="print-hide flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="size-4 text-amber-500" />
                  <h2 className="font-semibold">
                    Circuitos de {activePanel.name}
                  </h2>
                  <Badge variant="secondary">
                    {activePanel.circuits.length}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pasa el ratón sobre cualquier circuito para resaltarlo en el
                  Riel DIN y el esquema unifilar.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  size="sm"
                  onClick={optimizeProject}
                >
                  <Sparkles data-icon="inline-start" /> Optimizar fases y
                  térmicas
                </Button>
                {(Object.keys(TEMPLATES) as CircuitKind[]).map((kind) => (
                  <Button
                    key={kind}
                    variant="outline"
                    size="sm"
                    onClick={() => addCircuit(kind)}
                    title={TEMPLATES[kind].label}
                  >
                    <Plus data-icon="inline-start" /> {kind}
                  </Button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table
                className={`circuit-table w-full text-left text-sm ${
                  experienceMode === 'technical'
                    ? 'min-w-[1160px]'
                    : 'min-w-[980px]'
                }`}
              >
                <thead>
                  <tr className="border-b bg-muted/45 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    <th className="px-3 py-2.5">Circuito / uso</th>
                    <th className="px-2 py-2.5">Tipo</th>
                    <th className="px-2 py-2.5 text-right">Bocas</th>
                    <th className="px-2 py-2.5 text-right">VA/boca</th>
                    <th className="px-2 py-2.5 text-right">Carga</th>
                    <th className="px-2 py-2.5">Fase</th>
                    <th className="px-2 py-2.5 text-right">Ib</th>
                    <th className="px-2 py-2.5 text-right">Protección</th>
                    <th className="px-2 py-2.5 text-right">Cable</th>
                    {experienceMode === 'technical' && (
                      <th className="px-2 py-2.5 text-right">Recorrido</th>
                    )}
                    {experienceMode === 'technical' && (
                      <th className="px-2 py-2.5 text-right">ΔV total</th>
                    )}
                    <th className="px-2 py-2.5 text-right">Mód.</th>
                    <th className="print-hide w-20 px-2 py-2.5">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activePanel.circuits.map((circuit, index) => {
                    const isHighlighted =
                      activeHighlightedCircuitId === circuit.id;
                    const cDrop = voltageDrop(circuit, activePanel.supply);
                    const totalDropPercent =
                      cDrop.percent +
                      (activePanel.type === 'TS'
                        ? calculations.feederDrop.percent
                        : 0);

                    return (
                      <tr
                        key={circuit.id}
                        onMouseEnter={() => setHoveredCircuitId(circuit.id)}
                        onMouseLeave={() => setHoveredCircuitId(null)}
                        onClick={() =>
                          setSelectedCircuitId((current) =>
                            current === circuit.id ? null : circuit.id,
                          )
                        }
                        className={`group cursor-pointer border-b transition-colors last:border-0 ${
                          isHighlighted
                            ? 'bg-amber-100/60 font-semibold ring-1 ring-inset ring-amber-400 dark:bg-amber-950/40'
                            : 'hover:bg-muted/25'
                        }`}
                      >
                        <td className="min-w-52 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`grid size-6 shrink-0 place-items-center rounded-md font-mono text-[10px] font-bold ${
                                isHighlighted
                                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                                  : 'bg-slate-900 text-white'
                              }`}
                            >
                              C{index + 1}
                            </span>
                            <Input
                              aria-label={`Nombre del circuito C${index + 1}`}
                              value={circuit.name}
                              onChange={(event) =>
                                updateCircuit(
                                  circuit.id,
                                  'name',
                                  event.target.value,
                                )
                              }
                              className="border-transparent bg-transparent px-1 font-medium shadow-none hover:border-input focus-visible:bg-background"
                            />
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <NativeSelect
                            aria-label={`Tipo de circuito de ${circuit.name}`}
                            size="sm"
                            value={circuit.kind}
                            onChange={(event) =>
                              updateCircuit(
                                circuit.id,
                                'kind',
                                event.target.value as CircuitKind,
                              )
                            }
                          >
                            {(Object.keys(TEMPLATES) as CircuitKind[]).map(
                              (kind) => (
                                <NativeSelectOption key={kind} value={kind}>
                                  {kind}
                                </NativeSelectOption>
                              ),
                            )}
                          </NativeSelect>
                        </td>
                        <td className="px-2 py-2">
                          <CompactNumber
                            label={`Bocas de ${circuit.name}`}
                            value={circuit.points}
                            min={1}
                            onChange={(value) =>
                              updateCircuit(circuit.id, 'points', value)
                            }
                          />
                        </td>
                        <td className="px-2 py-2">
                          <CompactNumber
                            label={`VA por boca de ${circuit.name}`}
                            value={circuit.unitVA}
                            min={1}
                            onChange={(value) =>
                              updateCircuit(circuit.id, 'unitVA', value)
                            }
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-xs font-semibold">
                          {formatPower(circuitPower(circuit))}
                        </td>
                        <td className="px-2 py-2">
                          <NativeSelect
                            aria-label={`Fase de ${circuit.name}`}
                            size="sm"
                            value={
                              activePanel.supply === 'mono'
                                ? 'L1'
                                : circuit.phase
                            }
                            disabled={activePanel.supply === 'mono'}
                            onChange={(event) =>
                              updateCircuit(
                                circuit.id,
                                'phase',
                                event.target.value as Phase,
                              )
                            }
                          >
                            <NativeSelectOption value="L1">
                              L1
                            </NativeSelectOption>
                            {activePanel.supply === 'tri' && (
                              <>
                                <NativeSelectOption value="L2">
                                  L2
                                </NativeSelectOption>
                                <NativeSelectOption value="L3">
                                  L3
                                </NativeSelectOption>
                                <NativeSelectOption value="3Φ">
                                  3Φ
                                </NativeSelectOption>
                              </>
                            )}
                          </NativeSelect>
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-xs">
                          {circuitCurrent(circuit, activePanel.supply).toFixed(
                            1,
                          )}{' '}
                          A
                        </td>
                        <td className="px-2 py-2">
                          <NativeSelect
                            aria-label={`Térmica de ${circuit.name}`}
                            size="sm"
                            className="ml-auto w-20"
                            value={circuit.breaker}
                            onChange={(event) =>
                              updateCircuit(
                                circuit.id,
                                'breaker',
                                Number(event.target.value),
                              )
                            }
                          >
                            {STANDARD_BREAKERS.map((value) => (
                              <NativeSelectOption key={value} value={value}>
                                {value} A
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        </td>
                        <td className="px-2 py-2">
                          <NativeSelect
                            aria-label={`Sección del conductor de ${circuit.name}`}
                            size="sm"
                            className="ml-auto w-24"
                            value={circuit.conductor}
                            onChange={(event) =>
                              updateCircuit(
                                circuit.id,
                                'conductor',
                                Number(event.target.value),
                              )
                            }
                          >
                            {Object.keys(CONDUCTOR_CAPACITY).map((value) => (
                              <NativeSelectOption key={value} value={value}>
                                {value} mm²
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        </td>
                        {experienceMode === 'technical' && (
                          <td className="px-2 py-2">
                            <CompactNumber
                              label={`Longitud en metros de ${circuit.name}`}
                              value={circuit.lengthM}
                              min={1}
                              onChange={(value) =>
                                updateCircuit(circuit.id, 'lengthM', value)
                              }
                            />
                          </td>
                        )}
                        {experienceMode === 'technical' && (
                          <td
                            className={`px-2 py-2 text-right font-mono text-xs font-semibold ${
                              totalDropPercent >
                              voltageDropCriteria(
                                activePanel.type,
                                circuit.kind,
                              ).totalLimitPercent
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {totalDropPercent.toFixed(1)} %
                          </td>
                        )}
                        <td className="px-2 py-2">
                          <CompactNumber
                            label={`Módulos DIN de ${circuit.name}`}
                            value={circuitModuleSpan(circuit)}
                            min={circuit.phase === '3Φ' ? 4 : 2}
                            max={8}
                            onChange={(value) =>
                              updateCircuit(circuit.id, 'modules', value)
                            }
                          />
                        </td>
                        <td className="print-hide px-2 py-2">
                          <div className="flex justify-end opacity-50 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateCircuit(circuit);
                              }}
                              aria-label={`Duplicar ${circuit.name}`}
                            >
                              <Copy />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateActivePanel(
                                  'circuits',
                                  activePanel.circuits.filter(
                                    (item) => item.id !== circuit.id,
                                  ),
                                );
                              }}
                              aria-label={`Eliminar ${circuit.name}`}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t bg-muted/20 p-4">
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                Iz usa la ficha de referencia Cu/PVC en cañería o el valor
                documentado que declares abajo. La referencia no especifica un
                cable LS0H para este salón ni verifica armónicos o
                cortocircuito. “Optimizar” no aumenta una térmica por encima de
                esa capacidad preliminar ni cambia el cable.
              </p>
              {optimizationMessage && (
                <output className="mb-3 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-900">
                  <Info className="mt-0.5 size-4 shrink-0" />{' '}
                  {optimizationMessage}
                </output>
              )}
              {warnings.length ? (
                <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide">
                      Revisar {warnings.length} observación
                      {warnings.length > 1 ? 'es' : ''}
                    </p>
                    <ul className="mt-1 space-y-0.5 text-xs">
                      {warnings.map((warning) => (
                        <li key={warning}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-700">
                  <CheckCircle2 className="size-4" /> Sin alertas preliminares
                  en {activePanel.name}.
                </div>
              )}
            </div>
          </section>

          {/* Visual DIN Panel and Phase Balance */}
          <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(520px,1.3fr)_minmax(360px,.7fr)]">
            <section className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Vista frontal de {activePanel.name}
                  </p>
                  <h2 className="text-lg font-semibold">
                    Tablero DIN · {calculations.rows} filas
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Lectura de izquierda a derecha: cabecera, protecciones y
                    circuitos de salida.
                  </p>
                </div>
                <Badge variant="outline">
                  ≈ {calculations.widthMm} × {calculations.heightMm} × 120 mm
                </Badge>
              </div>
              <FeederReviews
                panel={activePanel}
                panels={panels}
                calculations={panelCalculations}
              />
              <PanelFront
                devices={devices}
                rows={calculations.rows}
                modulesPerRow={activePanel.modulesPerRow}
                panelType={activePanel.type}
                hasDps={panelHasDps(activePanel)}
                hasFeeders={childPanels.length > 0}
                highlightedCircuitId={activeHighlightedCircuitId}
                onHoverDevice={(id) => setHoveredCircuitId(id ?? null)}
              />
              <ProtectionGuide
                panelType={activePanel.type}
                hasDps={panelHasDps(activePanel)}
                hasFeeders={childPanels.length > 0}
              />
            </section>

            {activePanel.supply === 'tri' && (
              <section className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Balance de fases ({activePanel.name})
                    </p>
                    <h2 className="font-semibold">Distribución de carga</h2>
                  </div>
                  <Badge
                    variant={
                      calculations.imbalance > 0.2 ? 'destructive' : 'secondary'
                    }
                  >
                    {Math.round(calculations.imbalance * 100)} % desbalance
                  </Badge>
                </div>
                <div className="space-y-3">
                  {(['L1', 'L2', 'L3'] as const).map((phase) => {
                    const max = Math.max(
                      ...Object.values(calculations.phaseVA),
                      1,
                    );
                    return (
                      <PhaseBar
                        key={phase}
                        phase={phase}
                        value={calculations.phaseVA[phase]}
                        percent={(calculations.phaseVA[phase] / max) * 100}
                      />
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Guía Normativa de Distribución: TP vs TS */}
        <DistributionArchitectureGuide />

        {/* Single-Line Diagram */}
        <section className="mt-5 rounded-2xl border bg-card p-4 shadow-sm print:break-before-page">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Generado automáticamente para {activePanel.name}
              </p>
              <h2 className="text-lg font-semibold">
                Esquema unifilar preliminar
              </h2>
            </div>
            <p className="max-w-xl text-xs text-muted-foreground">
              El esquema muestra la arquitectura del tablero. Deben verificarse
              poder de corte, cortocircuito, selectividad, caída de tensión y
              método de instalación.
            </p>
          </div>
          <SingleLineDiagram
            panel={activePanel}
            calculation={calculations}
            childPanels={childPanels}
            highlightedCircuitId={activeHighlightedCircuitId}
            onHoverCircuit={(id) => setHoveredCircuitId(id ?? null)}
          />
        </section>

        {/* Multi-Line Diagram */}
        <section className="mt-5 rounded-2xl border border-sky-200 bg-card p-4 shadow-sm print:break-before-page">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                Exigencia municipal verificada ({activePanel.name})
              </p>
              <h2 className="text-lg font-semibold">
                Esquema multifilar para Ordenanza 72/83
              </h2>
            </div>
            <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
              La ordenanza pide agrupar fase, neutro y protección por salida,
              identificar circuitos y secciones. Este cuadro sirve como base; el
              plano profesional debe completar canalizaciones, diámetros,
              conductores y conexiones reales.
            </p>
          </div>
          <MultiLineDiagram
            panel={activePanel}
            childPanels={childPanels}
            calculations={panelCalculations}
            highlightedCircuitId={activeHighlightedCircuitId}
            onHoverCircuit={(id) => setHoveredCircuitId(id ?? null)}
          />
        </section>

        <section className="mt-5 rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold">
            Conductores, factor de potencia y cañerías
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Abrí cada circuito para declarar sus condiciones. Cambiar sección o
            fase invalida una Iz manual; hay que volver a justificarla.
          </p>
          <div className="mt-3 space-y-2">
            {activePanel.circuits.map((circuit, index) => (
              <details key={circuit.id} className="rounded-xl border p-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  C{index + 1} · {circuit.name} · {circuit.conductor} mm² ·{' '}
                  {Math.round(activePower(circuit))} W
                </summary>
                <div className="mt-3">
                  <AmpacityEditor
                    section={circuit.conductor}
                    threeLoaded={circuit.phase === '3Φ'}
                    settings={circuit.ampacity}
                    onChange={(value) =>
                      updateCircuit(circuit.id, 'ampacity', value)
                    }
                  />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
                  <label htmlFor={`fp-${circuit.id}`} className="text-xs">
                    Factor de potencia declarado
                    <Input
                      id={`fp-${circuit.id}`}
                      type="number"
                      min="0.1"
                      max="1"
                      step="0.01"
                      value={circuit.powerFactor}
                      onChange={(e) =>
                        updateCircuit(
                          circuit.id,
                          'powerFactor',
                          finiteNumber(
                            e.target.value,
                            circuit.powerFactor,
                            0.1,
                            1,
                          ),
                        )
                      }
                    />
                  </label>
                  <label htmlFor={`conduit-${circuit.id}`} className="text-xs">
                    Cañería: material, diámetro y referencia
                    <Input
                      id={`conduit-${circuit.id}`}
                      value={circuit.conduit ?? ''}
                      maxLength={500}
                      placeholder="Pendiente de dimensionar y verificar ocupación"
                      onChange={(e) =>
                        updateCircuit(circuit.id, 'conduit', e.target.value)
                      }
                    />
                  </label>
                </div>
              </details>
            ))}
          </div>
        </section>

        {isPublicVenue && (
          <section className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
            <h2 className="font-semibold">Emergencia · autonomía declarada</h2>
            <p className="mt-1 text-xs">
              Ord. 72/83, III.2.22 y AEA 718: para locales de pública concurrencia, autonomía mínima
              de 2 h. Seleccionar la modalidad del sistema y declarar la referencia técnica.
            </p>
            <div className="mt-3">
              <label htmlFor="emergency-system" className="text-xs font-semibold">
                Modalidad del sistema de emergencia
                <NativeSelect
                  id="emergency-system"
                  value={profile.emergencySystem ?? 'centralized'}
                  onChange={(e) =>
                    updateProfile(
                      'emergencySystem',
                      e.target.value as EmergencySystem,
                    )
                  }
                  className="mt-1 w-full bg-white text-slate-900"
                >
                  <NativeSelectOption value="centralized">
                    Circuito centralizado de emergencia (circuito EMG dedicado en tablero)
                  </NativeSelectOption>
                  <NativeSelectOption value="autonomous">
                    Equipos autónomos con batería (AEA 718.556.5.2.2 / IRAM-AADL J 2027)
                  </NativeSelectOption>
                </NativeSelect>
              </label>
              {profile.emergencySystem === 'autonomous' ? (
                <p className="mt-1.5 text-[11px] text-amber-900">
                  ℹ️ <strong>Equipos autónomos:</strong> Se alimentan directamente desde los circuitos de iluminación normal (IUG) del sector que protegen. No se exige circuito EMG exclusivo en el tablero ni Tablero Principal de Emergencia (AEA 718.556.5.2.2 y 718.556.6.1.9).
                </p>
              ) : (
                <p className="mt-1.5 text-[11px] text-amber-900">
                  ℹ️ <strong>Circuito centralizado:</strong> Requiere al menos un circuito tipo EMG en el tablero con protección diferencial independiente (AEA 718.556.2).
                </p>
              )}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr]">
              <label htmlFor="emergency-hours" className="text-xs font-medium">
                Autonomía (horas)
                <Input
                  id="emergency-hours"
                  type="number"
                  min="0"
                  max="168"
                  step="0.25"
                  value={profile.emergencyAutonomyHours ?? 0}
                  onChange={(e) =>
                    updateProfile(
                      'emergencyAutonomyHours',
                      finiteNumber(e.target.value, 0, 0, 168),
                    )
                  }
                />
              </label>
              <label htmlFor="emergency-evidence" className="text-xs font-medium">
                Referencia de ensayo o ficha técnica
                <Input
                  id="emergency-evidence"
                  maxLength={1000}
                  value={profile.emergencyEvidence ?? ''}
                  placeholder={
                    profile.emergencySystem === 'autonomous'
                      ? 'Modelo de bloque autónomo, norma IRAM-AADL J 2027, fabricante…'
                      : 'Modelo, documento, fecha de ensayo…'
                  }
                  onChange={(e) =>
                    updateProfile('emergencyEvidence', e.target.value)
                  }
                />
              </label>
            </div>
            <p className="mt-3 text-sm font-semibold">
              {emergencyAutonomyDeclared(profile)
                ? '✓ Autonomía ≥2 h declarada con referencia; evidencia no validada por la herramienta.'
                : 'Pendiente: autonomía ≥2 h y referencia de respaldo.'}
            </p>
          </section>
        )}

        {/* Compliance and Municipal Checks */}
        <section className="mt-5 grid overflow-hidden rounded-2xl border bg-card shadow-sm xl:grid-cols-[minmax(320px,.8fr)_minmax(0,1.7fr)]">
          <div className="border-b bg-slate-950 p-4 text-white xl:border-b-0 xl:border-r">
            <div className="flex items-center gap-2 text-amber-300">
              <BookOpenCheck className="size-4" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">
                Datos de verificación
              </p>
            </div>
            <h2 className="mt-1 text-lg font-semibold">
              Lo que define la seguridad
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Estos valores deben surgir del proyecto y de mediciones. Los
              iniciales son supuestos editables, no certificaciones.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <QuickNumber
                dark
                label="Ik presunta"
                value={profile.prospectiveShortCircuitKa}
                suffix="kA"
                min={0.1}
                step={0.5}
                onChange={(value) =>
                  updateProfile('prospectiveShortCircuitKa', value)
                }
              />
              <QuickNumber
                dark
                label="Poder de corte"
                value={profile.breakingCapacityKa}
                suffix="kA"
                min={1}
                step={0.5}
                onChange={(value) => updateProfile('breakingCapacityKa', value)}
              />
              <QuickNumber
                dark
                label="Puesta a tierra"
                value={profile.groundResistanceOhm}
                suffix="Ω"
                min={0}
                step={0.1}
                onChange={(value) =>
                  updateProfile('groundResistanceOhm', value)
                }
              />
              <div className="space-y-1.5">
                <Label htmlFor="evacuation" className="text-xs text-slate-400">
                  Evacuación AEA
                </Label>
                <NativeSelect
                  id="evacuation"
                  className="w-full border-white/15 bg-white/10 text-white"
                  value={profile.evacuation}
                  onChange={(event) =>
                    updateProfile(
                      'evacuation',
                      event.target.value as EvacuationClass,
                    )
                  }
                >
                  <NativeSelectOption value="BD1">
                    BD1 · fácil
                  </NativeSelectOption>
                  <NativeSelectOption value="BD2">BD2</NativeSelectOption>
                  <NativeSelectOption value="BD3">
                    BD3 · público
                  </NativeSelectOption>
                  <NativeSelectOption value="BD4">
                    BD4 · difícil
                  </NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-scale" className="text-xs text-slate-400">
                  Escala del plano
                </Label>
                <NativeSelect
                  id="plan-scale"
                  className="w-full border-white/15 bg-white/10 text-white"
                  value={profile.planScale}
                  onChange={(event) =>
                    updateProfile(
                      'planScale',
                      event.target.value as ProjectProfile['planScale'],
                    )
                  }
                >
                  <NativeSelectOption value="1:50">1:50</NativeSelectOption>
                  <NativeSelectOption value="1:100">
                    1:100 · salón amplio
                  </NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="flex items-end">
                <Badge
                  className={`mb-1 ${
                    projectWarnings.length
                      ? 'border border-amber-300/30 bg-amber-300/10 text-amber-200'
                      : 'border border-emerald-300/30 bg-emerald-300/10 text-emerald-200'
                  }`}
                >
                  {projectWarnings.length
                    ? `${projectWarnings.length} alertas en el proyecto`
                    : 'Sin alertas'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Expediente y control técnico
                </p>
                <h2 className="font-semibold">
                  {complianceItems.filter((item) => item.ready).length} de{' '}
                  {complianceItems.length} controles con datos o tareas
                  declarados
                </h2>
              </div>
              <Badge variant="outline">
                Estado preliminar · no es visación
              </Badge>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {complianceItems.map((item) => (
                <div
                  key={`${item.group}-${item.label}`}
                  className={`flex gap-3 rounded-xl border p-3 ${
                    item.ready
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-amber-200 bg-amber-50'
                  }`}
                >
                  {item.ready ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
                  )}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                      {item.group}
                    </p>
                    <p className="text-xs font-semibold">{item.label}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {item.action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="print-hide mt-3 grid gap-2 sm:grid-cols-3">
              <ChecklistToggle
                label="Memoria preparada"
                checked={profile.descriptiveMemoryReady}
                onChange={(checked) =>
                  updateProfile('descriptiveMemoryReady', checked)
                }
              />
              <ChecklistToggle
                label="Profesional matriculado"
                checked={profile.registeredProfessionalReady}
                onChange={(checked) =>
                  updateProfile('registeredProfessionalReady', checked)
                }
              />
              <ChecklistToggle
                label="Ensayos ejecutados"
                checked={profile.siteTestReady}
                onChange={(checked) => updateProfile('siteTestReady', checked)}
              />
            </div>
          </div>
        </section>

        {/* Calculation Memory */}
        <section className="order-last mt-5 overflow-hidden rounded-2xl border bg-card shadow-sm print:break-before-page">
          <div className="flex flex-col gap-3 border-b bg-slate-950 p-4 text-white sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-300">
                <Calculator className="size-4" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">
                  Anexo final · Memoria de cálculo ({activePanel.name})
                </p>
              </div>
              <h2 className="mt-1 text-lg font-semibold">
                Fórmulas, valores reemplazados y resultados
              </h2>
              <p className="mt-1 max-w-3xl text-xs text-slate-400">
                Las cargas se ingresan en VA: la potencia aparente ya contempla
                el factor de potencia.
              </p>
            </div>
            <Badge className="w-fit border border-amber-300/20 bg-amber-300/10 text-amber-200">
              Rθ = R20 × [1 + 0,00393 × (θ − 20)]
            </Badge>
          </div>

          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            <FormulaCard
              title="Potencia activa estimada"
              formula="Pinst = Σ(Si × FPi)"
              substitution={`Circuitos propios${activePanel.type === 'TP' ? ' y de cada TS, una sola vez' : ''}; FP declarado por circuito`}
              result={`${formatNumber(calculations.activeInstalledW / 1000, 3)} kW`}
              note="FP relaciona potencia activa y aparente. Solo coincide con cos φ en las condiciones sinusoidales adecuadas; no se calcula energía ni consumo medido."
            />
            <FormulaCard
              title="Potencia instalada"
              formula={
                activePanel.type === 'TP'
                  ? 'Sinst,TP = Spropia + ΣSinst,TS'
                  : 'Sinst = Σ(ni × Si)'
              }
              substitution={
                activePanel.type === 'TP'
                  ? `${Math.round(calculations.ownInstalledVA)} + ${childPanels.map((child) => Math.round(panelCalculations.get(child.id)?.ownInstalledVA ?? 0)).join(' + ') || '0'} VA`
                  : `${activePanel.circuits.map((circuit) => Math.round(circuitPower(circuit))).join(' + ') || '0'} VA`
              }
              result={formatPower(calculations.installedVA)}
              note={
                activePanel.type === 'TP'
                  ? 'El TP agrega una sola vez la potencia propia de cada TS'
                  : 'ni: cantidad de bocas · Si: VA asignados por boca'
              }
            />
            <FormulaCard
              title="Demanda simultánea"
              formula={
                activePanel.type === 'TP'
                  ? 'Sd,TP = Spropia × fsTP + ΣSd,TS'
                  : 'Sd = Sinst × fs'
              }
              substitution={
                activePanel.type === 'TP'
                  ? `${Math.round(calculations.ownInstalledVA)} × ${formatNumber(activePanel.demandFactor, 2)} + (${childPanels.map((child) => Math.round(panelCalculations.get(child.id)?.demandVA ?? 0)).join(' + ') || '0'}) VA`
                  : `${Math.round(calculations.installedVA)} VA × ${formatNumber(activePanel.demandFactor, 2)}`
              }
              result={formatPower(calculations.demandVA)}
              note={
                activePanel.type === 'TP'
                  ? 'Cada TS conserva su propio factor de simultaneidad'
                  : 'fs: factor de simultaneidad editable'
              }
            />
            <FormulaCard
              title="Corriente de cabecera"
              formula={
                activePanel.supply === 'tri'
                  ? activePanel.type === 'TP'
                    ? 'Ib,max = max(Sd,L1, Sd,L2, Sd,L3) / 220 V'
                    : 'Ib,max = max(SL1, SL2, SL3) × fs / 220 V'
                  : 'Ib = Sd / 220 V'
              }
              substitution={
                activePanel.supply === 'tri'
                  ? activePanel.type === 'TP'
                    ? `máx(${Math.round(calculations.phaseVA.L1)}, ${Math.round(calculations.phaseVA.L2)}, ${Math.round(calculations.phaseVA.L3)}) / 220`
                    : `máx(${Math.round(calculations.phaseVA.L1)}, ${Math.round(calculations.phaseVA.L2)}, ${Math.round(calculations.phaseVA.L3)}) × ${formatNumber(activePanel.demandFactor, 2)} / 220`
                  : `${Math.round(calculations.demandVA)} / 220`
              }
              result={`${formatNumber(calculations.mainCurrent, 2)} A`}
              note={
                activePanel.supply === 'tri'
                  ? `Se adopta la fase más cargada: L1 ${formatNumber(calculations.phaseCurrent.L1, 2)} A · L2 ${formatNumber(calculations.phaseCurrent.L2, 2)} A · L3 ${formatNumber(calculations.phaseCurrent.L3, 2)} A`
                  : 'Suministro monofásico'
              }
            />
            <FormulaCard
              title="Protección general sugerida"
              formula={
                activePanel.type === 'TS'
                  ? 'Corte local = máx(calibre ≥ 1,15 × Ib; mayor salida; térmica del alimentador)'
                  : 'IGA = máx(calibre ≥ 1,15 × Ib; mayor derivación)'
              }
              substitution={`1,15 × ${formatNumber(calculations.mainCurrent, 2)} A = ${formatNumber(calculations.mainCurrent * 1.15, 2)} A`}
              result={ratingLabel(calculations.mainBreaker)}
              note={`Por corriente: ${ratingLabel(calculations.currentBasedBreaker)} · mayor derivación: ${calculations.maxBranchBreaker || 0} A${activePanel.type === 'TS' ? ` · protección aguas arriba: ${activePanel.feederBreaker ?? 'pendiente'} A` : ''}. El 15 % es un margen de diseño. Pendientes: Iz real, Ik y selectividad; un mayor calibre no los verifica.`}
            />
            {activePanel.type === 'TS' && (
              <FormulaCard
                title="Caída del alimentador"
                formula={
                  calculations.feederDrop.model === 'balanced-three-phase'
                    ? 'ΔVsec = √3 × Rθ × L × Ib; ΔV% = 100 × ΔVsec / 380'
                    : 'ΔVsec = 2 × Rθ × L × Ib; ΔV% = 100 × ΔVsec / 220'
                }
                substitution={`${formatNumber(calculations.feederDrop.factor, 3)} × ${formatNumber(calculations.feederDrop.resistanceOhmM, 6)} Ω/m × ${activePanel.feederLengthM ?? 15} m × ${formatNumber(calculations.mainCurrent, 2)} A; % = 100 × ${formatNumber(calculations.feederDrop.volts, 3)} / ${calculations.feederDrop.referenceVoltage}`}
                result={`${formatNumber(calculations.feederDrop.volts, 2)} V · ${formatNumber(calculations.feederDrop.percent, 2)} %`}
                note={`${calculations.feederDrop.model === 'mixed-estimate' ? 'TS trifásico con cargas monofásicas: estimación fase-neutro usando la fase más cargada y neutro de igual sección. No es un cálculo fasorial del desequilibrio.' : calculations.feederDrop.model === 'balanced-three-phase' ? 'Modelo trifásico equilibrado, referencia entre fases.' : 'Modelo fase-neutro, conductor de ida y retorno de igual sección.'} Comparar Ib ${formatNumber(calculations.mainCurrent, 2)} A, In ${activePanel.feederBreaker ?? 32} A e Iz preliminar ${conductorAmpacity(activePanel.feederConductor ?? 6, activePanel.supply === 'tri', activePanel.feederAmpacity) ?? 'pendiente'} A. Rθ a ${calculations.feederDrop.temperatureC} °C. Criterio de diseño: ΔVsec ≤ 1 %.`}
              />
            )}
            <FormulaCard
              title="Reserva del tablero"
              formula="Mrec = máx(Mocup + 2; ⌈Mocup / (1 − r/100)⌉)"
              substitution={`máx(${calculations.occupiedModules} + 2; ⌈${calculations.occupiedModules} / (1 − ${activePanel.reservePercent}/100)⌉)`}
              result={`${calculations.recommendedModules} módulos`}
              note={`Política de diseño: ≥20 % de capacidad total libre y ≥2 módulos. El encaje por filas puede aumentar el gabinete: ${calculations.rows} × ${activePanel.modulesPerRow} = ${calculations.cabinetModules} módulos. Verificar envolvente real.`}
            />
            <FormulaCard
              title="Dimensiones orientativas"
              formula="A = Mfila × 18 + 80 · H = filas × 150 + 80"
              substitution={`A = ${activePanel.modulesPerRow} × 18 + 80 · H = ${calculations.rows} × 150 + 80`}
              result={`${calculations.widthMm} × ${calculations.heightMm} mm`}
              note="Estimación geométrica; adoptar dimensiones reales del fabricante y verificar disipación"
            />
          </div>

          <div className="border-t px-4 py-3">
            <div className="mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Desarrollo por circuito ({activePanel.name})
              </p>
              <h3 className="font-semibold">Corriente y caída de tensión</h3>
            </div>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[1240px] text-left text-xs">
                <thead>
                  <tr className="border-b bg-muted/45 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    <th className="px-3 py-2.5">Circuito</th>
                    <th className="px-3 py-2.5">Carga</th>
                    <th className="px-3 py-2.5">Fórmula de corriente</th>
                    <th className="px-3 py-2.5">Resultado Ib</th>
                    <th className="px-3 py-2.5">Chequeo protección</th>
                    <th className="px-3 py-2.5">Fórmula de caída</th>
                    <th className="px-3 py-2.5">Resultado ΔV</th>
                  </tr>
                </thead>
                <tbody>
                  {activePanel.circuits.map((circuit, index) => {
                    const threePhase =
                      circuit.phase === '3Φ' && activePanel.supply === 'tri';
                    const current = circuitCurrent(circuit, activePanel.supply);
                    const drop = voltageDrop(circuit, activePanel.supply);
                    const accumulatedDrop = accumulatedVoltageDrop(
                      drop,
                      activePanel.type === 'TS'
                        ? calculations.feederDrop
                        : { percent: 0 },
                      threePhase ? 380 : 220,
                    );
                    const totalDropVolts = accumulatedDrop.volts;
                    const totalDropPercent = accumulatedDrop.percent;
                    const capacity = conductorAmpacity(
                      circuit.conductor,
                      threePhase,
                      circuit.ampacity,
                    );
                    const protectionOkay =
                      capacity !== null &&
                      current <= circuit.breaker &&
                      circuit.breaker <= capacity;
                    return (
                      <tr key={circuit.id} className="border-b last:border-0">
                        <td className="px-3 py-3">
                          <strong>C{index + 1}</strong>
                          <span className="ml-2 text-muted-foreground">
                            {circuit.name}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono">
                          {circuit.points} × {circuit.unitVA} ={' '}
                          {Math.round(circuitPower(circuit))} VA
                          <br />P = S × FP = {Math.round(
                            activePower(circuit),
                          )}{' '}
                          W
                        </td>
                        <td className="px-3 py-3">
                          <code className="block rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            {threePhase
                              ? 'Ib = S / (√3 × 380)'
                              : 'Ib = S / 220'}
                          </code>
                          <span className="mt-1 block font-mono text-[9px] text-muted-foreground">
                            {threePhase
                              ? `${Math.round(circuitPower(circuit))} / (1,732 × 380)`
                              : `${Math.round(circuitPower(circuit))} / 220`}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono font-bold">
                          {formatNumber(current, 2)} A
                        </td>
                        <td className="px-3 py-3">
                          <code
                            className={`block rounded px-2 py-1 text-[10px] font-semibold ${
                              protectionOkay
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            Ib ≤ In ≤ Iz preliminar
                          </code>
                          <span className="mt-1 block font-mono text-[9px] text-muted-foreground">
                            {formatNumber(current, 2)} ≤ {circuit.breaker} ≤{' '}
                            {capacity === null
                              ? 'Iz pendiente'
                              : `${formatNumber(capacity, 2)} A`}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <code className="block rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            {threePhase
                              ? 'ΔV = √3 × Rθ × L × Ib'
                              : 'ΔV = 2 × Rθ × L × Ib'}
                          </code>
                          <span className="mt-1 block font-mono text-[9px] text-muted-foreground">
                            {formatNumber(drop.factor, 3)} ×{' '}
                            {formatNumber(drop.resistanceOhmM, 6)} ×{' '}
                            {circuit.lengthM} × {formatNumber(current, 2)} · θ ={' '}
                            {drop.temperatureC} °C
                          </span>
                        </td>
                        <td
                          className={`px-3 py-3 font-mono font-bold ${
                            totalDropPercent > (circuit.kind === 'FM' ? 5 : 3)
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {formatNumber(totalDropVolts, 2)} V ·{' '}
                          {formatNumber(totalDropPercent, 2)} %
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Modelo resistivo con R20 máxima de ficha Cu flexible y corrección
              a la temperatura del conductor (70 °C por defecto, no temperatura
              ambiente). No incluye reactancia, armónicos o arranques. Las
              caídas de alimentador y circuito se acumulan en porcentaje; los
              voltios totales se expresan sobre la tensión del circuito terminal
              (220 o 380 V). En TS mixtos es una estimación de diseño, no una
              verificación completa.
            </p>
          </div>
        </section>

        {/* Normative Reference Tables (AEA 90364) */}
        <NormativeReferenceTables />

        {/* Cost Options & References */}
        <section className="mt-5 rounded-2xl border bg-card p-4 shadow-sm print:break-before-page">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-700">
                <DollarSign className="size-4" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">
                  Costo y optimización ({activePanel.name})
                </p>
              </div>
              <h2 className="mt-1 text-lg font-semibold">
                Tres arquitecturas comparables
              </h2>
              <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
                Referencias editables en ARS, no cotizaciones actuales. Incluyen
                previsión para accesorios y armado. 18/24 M se estimaron
                proporcionalmente desde 36 M; verificar precio, filas y
                dimensiones reales del gabinete. Cañerías y conductores de campo
                no están incluidos.
              </p>
            </div>
            <Badge className="w-fit border border-emerald-200 bg-emerald-50 text-emerald-800">
              Propuesta activa: {selectedCost.title}
            </Badge>
          </div>

          <div className="mb-4 grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-800">
                Estimación integral del proyecto
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {projectCostSummary.byPanel.map((item) => (
                  <span
                    key={item.id}
                    className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-[10px] text-emerald-950"
                  >
                    {item.name}: <strong>{formatMoney(item.total)}</strong>
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-emerald-900/70">
                Suma gabinetes y dispositivos de todos los tableros. No incluye
                metros de cable, canalizaciones ni obra civil.
              </p>
            </div>
            <div className="rounded-lg bg-emerald-800 px-4 py-3 text-right text-white">
              <p className="text-[9px] uppercase tracking-wide text-emerald-100">
                Total estimado
              </p>
              <p className="font-mono text-xl font-black">
                {formatMoney(projectCostSummary.total)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {costOptions
              .filter((option) => option.id !== 'continuity')
              .map((option) => (
                <CostOptionCard
                  key={option.id}
                  option={option}
                  selected={activePanel.architecture === option.id}
                  recommended={option.id === recommendedCost.id}
                  publicVenue={isPublicVenue}
                  onSelect={() => updateActivePanel('architecture', option.id)}
                />
              ))}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.4fr)]">
            <div className="rounded-xl border bg-slate-950 p-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Qué encarece esta propuesta
                  </p>
                  <h3 className="mt-1 font-semibold">
                    Mayores impulsores de costo
                  </h3>
                </div>
                <TrendingUp className="size-5 text-amber-300" />
              </div>
              <div className="mt-4 space-y-3">
                {selectedDrivers.map((driver, index) => {
                  const percent =
                    selectedCost.total > 0
                      ? (driver.value / selectedCost.total) * 100
                      : 0;
                  return (
                    <div key={driver.label}>
                      <div className="mb-1 flex justify-between gap-3 text-xs">
                        <span>
                          {index + 1}. {driver.label}
                        </span>
                        <span className="font-mono font-semibold">
                          {formatMoney(driver.value)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-amber-300"
                          style={{ width: `${Math.max(4, percent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="print-hide rounded-xl border bg-muted/20 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Catálogo editable
                  </p>
                  <h3 className="font-semibold">
                    Ajustá con tus cotizaciones locales
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPrices(DEFAULT_PRICES)}
                >
                  <RotateCcw data-icon="inline-start" /> Restaurar precios
                </Button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <PriceInput
                  label="Térmica 2P"
                  value={prices.mcb2P}
                  onChange={(value) =>
                    setPrices((current) => ({ ...current, mcb2P: value }))
                  }
                />
                <PriceInput
                  label="Térmica / IGA 4P"
                  value={prices.mcb4P}
                  onChange={(value) =>
                    setPrices((current) => ({ ...current, mcb4P: value }))
                  }
                />
                <PriceInput
                  label="Diferencial 2P"
                  value={prices.rcd2P}
                  onChange={(value) =>
                    setPrices((current) => ({ ...current, rcd2P: value }))
                  }
                />
                <PriceInput
                  label="Diferencial 4P"
                  value={prices.rcd4P}
                  onChange={(value) =>
                    setPrices((current) => ({ ...current, rcd4P: value }))
                  }
                />
                <PriceInput
                  label="Diferencial selectivo S 2P"
                  value={prices.selectiveRcd2P}
                  onChange={(value) =>
                    setPrices((current) => ({
                      ...current,
                      selectiveRcd2P: value,
                    }))
                  }
                />
                <PriceInput
                  label="Diferencial selectivo S 4P"
                  value={prices.selectiveRcd4P}
                  onChange={(value) =>
                    setPrices((current) => ({
                      ...current,
                      selectiveRcd4P: value,
                    }))
                  }
                />
                <PriceInput
                  label="DPS 1P+N / 2P"
                  value={prices.spd2P}
                  onChange={(value) =>
                    setPrices((current) => ({ ...current, spd2P: value }))
                  }
                />
                <PriceInput
                  label="DPS 3P+N / 4P"
                  value={prices.spd4P}
                  onChange={(value) =>
                    setPrices((current) => ({ ...current, spd4P: value }))
                  }
                />
                <PriceInput
                  label="Gabinete 16 M"
                  value={prices.cabinet16}
                  onChange={(value) =>
                    setPrices((current) => ({ ...current, cabinet16: value }))
                  }
                />
                <PriceInput
                  label="Gabinete 18 M (estimado)"
                  value={prices.cabinet18}
                  onChange={(value) =>
                    setPrices((current) => ({ ...current, cabinet18: value }))
                  }
                />
                <PriceInput
                  label="Gabinete 24 M (estimado)"
                  value={prices.cabinet24}
                  onChange={(value) =>
                    setPrices((current) => ({ ...current, cabinet24: value }))
                  }
                />
                <PriceInput
                  label="Gabinete 36 M"
                  value={prices.cabinet36}
                  onChange={(value) =>
                    setPrices((current) => ({ ...current, cabinet36: value }))
                  }
                />
                <PriceInput
                  label="Gabinete 54 M"
                  value={prices.cabinet54}
                  onChange={(value) =>
                    setPrices((current) => ({ ...current, cabinet54: value }))
                  }
                />
                <PriceInput
                  label="Gabinete 72 M"
                  value={prices.cabinet72}
                  onChange={(value) =>
                    setPrices((current) => ({ ...current, cabinet72: value }))
                  }
                />
                <PriceInput
                  label="Recargo diferencial Tipo A"
                  value={prices.typeAPremium}
                  suffix="%"
                  onChange={(value) =>
                    setPrices((current) => ({
                      ...current,
                      typeAPremium: value,
                    }))
                  }
                />
                <PriceInput
                  label="Accesorios"
                  value={prices.accessoriesPercent}
                  suffix="%"
                  onChange={(value) =>
                    setPrices((current) => ({
                      ...current,
                      accessoriesPercent: value,
                    }))
                  }
                />
                <PriceInput
                  label="Armado + contingencia"
                  value={prices.assemblyPercent}
                  suffix="%"
                  onChange={(value) =>
                    setPrices((current) => ({
                      ...current,
                      assemblyPercent: value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <ExternalLink className="size-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold">
                Fuentes de precios y comparaciones
              </h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {PRICE_SOURCES.map((source) => (
                <a
                  key={source.label}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-lg border bg-background p-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                >
                  <p className="text-xs font-semibold group-hover:text-emerald-900">
                    {source.label}
                  </p>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    {source.detail}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Footer info */}
        <section className="mt-5 grid gap-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="grid size-9 place-items-center rounded-lg bg-sky-100">
            <Info className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">
              Marco de cálculo y límites
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-sky-900/80">
              Herramienta de predimensionado basada en AEA 90364 (Partes 0–3 y 6
              vigentes, Secciones 771 y 718), criterios de tableros IEC 61439 y
              Ordenanza General 72/83 de Mendoza. No reemplaza proyecto,
              memoria, firma, ensayos ni visación municipal.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <a
              className="rounded-lg border border-sky-300 bg-white px-3 py-2 font-medium hover:bg-sky-100"
              href="https://www.sanrafael.gov.ar/archivos-muni/obras/edificacion.pdf"
              target="_blank"
              rel="noreferrer"
            >
              Código municipal
            </a>
            <a
              className="rounded-lg border border-sky-300 bg-white px-3 py-2 font-medium hover:bg-sky-100"
              href="https://aea.org.ar/wp-content/uploads/2017/10/90364-7-718-1.pdf"
              target="_blank"
              rel="noreferrer"
            >
              AEA 718
            </a>
          </div>
        </section>
      </section>
      <ProjectPrintSummary
        projectName={projectName}
        panels={panels}
        calculations={panelCalculations}
        profile={profile}
        publicVenue={isPublicVenue}
      />
    </main>
  );
}

function ProjectPrintSummary({
  projectName,
  panels,
  calculations,
  profile = INITIAL_PROFILE,
  publicVenue = false,
}: {
  projectName: string;
  panels: Panel[];
  calculations: Map<string, PanelCalculation>;
  profile?: ProjectProfile;
  publicVenue?: boolean;
}) {
  const projectDiagnostics = diagnoseProject(panels, profile, publicVenue);
  return (
    <section className="print-sheet hidden p-0 print:block">
      {panels.map((panel) => {
        const calculation = calculations.get(panel.id);
        const panelDiagnostics = calculation
          ? diagnosePanel(panel, calculation, panels, calculations)
          : ['No se pudieron calcular los datos de este tablero.'];
        const printWarnings = [...projectDiagnostics, ...panelDiagnostics];
        const children = panels.filter(
          (child) => child.type === 'TS' && child.parentId === panel.id,
        );
        return (
          <article
            key={panel.id}
            className="break-after-page border-2 border-slate-900 p-4 last:break-after-auto"
          >
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em]">
                  Planilla multi-tablero
                </p>
                <h1 className="text-xl font-bold">{projectName}</h1>
                <h2 className="mt-1 text-base font-semibold">
                  {panel.name} · {panel.type}
                </h2>
              </div>
              <div className="text-right text-[10px]">
                <p>San Rafael · Mendoza</p>
                <p>
                  {panel.supply === 'tri'
                    ? '380/220 V trifásico'
                    : '220 V monofásico'}
                </p>
              </div>
            </div>

            <div className="my-3 grid grid-cols-5 gap-2 text-[10px]">
              <div className="border p-2">
                <strong>Instalada</strong>
                <br />
                {formatPower(calculation?.installedVA ?? 0)} ·{' '}
                {formatNumber((calculation?.activeInstalledW ?? 0) / 1000, 2)}{' '}
                kW
              </div>
              <div className="border p-2">
                <strong>Demanda</strong>
                <br />
                {formatPower(calculation?.demandVA ?? 0)}
              </div>
              <div className="border p-2">
                <strong>Ib</strong>
                <br />
                {formatNumber(calculation?.mainCurrent ?? 0, 1)} A
              </div>
              <div className="border p-2">
                <strong>Cabecera</strong>
                <br />
                {ratingLabel(calculation?.mainBreaker)}
              </div>
              <div className="border p-2">
                <strong>Gabinete</strong>
                <br />
                {calculation?.rows ?? 1} × {panel.modulesPerRow} M
              </div>
            </div>

            {panel.type === 'TS' && (
              <p className="mb-3 border border-sky-700 p-2 text-[10px]">
                <strong>Alimentador desde TP:</strong> TM{' '}
                {panel.feederBreaker ?? 32} A · {panel.feederConductor ?? 6} mm²
                · {panel.feederLengthM ?? 15} m ·{' '}
                {panel.feederPhase ?? (panel.supply === 'tri' ? '3Φ' : 'L1')} ·
                ΔV {formatNumber(calculation?.feederDrop.percent ?? 0, 2)} % ·{' '}
                {feederWiringLabel(panel)}
              </p>
            )}
            {panel.type === 'TP' && (
              <p className="mb-3 border border-sky-700 p-2 text-[10px]">
                <strong>Diferencial general del TP:</strong>{' '}
                {panelTpDifferentialMode(panel) === 'none'
                  ? 'no incluido; criterio condicionado a líneas seccionales Clase II.'
                  : panelTpDifferentialMode(panel) === 'selective300'
                    ? '300 mA, Tipo S; coordinación pendiente de demostrar.'
                    : '30 mA instantáneo; revisar riesgo de corte total y uso exclusivo como tablero único.'}
              </p>
            )}

            <section className={`mb-3 border p-2 text-[10px] ${printWarnings.length ? 'border-amber-700' : 'border-emerald-700'}`}>
              <strong>
                {printWarnings.length
                  ? `Advertencias del proyecto y de ${panel.name}`
                  : `Sin advertencias preliminares en ${panel.name}`}
              </strong>
              {printWarnings.length > 0 && (
                <ul className="mt-1 list-disc pl-4">
                  {printWarnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              )}
              <p className="mt-1">
                Mínimos de conductores: AEA 90364-7-771, Corrigendum 2 ({AEA_CONDUCTOR_REFERENCE_URL}).
              </p>
              {publicVenue && (
                <>
                  <p className="mt-1">
                    Cables interiores: {profile.interiorCableStandard === 'iram62267'
                      ? 'LSOH IRAM 62267 declarado; verificar marcación y certificación.'
                      : 'especificación LSOH IRAM 62267 pendiente o no declarada.'}
                  </p>
                  <p className="mt-1">
                    Iluminación de emergencia:{' '}
                    {profile.emergencySystem === 'autonomous'
                      ? 'equipos autónomos con batería incorporada (AEA 718.556.5.2.2 / IRAM-AADL J 2027) alimentados desde circuitos IUG.'
                      : 'circuito centralizado EMG en tablero con protección diferencial exclusiva (AEA 718.556.2).'}
                  </p>
                </>
              )}
            </section>

            {children.length > 0 && (
              <div className="mb-3">
                <h3 className="mb-1 text-xs font-bold">
                  Alimentadores a tableros seccionales
                </h3>
                <table className="w-full border-collapse text-[9px]">
                  <thead>
                    <tr>
                      <th className="border p-1">Destino</th>
                      <th className="border p-1">TM</th>
                      <th className="border p-1">Cable</th>
                      <th className="border p-1">Fase</th>
                      <th className="border p-1">ΔV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {children.map((child) => (
                      <tr key={child.id}>
                        <td className="border p-1">{child.name}</td>
                        <td className="border p-1">
                          {child.feederBreaker ?? 32} A
                        </td>
                        <td className="border p-1">
                          {child.feederConductor ?? 6} mm² ·{' '}
                          {child.feederLengthM ?? 15} m
                        </td>
                        <td className="border p-1">
                          {child.feederPhase ??
                            (child.supply === 'tri' ? '3Φ' : 'L1')}
                        </td>
                        <td className="border p-1">
                          {formatNumber(
                            calculations.get(child.id)?.feederDrop.percent ?? 0,
                            2,
                          )}{' '}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h3 className="mb-1 text-xs font-bold">Circuitos terminales</h3>
            <table className="w-full border-collapse text-[9px]">
              <thead>
                <tr>
                  <th className="border p-1">ID</th>
                  <th className="border p-1">Uso</th>
                  <th className="border p-1">Tipo</th>
                  <th className="border p-1">Carga</th>
                  <th className="border p-1">Fase</th>
                  <th className="border p-1">Ib / TM / Iz</th>
                  <th className="border p-1">Cable</th>
                  <th className="border p-1">Long.</th>
                  <th className="border p-1">ΔV</th>
                </tr>
              </thead>
              <tbody>
                {panel.circuits.map((circuit, index) => (
                  <tr key={circuit.id}>
                    <td className="border p-1">C{index + 1}</td>
                    <td className="border p-1">{circuit.name}</td>
                    <td className="border p-1">{circuit.kind}</td>
                    <td className="border p-1">
                      {formatPower(circuitPower(circuit))}
                    </td>
                    <td className="border p-1">{circuitPhaseLabel(panel, circuit)}</td>
                    <td className="border p-1">
                      {formatNumber(circuitCurrent(circuit, panel.supply), 1)} /{' '}
                      {circuit.breaker} /{' '}
                      {conductorAmpacity(
                        circuit.conductor,
                        circuit.phase === '3Φ',
                        circuit.ampacity,
                      ) ?? 'pendiente'}{' '}
                      A
                    </td>
                    <td className="border p-1">{circuit.conductor} mm²</td>
                    <td className="border p-1">{circuit.lengthM} m</td>
                    <td className="border p-1">
                      {formatNumber(
                        voltageDrop(circuit, panel.supply).percent +
                          (panel.type === 'TS'
                            ? (calculation?.feederDrop.percent ?? 0)
                            : 0),
                        2,
                      )}{' '}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs font-semibold">
              {panel.type === 'TP' && panel.circuits.length === 0
                ? `TP de tránsito · ${tpDifferentialDevice(panel) ? '1 diferencial general' : 'sin diferencial general'}. Los ID de 30 mA se resuelven aguas abajo.`
                : `${architectureDetails(panel.architecture).title} · ${differentialGroups(panel).length} diferenciales terminales. ${architectureDetails(panel.architecture).behavior}`}
            </p>
            {publicVenue && panel.architecture === 'residential' && (
              <p className="mt-2 text-xs font-bold">
                ADVERTENCIA: ID único domiciliario aplicado a pública
                concurrencia. No se valida la separación de emergencia ni el
                cumplimiento de AEA 718.
              </p>
            )}
            <p className="mt-3 text-[8px]">
              Predimensionado preliminar: verificar instalación, selectividad,
              cortocircuito, puesta a tierra, canalizaciones y documentación
              profesional. Las siguientes vistas son esquemáticas, no planos a
              escala ni conexiones de ejecución.
            </p>
            {calculation && (
              <>
                <section className="print-diagram mt-6 break-before-page">
                  <h3 className="mb-3 text-lg font-bold">
                    {panel.name} · Vista frontal DIN
                  </h3>
                  <FeederReviews
                    panel={panel}
                    panels={panels}
                    calculations={calculations}
                  />
                  <PanelFront
                    devices={buildPanelDevices(
                      panel,
                      children,
                      calculation.mainBreaker,
                    )}
                    rows={calculation.rows}
                    modulesPerRow={panel.modulesPerRow}
                    panelType={panel.type}
                    hasDps={panelHasDps(panel)}
                    hasFeeders={children.length > 0}
                  />
                </section>
                <section className="print-diagram mt-6 break-before-page">
                  <h3 className="mb-3 text-lg font-bold">
                    {panel.name} · Esquema unifilar funcional
                  </h3>
                  <SingleLineDiagram
                    panel={panel}
                    calculation={calculation}
                    childPanels={children}
                  />
                </section>
                <section className="print-diagram mt-6 break-before-page">
                  <h3 className="mb-3 text-lg font-bold">
                    {panel.name} · Cuadro multifilar preliminar
                  </h3>
                  <MultiLineDiagram
                    panel={panel}
                    childPanels={children}
                    calculations={calculations}
                  />
                </section>
              </>
            )}
          </article>
        );
      })}
    </section>
  );
}

function NormativeReferenceTables() {
  const conductorIzRows = [
    {
      section: '1,5',
      mono: '15 A',
      tri: '14 A',
      breaker: 'Según Ib ≤ In ≤ Iz',
      r20: '13,30 Ω/km',
      pe: '2,5 mm²',
      highlight: false,
    },
    {
      section: '2,5',
      mono: '21 A',
      tri: '18 A',
      breaker: 'Según Ib ≤ In ≤ Iz',
      r20: '7,98 Ω/km',
      pe: '2,5 mm²',
      highlight: true,
    },
    {
      section: '4,0',
      mono: '28 A',
      tri: '25 A',
      breaker: 'Según Ib ≤ In ≤ Iz',
      r20: '4,95 Ω/km',
      pe: '4,0 mm²',
      highlight: false,
    },
    {
      section: '6,0',
      mono: '36 A',
      tri: '32 A',
      breaker: 'Según Ib ≤ In ≤ Iz',
      r20: '3,30 Ω/km',
      pe: '6,0 mm²',
      highlight: false,
    },
    {
      section: '10,0',
      mono: '50 A',
      tri: '44 A',
      breaker: 'Según Ib ≤ In ≤ Iz',
      r20: '1,91 Ω/km',
      pe: '10,0 mm²',
      highlight: false,
    },
    {
      section: '16,0',
      mono: '66 A',
      tri: '59 A',
      breaker: 'Según Ib ≤ In ≤ Iz',
      r20: '1,21 Ω/km',
      pe: '16,0 mm²',
      highlight: false,
    },
    {
      section: '25,0',
      mono: '88 A',
      tri: '77 A',
      breaker: 'Según Ib ≤ In ≤ Iz',
      r20: '0,78 Ω/km',
      pe: '16,0 mm²',
      highlight: false,
    },
    {
      section: '35,0',
      mono: '109 A',
      tri: '96 A',
      breaker: 'Según Ib ≤ In ≤ Iz',
      r20: '0,554 Ω/km',
      pe: '16,0 mm²',
      highlight: false,
    },
  ];

  const circuitTypeRows = [
    {
      kind: 'Iluminación de Uso General',
      code: 'IUG',
      minSection: '1,5 mm²',
      maxBreaker: 'Según Ib ≤ In ≤ Iz',
      dest: 'Bocas fijas de iluminación y tomas de servicio exclusivos de luminarias (máx. 15 bocas).',
    },
    {
      kind: 'Tomacorrientes de Uso General',
      code: 'TUG',
      minSection: '2,5 mm²',
      maxBreaker: 'Según Ib ≤ In ≤ Iz',
      dest: 'Tomacorrientes estándar de 10 A para aparatos portátiles monofásicos (máx. 15 bocas).',
    },
    {
      kind: 'Iluminación de Uso Especial',
      code: 'IUE',
      minSection: '2,5 mm²',
      maxBreaker: 'Según Ib ≤ In ≤ Iz',
      dest: 'Iluminación a la intemperie o potencias unitarias elevadas por boca (máx. 12 bocas).',
    },
    {
      kind: 'Tomacorrientes de Uso Especial',
      code: 'TUE',
      minSection: '2,5 mm²',
      maxBreaker: 'Según Ib ≤ In ≤ Iz',
      dest: 'Tomas de 20 A para cargas específicas (aire acondicionado, motores, hornos, máx. 12 bocas).',
    },
    {
      kind: 'Líneas Seccionales (Alimentador TP → TS)',
      code: 'L. Sec.',
      minSection: '2,5 mm²',
      maxBreaker: 'Según Iz calculada',
      dest: 'Conducción entre Tablero Principal y Tableros Seccionales aguas abajo.',
    },
    {
      kind: 'Línea Principal (Medidor → TP)',
      code: 'L. Princ.',
      minSection: '4,0 mm²',
      maxBreaker: 'Según demanda',
      dest: 'Acometida desde bornes del medidor de energía hasta el interruptor general del TP.',
    },
    {
      kind: 'Conductor de Protección (PE / Tierra)',
      code: 'PE',
      minSection: '2,5 mm² / Igual a Fase',
      maxBreaker: 'Sin interruptor',
      dest: 'Conductor verde-amarillo continuo a todas las masas metálicas y bornes de tierra de tomas.',
    },
    {
      kind: 'Conductor a Electrodo (Jabalina)',
      code: 'PAT',
      minSection: '4,0 mm² (protegido) / 10 mm² (desnudo)',
      maxBreaker: 'Directo a jabalina',
      dest: 'Conexión entre barra equipotencial del TP y jabalina de puesta a tierra (RA ≤ 10 Ω).',
    },
    {
      kind: 'Retornos de Interruptores de Efecto',
      code: 'Retorno',
      minSection: '1,5 mm²',
      maxBreaker: 'Protegido por TM de IUG',
      dest: 'Conductor entre interruptor/llave de efecto y el portalámparas o artefacto.',
    },
  ];

  return (
    <section className="order-last mt-5 overflow-hidden rounded-2xl border bg-card shadow-sm print:break-before-page">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b bg-slate-950 p-4 text-white sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-amber-300">
            <BookOpenCheck className="size-4" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">
              Anexo de predimensionado · referencias verificables
            </p>
          </div>
          <h2 className="mt-1 text-lg font-semibold">
            Tablas de Conductores por Amperaje y Secciones Mínimas por Conexión
          </h2>
          <p className="mt-1 max-w-3xl text-xs text-slate-400">
            Los mínimos se basan en AEA 90364-7-771 Corrigendum 2. Las capacidades Iz son valores de catálogo para Cu/PVC 70 °C y deben reemplazarse por la ficha del cable y las condiciones reales del proyecto.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="w-fit border border-amber-300/20 bg-amber-300/10 text-amber-200">
            AEA 90364-7-770 / 771
          </Badge>
          <Badge className="w-fit border border-sky-300/20 bg-sky-300/10 text-sky-200">
            IRAM 2183 · IRAM 62267
          </Badge>
        </div>
      </div>

      <div className="space-y-6 p-4">
        {/* TABLA 1 */}
        <div className="space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-md bg-amber-100 font-mono text-xs font-bold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                  1
                </span>
                <h3 className="text-sm font-bold sm:text-base">
                  Tabla 1: Capacidad Iz preliminar de catálogo
                </h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Referencia de producto Cu/PVC 70 °C. No implica que todo cable LS0H sea de 90 °C ni reemplaza la declaración de fabricante.
              </p>
            </div>
            <Badge className="w-fit border border-slate-200 bg-slate-100 text-[11px] text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200">
              Método B1 · 40 °C
            </Badge>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-background">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3.5 py-3">Sección Nominal</th>
                  <th className="px-3.5 py-3">Monofásica (2 cond. activos)</th>
                  <th className="px-3.5 py-3">Trifásica (3 cond. activos)</th>
                  <th className="px-3.5 py-3">Térmica (In) sugerida</th>
                  <th className="px-3.5 py-3">Resistencia R20 máx.</th>
                  <th className="px-3.5 py-3">Conductor PE</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono">
                {conductorIzRows.map((row) => (
                  <tr
                    key={row.section}
                    className={`transition-colors hover:bg-muted/30 ${
                      row.highlight ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''
                    }`}
                  >
                    <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                      {row.section} mm²
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-emerald-700 dark:text-emerald-400">
                      {row.mono}
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-sky-700 dark:text-sky-400">
                      {row.tri}
                    </td>
                    <td className="px-3.5 py-2.5 font-sans font-medium text-slate-800 dark:text-slate-200">
                      {row.breaker}
                    </td>
                    <td className="px-3.5 py-2.5 text-muted-foreground">
                      {row.r20}
                    </td>
                    <td className="px-3.5 py-2.5 font-sans text-muted-foreground">
                      {row.pe}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Fórmulas asociadas a Tabla 1 */}
          <div className="grid gap-3 pt-1 md:grid-cols-2 xl:grid-cols-3">
            <FormulaCard
              title="1. Corriente admisible corregida (Iz)"
              formula="Iz = Itabla × ft × fa"
              substitution="ft (Temp.): 20°C=1,29 · 30°C=1,15 · 40°C=1,00 | fa (Agrup.): 1 cto=1,00 · 2 ctos=0,80 · 3 ctos=0,70"
              result="Iz real corregida (A)"
              note="Si los conductores comparten cañería o el ambiente no es de 40 °C, la capacidad de corriente se reduce obligatoriamente por estos factores."
            />
            <FormulaCard
              title="2. Regla de coordinación y protección"
              formula="Ib ≤ In ≤ Iz  y  I2 ≤ 1,45 × Iz"
              substitution="Ib (carga) ≤ In (calibre termomagnética) ≤ Iz (capacidad admisible conductor)"
              result="In coordinada"
              note="Para termomagnéticas IEC 60898 (curvas B, C, D), I2 = 1,45 × In. Cumplir In ≤ Iz garantiza la protección del conductor contra sobrecargas continuas."
            />
            <FormulaCard
              title="3. Resistencia óhmica con la temperatura"
              formula="Rθ = R20 × [1 + 0,00393 × (θ − 20)]"
              substitution="R20 (20 °C) corregida a θ = 70 °C (régimen continuo Cu/PVC) o θ = 90 °C (XLPE/LS0H)"
              result="R70 = 1,1965 × R20"
              note="La resistividad del cobre aumenta con la temperatura. El dimensionado por caída de tensión debe evaluar la resistencia a la temperatura de servicio."
            />
          </div>
        </div>

        <Separator />

        {/* TABLA 2 */}
        <div className="space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-md bg-sky-100 font-mono text-xs font-bold text-sky-900 dark:bg-sky-900/40 dark:text-sky-200">
                  2
                </span>
                <h3 className="text-sm font-bold sm:text-base">
                  Tabla 2: Mínimos y reglas de diseño por destino
                </h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Secciones mínimas según AEA 90364-7-771 Corrigendum 2. Los máximos de puntos y protecciones aquí indicados son criterios conservadores del proyecto cuando no figura una regla normativa verificada.
              </p>
            </div>
            <Badge className="w-fit border border-sky-200 bg-sky-50 text-[11px] text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
              Secciones Mínimas Obligatorias
            </Badge>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-background">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3.5 py-3">Tipo de Circuito / Conexión</th>
                  <th className="px-3.5 py-3">Sigla</th>
                  <th className="px-3.5 py-3">Sección Mínima</th>
                  <th className="px-3.5 py-3">Protección / regla de diseño</th>
                  <th className="px-3.5 py-3">Destino y Criterio Normativo</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {circuitTypeRows.map((row) => (
                  <tr key={row.code + row.kind} className="transition-colors hover:bg-muted/30">
                    <td className="px-3.5 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                      {row.kind}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="inline-block rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                        {row.code}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {row.minSection}
                    </td>
                    <td className="px-3.5 py-2.5 font-sans font-medium text-slate-800 dark:text-slate-200">
                      {row.maxBreaker}
                    </td>
                    <td className="px-3.5 py-2.5 text-muted-foreground">
                      {row.dest}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Fórmulas asociadas a Tabla 2 */}
          <div className="grid gap-3 pt-1 md:grid-cols-2 xl:grid-cols-3">
            <FormulaCard
              title="4. Criterio de dimensionamiento de sección"
              formula="Sadoptada = máx(Smínima_normativa, S_Iz, S_ΔV)"
              substitution="Smínima (según tipo de cto.) · S_Iz (In ≤ Iz corregida) · S_ΔV (caída ≤ límite)"
              result="Sección comercial final"
              note="La sección adoptada debe satisfacer simultáneamente la exigencia mínima reglamentaria, la capacidad térmica admisible y la verificación de caída de tensión."
            />
            <FormulaCard
              title="5. Caída de tensión máxima admisible (ΔV)"
              formula="1Φ: ΔV = 2×Rθ×L×Ib  ·  3Φ: ΔV = √3×Rθ×L×Ib"
              substitution="ΔV% = 100 × ΔV / Vnom (220 V en 1Φ · 380 V en 3Φ)"
              result="ΔV% ≤ Límite AEA"
              note="Límites reglamentarios AEA: Iluminación y tomas ΔV ≤ 3,0 % · Fuerza motriz (motores) ΔV ≤ 5,0 % · Líneas seccionales (alimentador TP→TS) ΔV ≤ 1,0 % recomendado."
            />
            <FormulaCard
              title="6. Corriente de empleo y potencia (Ib)"
              formula="1Φ: Ib = S / 220  ·  3Φ: Ib = S / (√3 × 380)"
              substitution="P = S × FP (Potencia activa en W) · Ib calculada con la potencia aparente S (VA)"
              result="Ib de diseño (A)"
              note="La corriente de empleo Ib determina la carga sobre el circuito. El factor de potencia (FP) relaciona la potencia activa con la aparente sin reducir la corriente Ib."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function DistributionArchitectureGuide() {
  return (
    <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-5 text-white shadow-lg print:break-before-page">
      <div className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-amber-400">
            <Building2 className="size-4" />
            <p className="text-[11px] font-bold uppercase tracking-[0.14em]">
              Criterio Normativo AEA 771 / 718 y Ordenanza 72/83
            </p>
          </div>
          <h2 className="mt-1 text-lg font-bold">
            Distribución Física y Funcional: Tablero Principal (TP) vs Tableros
            Seccionales (TS)
          </h2>
        </div>
        <Badge className="w-fit border border-amber-400/30 bg-amber-400/10 text-amber-300">
          Buenas prácticas de ingeniería
        </Badge>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Step 1: Acometida y TP */}
        <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-4">
          <div>
            <div className="flex items-center justify-between">
              <Badge className="bg-amber-400 text-slate-950 font-bold">
                1. Acometida y TP
              </Badge>
              <span className="text-[10px] text-slate-400">
                Ubicación según distribuidora y proyecto
              </span>
            </div>
            <h3 className="mt-2.5 text-sm font-semibold text-white">
              Tablero Principal (TP)
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Ubicado en nicho exterior o línea municipal. Su función es brindar
              corte general y proteger la línea seccional (alimentador).
            </p>
            <div className="mt-3.5 space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-amber-400">•</span>
                <span>
                  <strong>IGA Cabecera:</strong> Calibre y curva sujetos a Iz,
                  cortocircuito y coordinación. El 15 % usado es solo un margen
                  de diseño.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-violet-400">•</span>
                <span>
                  <strong>Diferencial general:</strong> Configurable. Sin ID si
                  la línea seccional es Clase II; si la autoridad lo exige,
                  evaluar 300 mA selectivo Tipo S y documentar coordinación.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-sky-400">•</span>
                <span>
                  <strong>Térmica Alimentador:</strong> Protección visible y
                  dedicada del cable hacia el TS1.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-emerald-400">•</span>
                <span>
                  <strong>Puesta a Tierra:</strong> Jabalina principal con RA ≤
                  10 Ω (Ord. 72/83).
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/5 p-2 text-[11px] text-amber-200/90">
            🛡️ <em>Envolvente:</em> Gabinete aislante, estanco según exposición,
            con señalización de riesgo eléctrico y selección verificada para
            intemperie.
          </div>
        </div>

        {/* Step 2: Línea Seccional */}
        <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-4">
          <div>
            <div className="flex items-center justify-between">
              <Badge className="bg-sky-500 text-white font-bold">
                2. Línea Seccional
              </Badge>
              <span className="text-[10px] text-slate-400">
                Tramo alimentador
              </span>
            </div>
            <h3 className="mt-2.5 text-sm font-semibold text-white">
              Alimentador entre TP y TS1
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Cable y canalización dimensionados por Ib/In/Iz, caída de tensión,
              cortocircuito y condiciones reales del recorrido.
            </p>
            <div className="mt-3.5 space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-sky-400">•</span>
                <span>
                  <strong>Caída Acumulada:</strong> Se recomienda hasta 1 % en
                  la línea seccional y 3 % total para cargas sin motor.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-sky-400">•</span>
                <span>
                  <strong>Clase II:</strong> Cable IRAM 2178 subterráneo, o
                  conductores dentro de cañería plástica continua con
                  envolventes aislantes, según el proyecto verificado.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-sky-400">•</span>
                <span>
                  <strong>Conductor PE:</strong> El conductor de protección debe
                  acompañar por el mismo conducto.
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-sky-400/20 bg-sky-400/10 p-2 text-[11px] text-sky-200">
            ⚡ <em>Continuidad:</em> Un ID instantáneo de 30 mA en el pilar puede
            apagar iluminación, audio y climatización a la vez. En pública
            concurrencia, esa pérdida total de servicio debe evitarse mediante
            arquitectura y coordinación verificadas.
          </div>
        </div>

        {/* Step 3: Tablero Seccional */}
        <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-4">
          <div>
            <div className="flex items-center justify-between">
              <Badge className="bg-emerald-500 text-white font-bold">
                3. Tablero Seccional
              </Badge>
              <span className="text-[10px] text-slate-400">Interior local</span>
            </div>
            <h3 className="mt-2.5 text-sm font-semibold text-white">
              Tablero Seccional (TS1)
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Ubicado en el interior a mano (altura de maniobra 0,90 m a 2,00
              m). Distribuye y protege a los usuarios y circuitos finales.
            </p>
            <div className="mt-3.5 space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-emerald-400">•</span>
                <span>
                  <strong>Corte Local:</strong> Interruptor de cabecera para
                  desenergizar el tablero en el lugar.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-emerald-400">•</span>
                <span>
                  <strong>Cables interiores:</strong> Para pública concurrencia,
                  el proyecto adopta LSOH IRAM 62267; verificar marcación,
                  certificación y alcance exigido en la inspección.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-emerald-400">•</span>
                <span>
                  <strong>Diferenciales 30 mA:</strong> Económica: normal + EMG.
                  Equilibrada: iluminación + tomas/equipos + EMG. La opción
                  domiciliaria usa un ID común y se advierte en salones.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-emerald-400">•</span>
                <span>
                  <strong>Emergencia (AEA 718):</strong> Circuito EMG
                  independiente que no comparta ID con tomas.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-emerald-400">•</span>
                <span>
                  <strong>Reserva DIN:</strong> Política de diseño: al menos 20
                  % del total libre y 2 módulos. Verificar disposición y
                  envolvente real.
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-2 text-[11px] text-emerald-200">
            🔒 <em>Pública Concurrencia:</em> Debe contar con puerta cerrada con
            llave para evitar acceso de personas no autorizadas.
          </div>
        </div>
      </div>
    </section>
  );
}

function FormulaCard({
  title,
  formula,
  substitution,
  result,
  note,
}: {
  title: string;
  formula: string;
  substitution: string;
  result: string;
  note: string;
}) {
  return (
    <article className="rounded-xl border bg-background p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
        {title}
      </p>
      <code className="mt-2 block rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 font-mono text-xs font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        {formula}
      </code>
      <div className="mt-2 grid grid-cols-[1fr_auto] items-end gap-3">
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
            Reemplazo
          </p>
          <p className="mt-0.5 break-words font-mono text-[10px] leading-relaxed text-slate-600 dark:text-slate-400">
            {substitution}
          </p>
        </div>
        <p className="whitespace-nowrap font-mono text-lg font-black tracking-tight text-slate-950 dark:text-white">
          {result}
        </p>
      </div>
      <p className="mt-2 border-t pt-2 text-[9px] leading-relaxed text-muted-foreground">
        {note}
      </p>
    </article>
  );
}

function QuickNumber({
  label,
  value,
  suffix,
  min,
  step = 1,
  dark = false,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  min?: number;
  step?: number;
  dark?: boolean;
  onChange: (value: number) => void;
}) {
  const fieldId = `quick-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={fieldId}
        className={`text-xs ${dark ? 'text-slate-400' : 'text-muted-foreground'}`}
      >
        {label}
      </Label>
      <div className="relative">
        <Input
          id={fieldId}
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(event) =>
            onChange(
              finiteNumber(
                event.target.value,
                value,
                0,
                suffix === '%' ? 1000 : 1e12,
              ),
            )
          }
          className={`pr-12 font-mono ${dark ? 'border-white/15 bg-white/10 text-white' : ''}`}
        />
        <span
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] ${
            dark ? 'text-slate-400' : 'text-muted-foreground'
          }`}
        >
          {suffix}
        </span>
      </div>
    </div>
  );
}

function ChecklistToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-background p-2.5 text-xs font-medium hover:bg-muted/30">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-emerald-700"
      />
      {label}
    </label>
  );
}

function CostOptionCard({
  option,
  selected,
  recommended,
  publicVenue,
  onSelect,
}: {
  option: CostOption;
  selected: boolean;
  recommended: boolean;
  publicVenue: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      className={`relative rounded-xl border p-4 transition-all ${
        selected
          ? 'border-emerald-400 bg-emerald-50 shadow-sm ring-1 ring-emerald-200 dark:bg-emerald-950/20'
          : 'bg-background hover:border-slate-300'
      }`}
    >
      {recommended && (
        <Badge className="mb-3 bg-emerald-700 text-white">
          Sugerida para este uso
        </Badge>
      )}
      <div className="flex items-center gap-2">
        <div
          className={`grid size-8 place-items-center rounded-lg ${
            selected
              ? 'bg-emerald-700 text-white'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          <ShieldCheck className="size-4" />
        </div>
        <div>
          <h3 className="text-base font-semibold">{option.title}</h3>
          <p className="text-xs text-muted-foreground">{option.subtitle}</p>
        </div>
      </div>
      <p className="mt-4 font-mono text-2xl font-black tracking-tight">
        {formatMoney(option.total)}
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Materiales: {formatMoney(option.material)} · {option.cabinetLabel} ·{' '}
        {option.modules} M requeridos
      </p>
      <Separator className="my-3" />
      <p className="mb-2 text-lg font-bold">
        {option.differentialCount} disyuntor
        {option.differentialCount === 1 ? '' : 'es'} · {option.nominalCount}{' '}
        previstos
      </p>
      <ul className="mb-3 space-y-1 text-xs">
        {option.groups.map((group) => (
          <li key={group.label}>
            <strong>{group.label}:</strong>{' '}
            {group.circuits.join(' · ') || 'reservado, sin circuitos'}
          </li>
        ))}
      </ul>
      {publicVenue && option.id === 'residential' && (
        <p className="mb-3 rounded-lg bg-amber-50 p-3 text-xs font-semibold text-amber-950">
          Solo vivienda como uso previsto. En este salón: todos los circuitos
          comparten ID, incluida EMG. Revisión obligatoria; no se valida como
          solución para pública concurrencia.
        </p>
      )}
      <div className="space-y-2 text-[11px] leading-relaxed">
        <p>
          <strong>Protección:</strong> {option.protection}
        </p>
        <p>
          <strong>Continuidad:</strong> {option.continuity}
        </p>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        La cantidad de ID no certifica un “mínimo reglamentario”. Verificar
        calibre, tipo, neutros por grupo, selectividad, puesta a tierra y
        servicios de seguridad.
      </p>
      <Button
        variant={selected ? 'default' : 'outline'}
        size="sm"
        className={`mt-4 w-full ${selected ? 'bg-emerald-700 hover:bg-emerald-800' : ''}`}
        onClick={onSelect}
        aria-pressed={selected}
      >
        {selected ? 'Propuesta aplicada' : 'Usar propuesta'}{' '}
        {!selected && <ArrowRight data-icon="inline-end" />}
      </Button>
    </article>
  );
}

function emergencyAutonomyDeclared(
  profile: Pick<ProjectProfile, 'emergencyAutonomyHours' | 'emergencyEvidence'>,
) {
  return (
    (profile.emergencyAutonomyHours ?? 0) >= 2 &&
    Boolean(profile.emergencyEvidence?.trim())
  );
}

function AmpacityEditor({
  section,
  threeLoaded,
  settings = {},
  onChange,
}: {
  section: number;
  threeLoaded: boolean;
  settings?: AmpacitySettings;
  onChange: (settings: AmpacitySettings) => void;
}) {
  const fieldId = useId();
  const declared = settings.mode === 'declared';
  const capacity = conductorAmpacity(section, threeLoaded, settings);
  const change = (patch: Partial<AmpacitySettings>) =>
    onChange({ ...settings, ...patch });
  return (
    <div className="space-y-3 text-xs">
      <label htmlFor={`${fieldId}-mode`} className="block">
        Base de corriente admisible (Iz)
        <NativeSelect
          id={`${fieldId}-mode`}
          className="mt-1 w-full"
          value={settings.mode ?? 'reference'}
          onChange={(e) =>
            change({
              mode: e.target.value as 'reference' | 'declared',
              conductorTemperatureC: 70,
            })
          }
        >
          <NativeSelectOption value="reference">
            Referencia Cu/PVC 70 °C · unipolares en cañería
          </NativeSelectOption>
          <NativeSelectOption value="declared">
            Iz corregida declarada · otra instalación / LS0H
          </NativeSelectOption>
        </NativeSelect>
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        {declared ? (
          <>
            <label htmlFor={`${fieldId}-iz`}>
              Iz corregida (A)
              <Input
                id={`${fieldId}-iz`}
                type="number"
                min="0"
                max="10000"
                value={settings.declaredA ?? 0}
                onChange={(e) =>
                  change({
                    declaredA: finiteNumber(e.target.value, 0, 0, 10000),
                  })
                }
              />
            </label>
            <label htmlFor={`${fieldId}-basis`}>
              Fuente y condiciones
              <Input
                id={`${fieldId}-basis`}
                maxLength={1000}
                value={settings.basis ?? ''}
                placeholder="Cable, sección, método, factores…"
                onChange={(e) => change({ basis: e.target.value })}
              />
            </label>
          </>
        ) : (
          <>
            <label>
              Temperatura ambiente
              <NativeSelect
                className="w-full"
                value={settings.ambientC ?? 40}
                onChange={(e) =>
                  change({ ambientC: Number(e.target.value) as 20 | 30 | 40 })
                }
              >
                {[20, 30, 40].map((t) => (
                  <NativeSelectOption key={t} value={t}>
                    {t} °C
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            <label>
              Circuitos agrupados
              <NativeSelect
                className="w-full"
                value={settings.groupedCircuits ?? 1}
                onChange={(e) =>
                  change({
                    groupedCircuits: Number(e.target.value) as 1 | 2 | 3,
                  })
                }
              >
                {[1, 2, 3].map((n) => (
                  <NativeSelectOption key={n} value={n}>
                    {n}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
          </>
        )}
        <label>
          Temperatura del conductor para ΔV
          <NativeSelect
            className="w-full"
            value={settings.conductorTemperatureC ?? 70}
            onChange={(e) =>
              change({
                conductorTemperatureC: Number(e.target.value) as 20 | 70 | 90,
              })
            }
          >
            <NativeSelectOption value="70">
              70 °C · servicio de referencia
            </NativeSelectOption>
            <NativeSelectOption value="20">
              20 °C · comparación en frío
            </NativeSelectOption>
            {declared && (
              <NativeSelectOption value="90">
                90 °C · aislación a justificar
              </NativeSelectOption>
            )}
          </NativeSelect>
        </label>
      </div>
      <p className="rounded-lg bg-muted p-2 font-semibold">
        {section} mm² · {threeLoaded ? 3 : 2} conductores cargados · Iz:{' '}
        {capacity === null
          ? 'pendiente de valor y fuente'
          : `${formatNumber(capacity, 2)} A`}
      </p>
      <p className="text-muted-foreground">
        Referencia:{' '}
        <a
          className="underline"
          href={CABLE_REFERENCE_URL}
          target="_blank"
          rel="noreferrer"
        >
          Prysmian Superastic, tabla p. 3
        </a>
        . Cu flexible/PVC, no LS0H. Se aplican los factores de ambiente y
        agrupamiento. Otra disposición, cable o neutro cargado por armónicos
        requiere datos específicos; una Iz declarada no se verifica
        automáticamente. ΔV conserva R20 de cobre de referencia, no un cálculo
        fasorial.
      </p>
    </div>
  );
}

function PriceInput({
  label,
  value,
  suffix = '$',
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const fieldId = `price-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="space-y-1">
      <Label htmlFor={fieldId} className="text-[10px] text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          id={fieldId}
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(event) =>
            onChange(
              finiteNumber(
                event.target.value,
                value,
                0,
                suffix === '%' ? 1000 : 1e12,
              ),
            )
          }
          className={
            suffix === '$' ? 'pl-7 font-mono text-xs' : 'pr-8 font-mono text-xs'
          }
        />
        <span
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground ${
            suffix === '$' ? 'left-3' : 'right-3'
          }`}
        >
          {suffix}
        </span>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 shadow-sm ${
        emphasis
          ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20'
          : 'bg-card'
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-lg font-bold tracking-tight ${
          emphasis ? 'text-amber-950 dark:text-amber-300' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function CompactNumber({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Input
      aria-label={label}
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(event) => onChange(Number(event.target.value))}
      className="ml-auto w-20 text-right font-mono text-xs"
    />
  );
}

function ProtectionGuide({
  panelType,
  hasDps,
  hasFeeders = false,
}: {
  panelType: PanelType;
  hasDps: boolean;
  hasFeeders?: boolean;
}) {
  const items = [
    {
      code: panelType === 'TP' ? 'IGA' : 'Corte',
      title:
        panelType === 'TP'
          ? 'Interruptor General Automático'
          : 'Interruptor-seccionador de corte local',
      description:
        panelType === 'TP'
          ? 'Corte general y protección principal contra sobrecargas y cortocircuitos.'
          : 'Maniobra y seccionamiento local, sin disparo automático por sobrecorriente. Su calibre no aumenta la capacidad del alimentador, protegido por la térmica del TP. Verificar categoría de empleo y coordinación con el fabricante.',
      swatch: 'bg-slate-800',
    },
    ...(hasDps
      ? [
          {
            code: 'DPS',
            title: 'Dispositivo de Protección contra Sobretensiones',
            description:
              'Limita sobretensiones transitorias y las deriva hacia tierra.',
            swatch: 'bg-violet-600',
          },
        ]
      : []),
    ...(hasFeeders
      ? [
          {
            code: 'Alim.',
            title: 'Térmica de Alimentador a Tablero Seccional (TS)',
            description:
              'Protege la línea seccional que sale desde el TP hacia un tablero seccional interior.',
            swatch: 'bg-sky-700',
          },
        ]
      : []),
    {
      code: 'ID',
      title: 'Interruptor Diferencial',
      description:
        panelType === 'TP' && hasFeeders
          ? 'Protege los circuitos propios del TP; los alimentadores se coordinan por separado.'
          : 'Detecta fugas de corriente en los circuitos terminales del tablero.',
      swatch: 'bg-sky-600',
    },
    {
      code: 'C1…',
      title: 'Interruptor termomagnético de circuito terminal',
      description:
        'Cada C protege una salida final. El verde identifica iluminación de emergencia.',
      swatch: 'bg-amber-400',
    },
  ];
  return (
    <div className="mt-4 space-y-2 border-t pt-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        Cómo leer el tablero, en orden
      </p>
      {items.map((item, index) => (
        <div
          key={item.code}
          className="grid grid-cols-[auto_auto_1fr] items-start gap-3 rounded-xl border bg-muted/20 p-3"
        >
          <span className="grid size-6 place-items-center rounded-full bg-slate-200 font-mono text-[10px] font-black text-slate-700">
            {index + 1}
          </span>
          <span
            className={`grid h-8 min-w-12 place-items-center rounded-lg font-mono text-[11px] font-black ${
              item.swatch
            } ${item.code === 'C1…' ? 'text-slate-950' : 'text-white'}`}
          >
            {item.code}
          </span>
          <div>
            <p className="text-xs font-semibold leading-tight">{item.title}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function PhaseBar({
  phase,
  value,
  percent,
}: {
  phase: Phase;
  phaseColorKey?: string;
  value: number;
  percent: number;
}) {
  return (
    <div className="grid grid-cols-[30px_1fr_auto] items-center gap-3">
      <span className="font-mono text-xs font-bold">{phase}</span>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${phaseColor(phase)}`}
          style={{ width: `${Math.max(3, percent)}%` }}
        />
      </div>
      <span className="w-20 text-right font-mono text-xs">
        {formatPower(value)}
      </span>
    </div>
  );
}

function FeederReviews({
  panel,
  panels,
  calculations,
}: {
  panel: Panel;
  panels: Panel[];
  calculations: Map<string, PanelCalculation>;
}) {
  const feeders =
    panel.type === 'TS'
      ? [panel]
      : panels.filter(
          (child) => child.type === 'TS' && child.parentId === panel.id,
        );
  return (
    <div className="space-y-3">
      {feeders.map((feeder) => {
        const calculation = calculations.get(feeder.id);
        if (!calculation) return null;
        const review = reviewFeeder(feeder, calculation);
        const needsReview = review.issues.length > 0;
        return (
          <div
            key={feeder.id}
            role={needsReview ? 'alert' : 'note'}
            aria-label={`Alimentador a ${feeder.name}`}
            className={`mb-4 rounded-xl border p-3 text-xs print:break-inside-avoid ${
              needsReview
                ? 'border-red-400 bg-red-50 text-red-950'
                : 'border-slate-300 bg-slate-50 text-slate-900'
            }`}
          >
            <p className="font-bold">
              {needsReview
                ? 'Revisar alimentador'
                : 'Chequeo preliminar del alimentador'}{' '}
              · TP → {feeder.name}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div>
                <dt>
                  Demanda Ib{feeder.supply === 'tri' ? ' · fase máxima' : ''}
                </dt>
                <dd className="font-mono font-bold">
                  {formatNumber(review.current, 1)} A
                </dd>
              </div>
              <div>
                <dt>Térmica en TP · In</dt>
                <dd className="font-mono font-bold">{review.breaker} A</dd>
              </div>
              <div>
                <dt>Cable {review.section} mm² · Iz</dt>
                <dd className="font-mono font-bold">
                  {review.capacity === null
                    ? 'Pendiente'
                    : `${formatNumber(review.capacity, 1)} A`}
                </dd>
              </div>
              <div>
                <dt>Corte local · maniobra</dt>
                <dd className="font-mono font-bold">
                  {ratingLabel(calculation.mainBreaker)}
                </dd>
              </div>
            </dl>
            {needsReview ? (
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {review.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2">
                Cumple Ib ≤ In ≤ Iz con los datos declarados y el criterio de
                caída del alimentador. No valida la instalación.
              </p>
            )}
            <p className="mt-2">
              El corte local no protege contra sobrecorrientes ni habilita esa
              corriente de consumo. Iz depende del cable y su instalación.
              Pendientes: coordinación, cortocircuito y revisión profesional.
            </p>
          </div>
        );
      })}
    </div>
  );
}

function PanelFront({
  devices,
  rows,
  modulesPerRow,
  panelType,
  hasDps,
  hasFeeders,
  highlightedCircuitId,
  onHoverDevice,
}: {
  devices: PanelDevice[];
  rows: number;
  modulesPerRow: number;
  panelType: PanelType;
  hasDps: boolean;
  hasFeeders: boolean;
  highlightedCircuitId?: number | null;
  onHoverDevice?: (circuitId: number | undefined) => void;
}) {
  const layout = layoutDin(devices, modulesPerRow, 20);
  const hasTpDifferential = devices.some(
    (device) =>
      device.key === 'id-selective-tp' || device.key === 'id-general-tp',
  );
  const visibleRows = Math.max(rows, layout.rows);
  const slots: Array<{ device?: PanelDevice; start?: boolean }> = Array.from(
    { length: visibleRows * modulesPerRow },
    () => ({}),
  );
  for (const placement of layout.placements) {
    for (let offset = 0; offset < placement.device.span; offset += 1) {
      slots[placement.start + offset] = {
        device: placement.device,
        start: offset === 0,
      };
    }
  }

  return (
    <div className="panel-shell rounded-2xl border-[10px] border-slate-800 bg-slate-200 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,.65),0_10px_28px_rgba(15,23,42,.16)]">
      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white/70 px-3 py-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Distribución modular
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-800">
            {panelType === 'TP'
              ? `IGA${hasTpDifferential ? ' · ID general configurable' : ' · sin ID general'}${hasDps ? ' · DPS en paralelo' : ''}${hasFeeders ? ' · alimentadores TS' : ''} · circuitos propios si corresponde`
              : `Corte local${hasDps ? ' · DPS en paralelo' : ''} · ID y circuitos terminales`}
          </p>
        </div>
        <span className="rounded-md bg-slate-800 px-2 py-1 font-mono text-[9px] font-bold text-white">
          1 módulo = 18 mm
        </span>
      </div>
      {Array.from({ length: visibleRows }).map((_, rowIndex) => (
        <div key={rowIndex} className="mb-4 last:mb-0">
          <div className="mb-1.5 flex justify-between font-mono text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">
            <span>Riel DIN {rowIndex + 1}</span>
            <span>{modulesPerRow} módulos</span>
          </div>
          <div
            className="grid h-[92px] overflow-hidden rounded-xl border-4 border-slate-700 bg-slate-700 p-1.5 shadow-[inset_0_2px_8px_rgba(15,23,42,.35)]"
            style={{
              gridTemplateColumns: `repeat(${modulesPerRow}, minmax(0, 1fr))`,
            }}
          >
            {slots
              .slice(rowIndex * modulesPerRow, (rowIndex + 1) * modulesPerRow)
              .map((slot, index) => {
                const isTargetCircuit =
                  Boolean(slot.device?.circuitId) &&
                  slot.device?.circuitId === highlightedCircuitId;

                return (
                  <div
                    key={index}
                    onMouseEnter={() => onHoverDevice?.(slot.device?.circuitId)}
                    onMouseLeave={() => onHoverDevice?.(undefined)}
                    className={`relative min-w-0 border-r border-slate-950/20 last:border-r-0 transition-all ${
                      slot.device ? slot.device.className : 'bg-slate-50'
                    } ${
                      isTargetCircuit
                        ? 'z-20 ring-2 ring-amber-400 scale-[1.04] shadow-lg shadow-amber-400/40'
                        : ''
                    }`}
                  >
                    {slot.start && slot.device && (
                      <div
                        className="absolute inset-y-0 left-0 z-10 flex flex-col justify-between p-2 text-inherit"
                        style={{ width: `${slot.device.span * 100}%` }}
                        title={`${slot.device.label} · ${slot.device.fullName} · ${slot.device.detail}`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className="truncate font-mono text-base font-black leading-none tracking-tight">
                              {slot.device.label}
                            </p>
                            <span className="shrink-0 rounded border border-current/20 bg-white/20 px-1 py-0.5 font-mono text-[7px] font-bold">
                              {slot.device.span}M
                            </span>
                          </div>
                          <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.1em] opacity-75">
                            {slot.device.key === 'cabecera' &&
                            panelType === 'TS'
                              ? 'Maniobra'
                              : 'Protección'}
                          </p>
                        </div>
                        <div className="flex items-end justify-between gap-2 pr-1">
                          <p className="w-fit rounded-md border border-current/20 bg-white/30 px-1.5 py-1 font-mono text-[10px] font-black leading-none backdrop-blur-sm">
                            {slot.device.detail}
                          </p>
                          <span className="mb-0.5 h-6 w-1.5 shrink-0 rounded-full bg-slate-950/70 shadow-[0_0_0_1px_rgba(255,255,255,.25)]" />
                        </div>
                      </div>
                    )}
                    {!slot.device && (
                      <span className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
      <details className="din-equipment-list mt-3 rounded-lg border border-slate-400 bg-white/80 p-2 text-xs text-slate-900">
        <summary className="cursor-pointer font-semibold">Lista accesible de equipos</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {devices.map((device) => (
            <li key={device.key}>
              {device.label}: {device.fullName} · {device.detail} · {device.span} módulos
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function SingleLineDiagram({
  panel,
  calculation,
  childPanels = [],
  highlightedCircuitId,
  onHoverCircuit,
}: {
  panel: Panel;
  calculation: PanelCalculation;
  childPanels?: Panel[];
  highlightedCircuitId?: number | null;
  onHoverCircuit?: (id: number | undefined) => void;
}) {
  // A continuous vertical bus connects every branch; no column-count-dependent offsets.
  return (
    <div className="unifilar rounded-xl border bg-slate-50 p-4 text-slate-900">
      <p className="mb-3 text-sm font-semibold">
        {panel.type === 'TP' && panel.circuits.length === 0
          ? 'TP de tránsito'
          : architectureDetails(panel.architecture).title}{' '}
        · {panelDifferentialCount(panel)} diferenciales en el tablero
      </p>
      <div className="flex flex-wrap items-center gap-3 border-b-2 border-slate-700 pb-4">
        <DiagramNode
          kicker={panel.type === 'TP' ? 'Alimentación' : 'Desde TP'}
          title={panel.supply === 'tri' ? '380/220 V · 3Φ' : '220 V · 1Φ'}
          detail={panel.name}
          tone="dark"
        />
        <span aria-hidden="true">→</span>
        <DiagramNode
          kicker="Cabecera"
          title={`${panel.type === 'TP' ? 'IGA' : 'Corte local'} ${ratingLabel(calculation.mainBreaker)}`}
          detail={`${panel.supply === 'tri' ? '4P' : '2P'} · ${
            panel.type === 'TP'
              ? 'calibre preliminar'
              : 'maniobra, sin disparo por sobrecorriente'
          }`}
        />
        {tpDifferentialDevice(panel) && (
          <>
            <span aria-hidden="true">→</span>
            <DiagramNode
              kicker="Diferencial TP"
              title={tpDifferentialDevice(panel)!.label}
              detail={tpDifferentialDevice(panel)!.detail}
              tone={
                panelTpDifferentialMode(panel) === 'instant30'
                  ? 'amber'
                  : 'blue'
              }
            />
          </>
        )}
        <span className="text-xs">→ barras activas y N · PE independiente</span>
      </div>
      <div className="border-l-2 border-slate-700">
        {panelHasDps(panel) && (
          <div className="diagram-branch flex items-center py-3">
            <span className="h-0.5 w-6 shrink-0 bg-slate-700" />
            <div className="rounded-lg border border-violet-300 bg-violet-50 p-3 text-xs">
              <strong>DPS · derivación en paralelo hacia PE</strong>
              <p>
                Conexión y protección de respaldo según esquema TT y fabricante.
                No está en serie con las cargas.
              </p>
            </div>
          </div>
        )}
        {differentialGroups(panel)
          .filter((group) => !group.circuits.length)
          .map((group) => (
            <div
              key={group.key}
              className="diagram-branch flex items-center py-2"
            >
              <span className="h-0.5 w-6 shrink-0 bg-slate-700" />
              <div className="rounded-lg border border-dashed border-sky-400 bg-sky-50 p-3 text-xs">
                <strong>
                  {group.label} · 30 mA · reservado, sin circuitos
                </strong>
                <p>
                  Incluido como equipo en el riel y presupuesto; no demuestra
                  servicio de emergencia instalado.
                </p>
              </div>
            </div>
          ))}
        {childPanels.map((child) => (
          <div key={child.id} className="diagram-branch flex items-center py-2">
            <span className="h-0.5 w-6 shrink-0 bg-slate-700" />
            <div className="min-w-0 flex-1 rounded-lg border border-sky-300 bg-sky-50 p-3 text-xs">
              <strong>
                Alimentador → {child.name}
              </strong>
              <p className="mt-1">
                TM {child.feederBreaker ?? 32} A ·{' '}
                {child.supply === 'tri'
                  ? '4P · 3Φ'
                  : `2P · ${child.feederPhase ?? 'L1'}`}{' '}
                · {child.feederConductor ?? 6} mm² · {child.feederLengthM ?? 15}{' '}
                m
              </p>
              <p className="mt-1">{feederWiringLabel(child)}</p>
              <p className="mt-1 break-words">
                Cañería:{' '}
                {child.feederConduit?.trim() || 'pendiente de dimensionar'}
              </p>
            </div>
          </div>
        ))}
        {panel.circuits.map((circuit, index) => (
          <div
            key={circuit.id}
            onMouseEnter={() => onHoverCircuit?.(circuit.id)}
            onMouseLeave={() => onHoverCircuit?.(undefined)}
            onFocus={() => onHoverCircuit?.(circuit.id)}
            onBlur={() => onHoverCircuit?.(undefined)}
            className="diagram-branch flex items-center py-2"
          >
            <span className="h-0.5 w-6 shrink-0 bg-slate-700" />
            <div
              className={`min-w-0 flex-1 rounded-lg border p-3 text-xs ${highlightedCircuitId === circuit.id ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-400' : circuit.kind === 'EMG' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-white'}`}
            >
              <strong>
                {differentialLabel(panel, circuit.id)} · 30 mA → TM C{index + 1}{' '}
                · {circuit.breaker} A → {circuit.name}
              </strong>
              <p className="mt-1">
                {circuitPhaseLabel(panel, circuit)} · {circuit.phase === '3Φ' ? '4P' : '2P'} ·{' '}
                {circuit.conductor} mm² · PE{' '}
                {protectiveConductorSection(circuit.conductor)} mm² ·{' '}
                {circuit.lengthM} m · {formatPower(circuitPower(circuit))}
              </p>
              <p className="mt-1 break-words">
                Cañería: {circuit.conduit?.trim() || 'pendiente de dimensionar'}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-slate-600">
        Esquema funcional, no plano de conexiones. El mismo ID identificado en
        varias salidas es un único equipo compartido. PE no se interrumpe ni
        atraviesa el diferencial. Confirmar neutros separados por grupo, bornes,
        calibre de ID y coordinación.
      </p>
    </div>
  );
}

function MultiLineDiagram({
  panel,
  childPanels,
  calculations,
  highlightedCircuitId,
  onHoverCircuit,
}: {
  panel: Panel;
  childPanels: Panel[];
  calculations: Map<string, PanelCalculation>;
  highlightedCircuitId?: number | null;
  onHoverCircuit?: (id: number | undefined) => void;
}) {
  const rows = [
    ...childPanels.map((child, index) => ({
      key: child.id,
      id: undefined as number | undefined,
      title: `A${index + 1} → ${child.name}`,
      protection: `TM ${child.feederBreaker ?? 32} A en TP`,
      phase: child.supply === 'tri' ? '3Φ' : (child.feederPhase ?? 'L1'),
      section: child.feederConductor ?? 6,
      length: child.feederLengthM ?? 15,
      power: calculations.get(child.id)?.demandVA ?? 0,
      conduit: child.feederConduit,
      wiring: feederWiringLabel(child),
      feeder: true,
      drop: calculations.get(child.id)?.feederDrop.percent ?? 0,
    })),
    ...panel.circuits.map((circuit, index) => ({
      key: `c-${circuit.id}`,
      id: circuit.id,
      title: `C${index + 1} · ${circuit.name}`,
      protection: `${differentialLabel(panel, circuit.id)} 30 mA tipo ${panelDifferentialType(panel)} → TM ${circuit.breaker} A`,
      phase: physicalCircuitPhase(panel, circuit),
      section: circuit.conductor,
      length: circuit.lengthM,
      power: circuitPower(circuit),
      conduit: circuit.conduit,
      wiring: '',
      feeder: false,
      drop:
        voltageDrop(circuit, panel.supply).percent +
        (panel.type === 'TS'
          ? (calculations.get(panel.id)?.feederDrop.percent ?? 0)
          : 0),
    })),
  ];
  return (
    <div className="multifilar overflow-x-auto rounded-xl border bg-slate-50 text-slate-900">
      <table className="w-full min-w-[860px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b-2 border-slate-700 bg-slate-100">
            {[
              'Salida / protección',
              'Fases',
              'Neutro',
              'Protección PE',
              'Carga / recorrido / cañería',
            ].map((label) => (
              <th key={label} className="p-3">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              tabIndex={row.id === undefined ? undefined : 0}
              onMouseEnter={() => onHoverCircuit?.(row.id)}
              onMouseLeave={() => onHoverCircuit?.(undefined)}
              onFocus={() => onHoverCircuit?.(row.id)}
              onBlur={() => onHoverCircuit?.(undefined)}
              className={`border-b ${row.id !== undefined && highlightedCircuitId === row.id ? 'bg-amber-100 ring-2 ring-inset ring-amber-400' : row.feeder ? 'bg-sky-50' : ''}`}
            >
              <td className="p-3">
                <strong>{row.title}</strong>
                <p className="mt-1">
                  {row.protection} · {row.phase === '3Φ' ? '4P' : '2P'}
                </p>
              </td>
              <td className="p-3">
                <PhaseConductorLines phase={row.phase} section={row.section} />
              </td>
              <td className="p-3">
                <ConductorLine
                  label={`N · ${row.section} mm²`}
                  color="#38bdf8"
                />
              </td>
              <td className="p-3">
                <ConductorLine
                  label={`PE · ${protectiveConductorSection(row.section)} mm²`}
                  color="repeating-linear-gradient(90deg, #15803d 0 8px, #facc15 8px 16px)"
                />
              </td>
              <td className="p-3">
                <p>
                  {formatPower(row.power)}{' '}
                  {row.feeder ? '(demanda)' : '(instalada)'} · {row.length} m
                </p>
                <p>
                  ΔV {row.feeder ? 'seccional' : 'total'}{' '}
                  {formatNumber(row.drop, 2)} %
                </p>
                <p className="mt-1 break-words">
                  Cañería: {row.conduit?.trim() || 'pendiente'}
                </p>
                {row.wiring && <p className="mt-1">{row.wiring}</p>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t bg-amber-50 p-3 text-[10px]">
        PE de circuito: se adopta máx(2,5 mm²; sección activa), sin cálculo
        adiabático ni reducción. No confundir con conductor tablero–electrodo
        (mínimo 4 mm² según III.2.19.7). N de igual sección: verificar
        armónicos. Colores: L1 marrón, L2 negro, L3 rojo, N celeste, PE
        verde/amarillo. Este cuadro no sustituye el multifilar de conexiones
        definitivo.
      </p>
    </div>
  );
}

function PhaseConductorLines({
  phase,
  section,
}: {
  phase: string;
  section: number;
}) {
  const phases =
    phase === '3Φ'
      ? (['L1', 'L2', 'L3'] as const)
      : ([phase === 'L2' ? 'L2' : phase === 'L3' ? 'L3' : 'L1'] as const);
  return (
    <div className="space-y-2">
      {phases.map((name) => (
        <ConductorLine
          key={name}
          label={`${name} · ${section} mm²`}
          color={PHASE_CONDUCTOR_COLORS[name]}
        />
      ))}
    </div>
  );
}

function ConductorLine({ label, color }: { label: string; color: string }) {
  return (
    <div>
      <span
        className="block h-1 w-24 max-w-full rounded"
        style={{ background: color }}
      />
      <p className="mt-1 whitespace-nowrap font-mono text-[10px]">{label}</p>
    </div>
  );
}

function DiagramNode({
  kicker,
  title,
  detail,
  tone = 'light',
}: {
  kicker: string;
  title: string;
  detail: string;
  tone?: 'light' | 'dark' | 'blue' | 'amber';
}) {
  const tones = {
    light: 'border-slate-300 bg-white text-slate-950',
    dark: 'border-slate-900 bg-slate-900 text-white',
    blue: 'border-sky-300 bg-sky-50 text-sky-950',
    amber: 'border-amber-400 bg-amber-50 text-amber-950',
  };
  return (
    <div
      className={`flex w-36 shrink-0 flex-col justify-center rounded-lg border-2 p-3 shadow-sm ${tones[tone]}`}
    >
      <span className="text-[8px] font-bold uppercase tracking-[0.12em] opacity-60">
        {kicker}
      </span>
      <strong className="mt-0.5 text-xs">{title}</strong>
      <span className="mt-1 font-mono text-[9px] opacity-70">{detail}</span>
    </div>
  );
}
