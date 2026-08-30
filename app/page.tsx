'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

export type Supply = 'mono' | 'tri';
export type Phase = 'L1' | 'L2' | 'L3' | '3Φ';
export type CircuitKind = 'IUG' | 'TUG' | 'TUE' | 'EMG' | 'FM';
export type Architecture = 'essential' | 'balanced' | 'continuity';
export type ExperienceMode = 'guided' | 'technical';
export type ProjectPreset = 'hall' | 'commercial' | 'residential' | 'custom';
export type WorkType = 'new' | 'remodel' | 'survey';
export type EvacuationClass = 'BD1' | 'BD2' | 'BD3' | 'BD4';
export type PanelType = 'TP' | 'TS';
export type DifferentialType = 'AC' | 'A';

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
};

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
  circuits: Circuit[];
  feederLengthM?: number;
  feederConductor?: number;
  feederBreaker?: number;
  feederPhase?: Phase;
};

export type PanelCalculation = {
  ownInstalledVA: number;
  installedVA: number;
  demandVA: number;
  mainCurrent: number;
  mainBreaker: number;
  currentBasedBreaker: number;
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
  feederDrop: { volts: number; percent: number };
};

export type PriceCatalog = {
  mcb2P: number;
  mcb4P: number;
  rcd2P: number;
  rcd4P: number;
  spd2P: number;
  spd4P: number;
  cabinet16: number;
  cabinet36: number;
  cabinet54: number;
  cabinet72: number;
  typeAPremium: number;
  accessoriesPercent: number;
  assemblyPercent: number;
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
  score: number;
  lines: CostLine[];
};

const STANDARD_BREAKERS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];
const STORAGE_KEY = 'tablero-aea-san-rafael:v3';
const COPPER_RESISTIVITY = 0.018;

const INITIAL_PROFILE: ProjectProfile = {
  preset: 'hall',
  workType: 'new',
  widthM: 24,
  lengthM: 10,
  occupancy: 180,
  evacuation: 'BD3',
  prospectiveShortCircuitKa: 3,
  breakingCapacityKa: 6,
  groundResistanceOhm: 3,
  planScale: '1:100',
  descriptiveMemoryReady: false,
  registeredProfessionalReady: false,
  siteTestReady: false,
};

const CONDUCTOR_CAPACITY: Record<number, number> = {
  1.5: 16,
  2.5: 20,
  4: 25,
  6: 32,
  10: 50,
  16: 63,
  25: 80,
  35: 100,
};

const DEFAULT_PRICES: PriceCatalog = {
  mcb2P: 10995,
  mcb4P: 29995,
  rcd2P: 41132,
  rcd4P: 98995,
  spd2P: 81186,
  spd4P: 193708,
  cabinet16: 31000,
  cabinet36: 83000,
  cabinet54: 124500,
  cabinet72: 166000,
  typeAPremium: 35,
  accessoriesPercent: 12,
  assemblyPercent: 20,
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
    breaker: 16,
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
    breaker: 16,
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
    circuits: INITIAL_CIRCUITS_TP,
  },
];

function createPanelId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function nextBreaker(current: number) {
  return STANDARD_BREAKERS.find((value) => value >= current) ?? 125;
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
  const poleSpan = supply === 'tri' ? 4 : 2;
  const circuitModules = circuits.reduce((total, circuit) => total + circuit.modules, 0);
  const feederModules = childPanels.reduce(
    (total, child) => total + (child.supply === 'tri' ? 4 : 2),
    0,
  );
  const headerModules = poleSpan + (includeDps ? poleSpan : 0);
  if (architecture === 'essential') return headerModules + poleSpan + circuitModules + feederModules;
  if (architecture === 'balanced') return headerModules + poleSpan * 2 + circuitModules + feederModules;
  const individualDifferentials = circuits.reduce(
    (total, circuit) => total + (circuit.phase === '3Φ' ? 4 : 2),
    0,
  );
  return headerModules + circuitModules + individualDifferentials + feederModules;
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
  const volts =
    (threePhase ? Math.sqrt(3) : 2) *
    Math.max(0, circuit.lengthM) *
    current *
    COPPER_RESISTIVITY /
    Math.max(circuit.conductor, 0.1);
  return { volts, percent: (volts / (threePhase ? 380 : 220)) * 100 };
}

function feederVoltageDrop(
  current: number,
  lengthM: number,
  conductor: number,
  supply: Supply,
) {
  const threePhase = supply === 'tri';
  const volts =
    (threePhase ? Math.sqrt(3) : 2) *
    Math.max(0, lengthM) *
    current *
    COPPER_RESISTIVITY /
    Math.max(conductor, 0.1);
  return { volts, percent: (volts / (threePhase ? 380 : 220)) * 100 };
}

function projectCircuits(preset: ProjectPreset): Circuit[] {
  const base = INITIAL_CIRCUITS_TP.map((circuit) => ({ ...circuit }));
  if (preset === 'hall') return base;
  if (preset === 'commercial') {
    return [
      { ...base[0], name: 'Iluminación salón de ventas', points: 14 },
      { ...base[1], name: 'Tomacorrientes generales', points: 12 },
      { ...base[2], name: 'Luces de emergencia y salida', points: 6 },
      { ...base[3], name: 'Aire acondicionado / equipo', unitVA: 2500, breaker: 20, conductor: 4 },
    ];
  }
  if (preset === 'residential') {
    return [
      { ...base[0], name: 'Iluminación general PB', points: 10 },
      { ...base[1], name: 'Tomacorrientes generales', points: 10 },
      { ...base[3], id: 3, name: 'Cocina y tomas especiales', unitVA: 2500, breaker: 20, conductor: 4, phase: 'L1' },
    ];
  }
  return base;
}

function phaseColor(phase: Phase) {
  return {
    L1: 'bg-amber-400',
    L2: 'bg-sky-500',
    L3: 'bg-rose-500',
    '3Φ': 'bg-violet-500',
  }[phase];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function finiteNumber(value: unknown, fallback: number, min = 0, max = Number.POSITIVE_INFINITY) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function panelHasDps(panel: Panel) {
  return panel.includeDps ?? panel.type === 'TP';
}

function panelDifferentialType(panel: Panel): DifferentialType {
  return panel.differentialType === 'AC' ? 'AC' : 'A';
}

function normalizePrices(value: unknown): PriceCatalog {
  const raw = isRecord(value) ? value : {};
  return Object.fromEntries(
    Object.entries(DEFAULT_PRICES).map(([key, fallback]) => [
      key,
      finiteNumber(raw[key], fallback, 0),
    ]),
  ) as PriceCatalog;
}

function normalizeProfile(value: unknown): ProjectProfile {
  const raw = isRecord(value) ? value : {};
  return {
    preset: ['hall', 'commercial', 'residential', 'custom'].includes(String(raw.preset))
      ? (raw.preset as ProjectPreset)
      : INITIAL_PROFILE.preset,
    workType: ['new', 'remodel', 'survey'].includes(String(raw.workType))
      ? (raw.workType as WorkType)
      : INITIAL_PROFILE.workType,
    widthM: finiteNumber(raw.widthM, INITIAL_PROFILE.widthM, 1),
    lengthM: finiteNumber(raw.lengthM, INITIAL_PROFILE.lengthM, 1),
    occupancy: Math.round(finiteNumber(raw.occupancy, INITIAL_PROFILE.occupancy, 1)),
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
  };
}

function normalizeCircuit(value: unknown, index: number, supply: Supply): Circuit {
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
  const breaker = nextBreaker(requestedBreaker);
  const requestedConductor = finiteNumber(raw.conductor, template.conductor, 0.1);
  const conductor = CONDUCTOR_CAPACITY[requestedConductor]
    ? requestedConductor
    : template.conductor;

  return {
    id: Math.max(1, Math.round(finiteNumber(raw.id, index + 1, 1))),
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
    modules: Math.max(1, Math.round(finiteNumber(raw.modules, template.modules, 1, 8))),
  };
}

function normalizePanels(value: unknown): Panel[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const records = value.filter(isRecord);
  const tpRecords = records.filter((item) => item.type === 'TP');
  if (tpRecords.length !== 1) return null;

  const usedIds = new Set<string>();
  const normalized = records.map((raw, panelIndex) => {
    const type: PanelType = raw.type === 'TP' ? 'TP' : 'TS';
    const fallbackId = type === 'TP' ? 'tp' : `ts-${panelIndex}`;
    let id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : fallbackId;
    while (usedIds.has(id)) id = `${id}-${panelIndex + 1}`;
    usedIds.add(id);
    const supply: Supply = raw.supply === 'mono' ? 'mono' : 'tri';
    const circuits = Array.isArray(raw.circuits)
      ? raw.circuits.map((circuit, index) => normalizeCircuit(circuit, index, supply))
      : [];
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
      parentId: type === 'TP' ? null : typeof raw.parentId === 'string' ? raw.parentId : null,
      supply,
      demandFactor: finiteNumber(raw.demandFactor, type === 'TP' ? 0.8 : 0.85, 0.1, 1),
      reservePercent: finiteNumber(raw.reservePercent, 25, 0, 100),
      modulesPerRow: [12, 18, 24].includes(Number(raw.modulesPerRow))
        ? Number(raw.modulesPerRow)
        : 18,
      architecture: ['essential', 'balanced', 'continuity'].includes(String(raw.architecture))
        ? (raw.architecture as Architecture)
        : 'balanced',
      includeDps: typeof raw.includeDps === 'boolean' ? raw.includeDps : type === 'TP',
      differentialType: raw.differentialType === 'AC' ? 'AC' : 'A',
      circuits,
      feederLengthM: type === 'TS' ? finiteNumber(raw.feederLengthM, 15, 1) : undefined,
      feederConductor:
        type === 'TS' && CONDUCTOR_CAPACITY[Number(raw.feederConductor)]
          ? Number(raw.feederConductor)
          : type === 'TS'
            ? 6
            : undefined,
      feederBreaker:
        type === 'TS' ? nextBreaker(finiteNumber(raw.feederBreaker, 32, 1)) : undefined,
      feederPhase: type === 'TS' ? feederPhase : undefined,
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
        circuits: panel.circuits.map((circuit) => ({ ...circuit, phase: 'L1' as Phase })),
      };
    }
    return { ...panel, parentId: tp.id };
  });
}

export default function Home() {
  const [experienceMode, setExperienceMode] = useState<ExperienceMode>('guided');
  const [profile, setProfile] = useState<ProjectProfile>(INITIAL_PROFILE);
  const [projectName, setProjectName] = useState('SALÓN · 24 × 10 m');
  const [panels, setPanels] = useState<Panel[]>(INITIAL_PANELS);
  const [activePanelId, setActivePanelId] = useState<string>('tp');
  const [prices, setPrices] = useState<PriceCatalog>(DEFAULT_PRICES);
  const [optimizationMessage, setOptimizationMessage] = useState('');
  const [persistenceReady, setPersistenceReady] = useState(false);
  const [hoveredCircuitId, setHoveredCircuitId] = useState<number | null>(null);
  const [selectedCircuitId, setSelectedCircuitId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active panel helper
  const activePanel = useMemo(() => {
    return panels.find((p) => p.id === activePanelId) ?? panels[0] ?? INITIAL_PANELS[0];
  }, [panels, activePanelId]);
  const tpPanel = useMemo(
    () => panels.find((panel) => panel.type === 'TP') ?? panels[0] ?? INITIAL_PANELS[0],
    [panels],
  );

  // Backward compatibility & load
  useEffect(() => {
    try {
      const storedV3 = window.localStorage.getItem(STORAGE_KEY);
      if (storedV3) {
        const data = JSON.parse(storedV3);
        queueMicrotask(() => {
          if (data.experienceMode) setExperienceMode(data.experienceMode);
          if (data.profile) setProfile(normalizeProfile(data.profile));
          if (data.projectName) setProjectName(data.projectName);
          const normalizedPanels = normalizePanels(data.panels);
          if (normalizedPanels) {
            setPanels(normalizedPanels);
            const requestedActiveId = data.activePanelId;
            setActivePanelId(
              normalizedPanels.some((panel) => panel.id === requestedActiveId)
                ? requestedActiveId
                : normalizedPanels[0].id,
            );
          }
          if (data.prices) setPrices(normalizePrices(data.prices));
          setPersistenceReady(true);
        });
        return;
      }

      // Check legacy v2
      const storedLegacy = window.localStorage.getItem('tablero-aea-san-rafael:v2');
      if (storedLegacy) {
        const data = JSON.parse(storedLegacy);
        queueMicrotask(() => {
          if (data.experienceMode) setExperienceMode(data.experienceMode);
          if (data.profile) setProfile(normalizeProfile(data.profile));
          if (data.projectName) setProjectName(data.projectName);
          if (data.prices) setPrices(normalizePrices(data.prices));

          const migratedPanel: Panel = {
            id: 'tp',
            name: 'Tablero Principal (TP)',
            type: 'TP',
            parentId: null,
            supply: data.supply || 'tri',
            demandFactor: typeof data.demandFactor === 'number' ? data.demandFactor : 0.8,
            reservePercent: typeof data.reservePercent === 'number' ? data.reservePercent : 25,
            modulesPerRow: typeof data.modulesPerRow === 'number' ? data.modulesPerRow : 18,
            architecture: data.architecture || 'balanced',
            includeDps: true,
            differentialType: 'A',
            circuits: Array.isArray(data.circuits) ? data.circuits : INITIAL_CIRCUITS_TP,
          };
          setPanels(normalizePanels([migratedPanel]) ?? INITIAL_PANELS);
          setActivePanelId('tp');
          setPersistenceReady(true);
        });
        return;
      }

      queueMicrotask(() => setPersistenceReady(true));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      queueMicrotask(() => setPersistenceReady(true));
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setSelectedCircuitId(null);
      setHoveredCircuitId(null);
    });
  }, [activePanelId]);

  // Save to localStorage
  useEffect(() => {
    if (!persistenceReady) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        experienceMode,
        profile,
        projectName,
        panels,
        activePanelId,
        prices,
      }),
    );
  }, [activePanelId, experienceMode, panels, persistenceReady, prices, profile, projectName]);

  // Panel mutations
  const updateActivePanel = <K extends keyof Panel>(key: K, value: Panel[K]) => {
    setPanels((current) =>
      current.map((p) => (p.id === activePanel.id ? { ...p, [key]: value } : p)),
    );
  };

  const changePanelSupply = (panelId: string, nextSupply: Supply) => {
    const targetPanel = panels.find((panel) => panel.id === panelId);
    if (targetPanel?.type === 'TS' && nextSupply === 'tri' && tpPanel.supply === 'mono') {
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
        const mustFollowMonoTp = target.type === 'TP' && nextSupply === 'mono' && panel.type === 'TS';
        if (!isTarget && !mustFollowMonoTp) return panel;
        const normalizedSupply = mustFollowMonoTp ? 'mono' : nextSupply;
        return {
          ...panel,
          supply: normalizedSupply,
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
                  modules: Math.min(circuit.modules, 2),
                }))
              : panel.circuits,
        };
      });
    });
  };

  const addSectionalPanel = () => {
    const nextIndex = panels.filter((p) => p.type === 'TS').length + 1;
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
      architecture: 'balanced',
      includeDps: false,
      differentialType: profile.preset === 'residential' ? 'AC' : 'A',
      feederLengthM: 15,
      feederConductor: 6,
      feederBreaker: 32,
      feederPhase: tpPanel.supply === 'tri' ? '3Φ' : 'L1',
      circuits: [
        {
          id: 1,
          name: `Iluminación TS${nextIndex}`,
          kind: 'IUG',
          points: 8,
          unitVA: 100,
          phase: 'L1',
          powerFactor: 0.95,
          breaker: 16,
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
          phase: 'L2',
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
    const newId = createPanelId('ts');
    const nextIndex = panels.filter((p) => p.type === 'TS').length + 1;
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
    if (panels.length <= 1) return;
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
                total + child.circuits.reduce((sum, circuit) => sum + circuitPower(circuit), 0),
              0,
            )
          : 0);
      const demandVA = ownInstalledVA * panel.demandFactor + childDemandVA;
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
        childPanelsForTP.forEach((child) => {
          const childDemand =
            child.circuits.reduce((total, circuit) => total + circuitPower(circuit), 0) *
            child.demandFactor;
          if (child.supply === 'mono') {
            const feederPhase =
              child.feederPhase === 'L2' || child.feederPhase === 'L3'
                ? child.feederPhase
                : 'L1';
            phaseVA[feederPhase] += childDemand;
            return;
          }
          child.circuits.forEach((circuit) => {
            const power = circuitPower(circuit) * child.demandFactor;
            if (circuit.phase === '3Φ') {
              phaseVA.L1 += power / 3;
              phaseVA.L2 += power / 3;
              phaseVA.L3 += power / 3;
            } else {
              phaseVA[circuit.phase] += power;
            }
          });
        });
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
        ? childPanelsForTP.reduce((max, c) => Math.max(max, c.feederBreaker ?? 0), 0)
        : 0;
      const maxBranchBreaker = Math.max(maxOutgoingBreaker, maxFeederBreaker);
      const currentBasedBreaker = nextBreaker(mainCurrent * 1.15);
      // IGA must satisfy In >= 1.15 * Ib AND In >= max(outgoing branch/feeder breakers) for electrical hierarchy & selectivity
      const mainBreaker = Math.max(currentBasedBreaker, maxBranchBreaker || 10);
      const includeDps = panelHasDps(panel);
      const baseModules = architectureOccupiedModules(
        panel.architecture,
        panel.supply,
        [],
        [],
        includeDps,
      );
      const occupiedModules = architectureOccupiedModules(
        panel.architecture,
        panel.supply,
        panel.circuits,
        isTP ? childPanelsForTP : [],
        includeDps,
      );
      const recommendedModules = Math.ceil(
        occupiedModules * (1 + panel.reservePercent / 100),
      );
      const rows = Math.max(1, Math.ceil(recommendedModules / panel.modulesPerRow));
      const cabinetModules = rows * panel.modulesPerRow;

      const phaseValues = Object.values(phaseVA);
      const averagePhase = phaseValues.reduce((sum, value) => sum + value, 0) / 3;
      const imbalance =
        panel.supply === 'tri' && averagePhase > 0
          ? Math.max(...phaseValues.map((value) => Math.abs(value - averagePhase))) /
            averagePhase
          : 0;

      const feederDrop =
        panel.type === 'TS' && panel.feederLengthM && panel.feederConductor
          ? feederVoltageDrop(
              mainCurrent,
              panel.feederLengthM,
              panel.feederConductor,
              panel.supply,
            )
          : { volts: 0, percent: 0 };

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
        feederDrop: { volts: 0, percent: 0 },
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
      (total, panel) => total + (panelCalculations.get(panel.id)?.demandVA ?? 0),
      0,
    );
    return {
      totalInstalledVA: tpCalc?.installedVA ?? fallbackInstalled,
      totalDemandVA: tpCalc?.demandVA ?? fallbackDemand,
      totalPanels: panels.length,
      tpMainBreaker: tpCalc?.mainBreaker ?? calculations.mainBreaker,
    };
  }, [calculations, panelCalculations, panels]);

  const isPublicVenue =
    profile.preset === 'hall' ||
    profile.occupancy >= 50 ||
    profile.evacuation !== 'BD1';
  const projectArea = Math.max(0, profile.widthM) * Math.max(0, profile.lengthM);
  const areaPerPerson =
    profile.occupancy > 0 ? projectArea / profile.occupancy : 0;

  const warnings = useMemo(() => {
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
      if (circuitCurrent(circuit, activePanel.supply) > circuit.breaker) {
        messages.push(
          `C${circuitNumber}: la corriente estimada supera la protección seleccionada.`,
        );
      }
      const cableCapacity = CONDUCTOR_CAPACITY[circuit.conductor];
      if (cableCapacity && circuit.breaker > cableCapacity) {
        messages.push(
          `C${circuitNumber}: revisar relación entre sección y protección.`,
        );
      }
      const circuitDropPercent = voltageDrop(circuit, activePanel.supply).percent;
      const totalDropPercent =
        circuitDropPercent +
        (activePanel.type === 'TS' ? calculations.feederDrop.percent : 0);
      const terminalLimit = circuit.kind === 'FM' ? 4 : 2;
      const totalLimit = circuit.kind === 'FM' ? 5 : 3;
      if (circuitDropPercent > terminalLimit) {
        messages.push(
          `C${circuitNumber}: caída del circuito ${circuitDropPercent.toFixed(1)} %; supera el criterio de ${terminalLimit} % desde el tablero seccional.`,
        );
      }
      if (totalDropPercent > totalLimit) {
        messages.push(
          `C${circuitNumber}: caída total estimada ${totalDropPercent.toFixed(1)} % (circuito + alimentador); supera ${totalLimit} %.`,
        );
      }
    });

    if (activePanel.type === 'TS') {
      const feederBreaker = activePanel.feederBreaker ?? 32;
      const feederConductor = activePanel.feederConductor ?? 6;
      const feederCapacity = CONDUCTOR_CAPACITY[feederConductor] ?? 0;
      if (feederBreaker < calculations.mainCurrent) {
        messages.push(
          `Alimentador: la térmica de ${feederBreaker} A es menor que Ib ${calculations.mainCurrent.toFixed(1)} A.`,
        );
      }
      if (feederCapacity > 0 && feederBreaker > feederCapacity) {
        messages.push(
          `Alimentador: ${feederBreaker} A supera la capacidad preliminar de ${feederCapacity} A para ${feederConductor} mm².`,
        );
      }
      const maxTerminalBreaker = activePanel.circuits.reduce(
        (maximum, circuit) => Math.max(maximum, circuit.breaker),
        0,
      );
      if (feederBreaker < maxTerminalBreaker) {
        messages.push(
          `Alimentador: revisar selectividad; su térmica de ${feederBreaker} A es menor que una protección terminal de ${maxTerminalBreaker} A.`,
        );
      }
      if (calculations.feederDrop.percent > 1) {
        messages.push(
          `Alimentador: caída seccional ${calculations.feederDrop.percent.toFixed(2)} %, supera el criterio recomendado de 1 %.`,
        );
      }
      if (tpPanel.supply === 'mono' && activePanel.supply === 'tri') {
        messages.push('Incompatibilidad: un TP monofásico no puede alimentar un TS trifásico.');
      }
      if (
        activePanel.supply === 'mono' &&
        tpPanel.supply === 'tri' &&
        !['L1', 'L2', 'L3'].includes(String(activePanel.feederPhase))
      ) {
        messages.push('Alimentador monofásico: seleccionar la fase L1, L2 o L3 del TP.');
      }
    }

    if (calculations.imbalance > 0.2) {
      messages.push('El desbalance de fases estimado supera el 20 %.');
    }
    if (calculations.mainCurrent * 1.15 > STANDARD_BREAKERS.at(-1)!) {
      messages.push('La corriente de cabecera supera el rango de calibres modelado (125 A).');
    }
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
    if (
      isPublicVenue &&
      !panels.some((panel) => panel.circuits.some((circuit) => circuit.kind === 'EMG'))
    ) {
      messages.push(
        'El proyecto de pública concurrencia no tiene ningún circuito de iluminación de emergencia.',
      );
    }
    if (isPublicVenue && activePanel.architecture === 'essential') {
      messages.push(
        'Para pública concurrencia, separar usos normales y servicios de emergencia; evitar un único diferencial común.',
      );
    }
    return messages;
  }, [
    activePanel,
    calculations.feederDrop.percent,
    calculations.imbalance,
    calculations.mainCurrent,
    isPublicVenue,
    panels,
    profile.breakingCapacityKa,
    profile.groundResistanceOhm,
    profile.prospectiveShortCircuitKa,
    tpPanel.supply,
  ]);

  const costOptions = useMemo<CostOption[]>(() => {
    const mcbHeadPrice =
      activePanel.supply === 'tri' ? prices.mcb4P : prices.mcb2P;
    const baseRcdPrice = activePanel.supply === 'tri' ? prices.rcd4P : prices.rcd2P;
    const differentialType = panelDifferentialType(activePanel);
    const differentialFactor =
      differentialType === 'A' ? 1 + prices.typeAPremium / 100 : 1;
    const rcdPrice =
      baseRcdPrice * differentialFactor;
    const spdPrice = activePanel.supply === 'tri' ? prices.spd4P : prices.spd2P;
    const includeDps = panelHasDps(activePanel);
    const branchMcbPrice = activePanel.circuits.reduce(
      (total, circuit) =>
        total + (circuit.phase === '3Φ' ? prices.mcb4P : prices.mcb2P),
      0,
    );

    const childPanels =
      activePanel.type === 'TP'
        ? panels.filter((panel) => panel.type === 'TS' && panel.parentId === activePanel.id)
        : [];
    const feederMcbPrice = childPanels.reduce(
      (total, child) => total + (child.supply === 'tri' ? prices.mcb4P : prices.mcb2P),
      0,
    );
    const essentialModules = architectureOccupiedModules(
      'essential',
      activePanel.supply,
      activePanel.circuits,
      childPanels,
      includeDps,
    );
    const balancedModules = architectureOccupiedModules(
      'balanced',
      activePanel.supply,
      activePanel.circuits,
      childPanels,
      includeDps,
    );
    const continuityDifferentials = activePanel.circuits.reduce(
      (total, circuit) =>
        total +
        (circuit.phase === '3Φ' ? prices.rcd4P : prices.rcd2P) * differentialFactor,
      0,
    );
    const continuityModules = architectureOccupiedModules(
      'continuity',
      activePanel.supply,
      activePanel.circuits,
      childPanels,
      includeDps,
    );

    const calculateCost = (
      id: Architecture,
      title: string,
      subtitle: string,
      modules: number,
      differentialCost: number,
      protection: string,
      continuity: string,
      score: number,
      rcdLabel: string,
    ): CostOption => {
      const cabinet = cabinetFor(
        Math.ceil(modules * (1 + activePanel.reservePercent / 100)),
        prices,
      );
      const lines: CostLine[] = [
        { label: `Gabinete DIN (${cabinet.label})`, value: cabinet.value },
        {
          label: `${activePanel.type === 'TP' ? 'IGA' : 'Corte local'} ${activePanel.supply === 'tri' ? '4P' : '2P'}`,
          value: mcbHeadPrice,
        },
        { label: `${rcdLabel} · tipo ${differentialType}`, value: differentialCost },
        { label: `Térmicas de circuitos (${activePanel.circuits.length})`, value: branchMcbPrice },
      ];
      if (includeDps) {
        lines.splice(2, 0, {
          label: `DPS ${activePanel.supply === 'tri' ? '3P+N' : '1P+N'} transitorias`,
          value: spdPrice,
        });
      }
      if (feederMcbPrice > 0) {
        lines.push({
          label: `Térmicas alimentadores TS (${childPanels.length})`,
          value: feederMcbPrice,
        });
      }
      const material = lines.reduce((total, line) => total + line.value, 0);
      const withAccessories = material * (1 + prices.accessoriesPercent / 100);
      const total = withAccessories * (1 + prices.assemblyPercent / 100);
      return {
        id,
        title,
        subtitle,
        modules,
        cabinetLabel: cabinet.label,
        material,
        total,
        protection,
        continuity,
        score,
        lines,
      };
    };

    return [
      calculateCost(
        'essential',
        'Propuesta Esencial',
        '1 diferencial de cabecera',
        essentialModules,
        rcdPrice,
        'Protección reglamentaria básica.',
        'Un disparo corta toda la instalación.',
        68,
        `1 × Diferencial ${activePanel.supply === 'tri' ? '4P' : '2P'} 30 mA`,
      ),
      calculateCost(
        'balanced',
        'Propuesta Equilibrada',
        '2 diferenciales por zonas',
        balancedModules,
        rcdPrice * 2,
        'Excelente protección con separación de fallas.',
        'Aísla iluminación/tomas del resto de las cargas.',
        92,
        `2 × Diferencial ${activePanel.supply === 'tri' ? '4P' : '2P'} 30 mA`,
      ),
      calculateCost(
        'continuity',
        'Máxima Continuidad',
        'Diferencial por circuito',
        continuityModules,
        continuityDifferentials,
        'Protección independiente por salida.',
        'La falla en un circuito no afecta a ningún otro.',
        98,
        `${activePanel.circuits.length} × Diferenciales dedicados`,
      ),
    ];
  }, [activePanel, panels, prices]);

  const selectedCost = useMemo(() => {
    return (
      costOptions.find((option) => option.id === activePanel.architecture) ??
      costOptions[1]
    );
  }, [activePanel.architecture, costOptions]);

  const recommendedCost = useMemo(() => {
    return isPublicVenue
      ? costOptions.find((option) => option.id === 'balanced') ?? costOptions[1]
      : costOptions[0];
  }, [costOptions, isPublicVenue]);

  const projectCostSummary = useMemo(() => {
    const byPanel = panels.map((panel) => {
      const children =
        panel.type === 'TP'
          ? panels.filter(
              (child) => child.type === 'TS' && child.parentId === panel.id,
            )
          : [];
      const requiredModules = architectureOccupiedModules(
        panel.architecture,
        panel.supply,
        panel.circuits,
        children,
        panelHasDps(panel),
      );
      const cabinet = cabinetFor(
        Math.ceil(requiredModules * (1 + panel.reservePercent / 100)),
        prices,
      );
      const head = panel.supply === 'tri' ? prices.mcb4P : prices.mcb2P;
      const spd = panel.supply === 'tri' ? prices.spd4P : prices.spd2P;
      const typeFactor =
        panelDifferentialType(panel) === 'A' ? 1 + prices.typeAPremium / 100 : 1;
      const rcd2P = prices.rcd2P * typeFactor;
      const rcd4P = prices.rcd4P * typeFactor;
      const sharedRcd = (panel.supply === 'tri' ? rcd4P : rcd2P) *
        (panel.architecture === 'essential' ? 1 : panel.architecture === 'balanced' ? 2 : 0);
      const individualRcd =
        panel.architecture === 'continuity'
          ? panel.circuits.reduce(
              (total, circuit) => total + (circuit.phase === '3Φ' ? rcd4P : rcd2P),
              0,
            )
          : 0;
      const terminalBreakers = panel.circuits.reduce(
        (total, circuit) =>
          total + (circuit.phase === '3Φ' ? prices.mcb4P : prices.mcb2P),
        0,
      );
      const feederBreakers = children.reduce(
        (total, child) => total + (child.supply === 'tri' ? prices.mcb4P : prices.mcb2P),
        0,
      );
      const material =
        cabinet.value +
        head +
        (panelHasDps(panel) ? spd : 0) +
        sharedRcd +
        individualRcd +
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
    return [...selectedCost.lines].sort((a, b) => b.value - a.value).slice(0, 4);
  }, [selectedCost.lines]);

  const complianceItems = useMemo(() => {
    return [
      {
        group: 'Municipalidad de San Rafael',
        label: 'Escala reglamentaria 1:50 o 1:100',
        ready: true,
        action: `Escala seleccionada: ${profile.planScale}`,
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
        label: 'Poder de corte ≥ Ik presunta',
        ready: profile.breakingCapacityKa >= profile.prospectiveShortCircuitKa,
        action: `${profile.breakingCapacityKa} kA adoptado ≥ ${profile.prospectiveShortCircuitKa} kA presunto`,
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
  }, [
    profile.breakingCapacityKa,
    profile.descriptiveMemoryReady,
    profile.groundResistanceOhm,
    profile.planScale,
    profile.prospectiveShortCircuitKa,
    profile.registeredProfessionalReady,
    profile.siteTestReady,
  ]);

  function updateProfile<K extends keyof ProjectProfile>(
    key: K,
    value: ProjectProfile[K],
  ) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function applyPreset(preset: ProjectPreset) {
    if (preset === 'custom') {
      updateProfile('preset', preset);
      return;
    }
    const nextCircuits = projectCircuits(preset);
    const config = {
      hall: {
        name: 'SALÓN · 24 × 10 m',
        widthM: 24,
        lengthM: 10,
        occupancy: 180,
        evacuation: 'BD3' as EvacuationClass,
        supply: 'tri' as Supply,
        architecture: 'balanced' as Architecture,
        differentialType: 'A' as DifferentialType,
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
      },
      residential: {
        name: 'VIVIENDA UNIFAMILIAR',
        widthM: 10,
        lengthM: 8,
        occupancy: 5,
        evacuation: 'BD1' as EvacuationClass,
        supply: 'mono' as Supply,
        architecture: 'essential' as Architecture,
        differentialType: 'AC' as DifferentialType,
      },
    }[preset];

    setProfile((current) => ({
      ...current,
      preset,
      widthM: config.widthM,
      lengthM: config.lengthM,
      occupancy: config.occupancy,
      evacuation: config.evacuation,
    }));
    setProjectName(config.name);
    setPanels((current) =>
      current.map((panel) => {
        if (panel.type === 'TP') {
          return {
            ...panel,
            supply: config.supply,
            architecture: config.architecture,
            includeDps: true,
            differentialType: config.differentialType,
            circuits: nextCircuits.map((circuit) => ({
              ...circuit,
              phase: config.supply === 'mono' ? ('L1' as Phase) : circuit.phase,
            })),
          };
        }
        if (config.supply === 'mono') {
          return {
            ...panel,
            supply: 'mono',
            feederPhase: 'L1',
            circuits: panel.circuits.map((circuit) => ({
              ...circuit,
              phase: 'L1' as Phase,
              modules: Math.min(circuit.modules, 2),
            })),
          };
        }
        return panel;
      }),
    );
    setActivePanelId(tpPanel.id);
    setOptimizationMessage('Preajuste aplicado al proyecto y al Tablero Principal.');
  }

  function updateCircuit<K extends keyof Circuit>(
    id: number,
    key: K,
    value: Circuit[K],
  ) {
    updateActivePanel(
      'circuits',
      activePanel.circuits.map((circuit) =>
        circuit.id === id ? { ...circuit, [key]: value } : circuit,
      ),
    );
  }

  function addCircuit(kind: CircuitKind) {
    const template = TEMPLATES[kind];
    const newId =
      activePanel.circuits.length > 0
        ? Math.max(...activePanel.circuits.map((item) => item.id)) + 1
        : 1;
    const defaultPhase: Phase =
      activePanel.supply === 'mono'
        ? 'L1'
        : (['L1', 'L2', 'L3'] as const)[
            (activePanel.circuits.length) % 3
          ];

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
      Math.max(...activePanel.circuits.map((item) => item.id), 0) + 1;
    const duplicated: Circuit = {
      ...circuit,
      id: newId,
      name: `${circuit.name} (copia)`,
    };
    updateActivePanel('circuits', [...activePanel.circuits, duplicated]);
  }

  function optimizeProject() {
    if (activePanel.supply !== 'tri') {
      setOptimizationMessage(
        'En monofásico no hay fases para balancear. Ajustamos protecciones y calibre comercial.',
      );
      updateActivePanel(
        'circuits',
        activePanel.circuits.map((circuit) => ({
          ...circuit,
          breaker: nextBreaker(circuitCurrent(circuit, 'mono') * 1.15),
        })),
      );
      return;
    }

    const singlePhaseCircuits = activePanel.circuits
      .filter((circuit) => circuit.phase !== '3Φ')
      .sort((a, b) => circuitPower(b) - circuitPower(a));
    const threePhaseCircuits = activePanel.circuits.filter(
      (circuit) => circuit.phase === '3Φ',
    );

    const phaseTotals: Record<'L1' | 'L2' | 'L3', number> = {
      L1: 0,
      L2: 0,
      L3: 0,
    };
    const updatedSinglePhase: Circuit[] = [];

    singlePhaseCircuits.forEach((circuit) => {
      const bestPhase = (['L1', 'L2', 'L3'] as const).reduce((minPhase, phase) =>
        phaseTotals[phase] < phaseTotals[minPhase] ? phase : minPhase,
      );
      const power = circuitPower(circuit);
      phaseTotals[bestPhase] += power;
      const current = power / 220;
      updatedSinglePhase.push({
        ...circuit,
        phase: bestPhase,
        breaker: Math.max(circuit.breaker, nextBreaker(current * 1.15)),
      });
    });

    const optimized = [...updatedSinglePhase, ...threePhaseCircuits].sort(
      (a, b) => a.id - b.id,
    );
    updateActivePanel('circuits', optimized);
    setOptimizationMessage(
      'Fases balanceadas y calibres de protección verificados con éxito.',
    );
  }

  function resetProject() {
    setProfile(INITIAL_PROFILE);
    setProjectName('SALÓN · 24 × 10 m');
    setPanels(INITIAL_PANELS);
    setActivePanelId('tp');
    setPrices(DEFAULT_PRICES);
    setOptimizationMessage('');
    window.localStorage.removeItem(STORAGE_KEY);
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
        const data = JSON.parse(e.target?.result as string);
        if (!isRecord(data)) throw new Error('Formato raíz inválido');
        const importedPanels = normalizePanels(data.panels);
        if (!importedPanels) {
          throw new Error('Debe existir exactamente un TP y al menos un tablero válido');
        }
        if (typeof data.projectName === 'string' && data.projectName.trim()) {
          setProjectName(data.projectName.trim());
        }
        if (data.profile) setProfile(normalizeProfile(data.profile));
        if (data.experienceMode === 'guided' || data.experienceMode === 'technical') {
          setExperienceMode(data.experienceMode);
        }
        setPanels(importedPanels);
        setActivePanelId(
          importedPanels.some((panel) => panel.id === data.activePanelId)
            ? String(data.activePanelId)
            : importedPanels[0].id,
        );
        if (data.prices) setPrices(normalizePrices(data.prices));
        setOptimizationMessage('Proyecto importado correctamente.');
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
    let csv =
      'Tablero,Clase,ID,Nombre,Tipo,Bocas,VA por Boca,Potencia Total [VA],Fase,Ib [A],Protección In [A],Conductor [mm2],Longitud [m],Caída ΔU [%],Módulos DIN\n';

    targetPanels.forEach((panel) => {
      if (panel.type === 'TP') {
        panels
          .filter((child) => child.type === 'TS' && child.parentId === panel.id)
          .forEach((child, index) => {
            const childCalculation = panelCalculations.get(child.id);
            csv += `"${panel.name}",Alimentador,A${index + 1},"${child.name}",TS,,,${childCalculation?.demandVA.toFixed(0) ?? 0},${child.feederPhase ?? (child.supply === 'tri' ? '3Φ' : 'L1')},${childCalculation?.mainCurrent.toFixed(2) ?? 0},${child.feederBreaker ?? 32},${child.feederConductor ?? 6},${child.feederLengthM ?? 15},${childCalculation?.feederDrop.percent.toFixed(2) ?? 0},${child.supply === 'tri' ? 4 : 2}\n`;
          });
      }
      panel.circuits.forEach((c, index) => {
        const power = circuitPower(c);
        const current = circuitCurrent(c, panel.supply);
        const drop = voltageDrop(c, panel.supply);
        csv += `"${panel.name}",Circuito terminal,C${index + 1},"${c.name}",${c.kind},${c.points},${c.unitVA},${power},${c.phase},${current.toFixed(2)},${c.breaker},${c.conductor},${c.lengthM},${drop.percent.toFixed(2)},${c.modules}\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
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

  const devices = useMemo(() => {
    const headerDevices: PanelDevice[] = [
      {
        key: 'cabecera',
        label: activePanel.type === 'TP' ? 'IGA' : 'CORTE',
        fullName:
          activePanel.type === 'TP'
            ? 'Interruptor General Automático'
            : 'Interruptor de corte local',
        detail: `${calculations.mainBreaker} A`,
        span: activePanel.supply === 'tri' ? 4 : 2,
        className: 'device-main',
      },
    ];
    if (panelHasDps(activePanel)) {
      headerDevices.push({
        key: 'spd',
        label: 'DPS',
        fullName: 'Protección contra sobretensiones',
        detail: activePanel.supply === 'tri' ? '3P+N' : '1P+N',
        span: activePanel.supply === 'tri' ? 4 : 2,
        className: 'device-spd',
      });
    }
    const differentialDevices: PanelDevice[] = [];
    if (activePanel.architecture === 'essential') {
      differentialDevices.push({
        key: 'diff',
        label: 'ID',
        fullName: 'Interruptor Diferencial',
        detail: `General · 30 mA · ${panelDifferentialType(activePanel)}`,
        span: activePanel.supply === 'tri' ? 4 : 2,
        className: 'device-rcd',
      });
    }
    if (activePanel.architecture === 'balanced') {
      differentialDevices.push(
        {
          key: 'diff-a',
          label: 'ID A',
          fullName: 'Interruptor Diferencial',
          detail: `Uso normal · 30 mA · ${panelDifferentialType(activePanel)}`,
          span: activePanel.supply === 'tri' ? 4 : 2,
          className: 'device-rcd',
        },
        {
          key: 'diff-b',
          label: 'ID B',
          fullName: 'Interruptor Diferencial',
          detail: `Uso crítico · 30 mA · ${panelDifferentialType(activePanel)}`,
          span: activePanel.supply === 'tri' ? 4 : 2,
          className: 'device-rcd',
        },
      );
    }

    // If active panel is TP, display feeder breakers for child TS panels!
    const feederDevices: PanelDevice[] = childPanels.map((child, idx) => ({
      key: `feeder-${child.id}`,
      label: `Alim. TS${idx + 1}`,
      fullName: `Alimentador a ${child.name}`,
      detail: `${child.feederBreaker ?? 32} A · ${child.supply === 'tri' ? '4P' : `2P ${child.feederPhase ?? 'L1'}`}`,
      span: child.supply === 'tri' ? 4 : 2,
      className: 'device-feeder',
    }));

    return [
      ...headerDevices,
      ...feederDevices,
      ...differentialDevices,
      ...activePanel.circuits.map((circuit, index) => ({
        key: `circuit-${circuit.id}`,
        circuitId: circuit.id,
        label:
          activePanel.architecture === 'continuity'
            ? `C${index + 1} + ID`
            : `C${index + 1}`,
        fullName:
          circuit.kind === 'EMG'
            ? 'Térmica · Emergencia'
            : `Térmica · ${circuit.kind}`,
        detail:
          activePanel.architecture === 'continuity'
            ? `${circuit.breaker} A · 30 mA`
            : `${circuit.breaker} A`,
        span:
          circuit.modules +
          (activePanel.architecture === 'continuity'
            ? circuit.phase === '3Φ'
              ? 4
              : 2
            : 0),
        className:
          circuit.kind === 'EMG' ? 'device-emergency' : 'device-circuit',
      })),
    ];
  }, [activePanel, calculations.mainBreaker, childPanels]);

  const activeHighlightedCircuitId = selectedCircuitId ?? hoveredCircuitId;

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
        <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
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
          <div className="flex flex-wrap items-center gap-2">
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
              title="Descargar todos los tableros y circuitos en CSV"
            >
              <FileSpreadsheet data-icon="inline-start" />
              <span className="hidden sm:inline">CSV proyecto</span>
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
        {/* Print Header */}
        <div className="mb-4 hidden items-start justify-between border-b-2 border-slate-900 pb-3 print:flex">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em]">
              Planilla de predimensionado eléctrico
            </p>
            <h1 className="text-2xl font-bold">{projectName}</h1>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
              {activePanel.name} ({activePanel.type === 'TP' ? 'Tablero Principal' : 'Tablero Seccional'})
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
                  Jerarquía de Tableros: Acometida → {panels.length} Tablero{panels.length > 1 ? 's' : ''}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="rounded-lg bg-white/5 px-3 py-1.5 font-mono">
                <span className="text-slate-400">Demanda global:</span>{' '}
                <strong className="text-amber-300">{formatPower(globalSummary.totalDemandVA)}</strong>
              </div>
              <div className="rounded-lg bg-white/5 px-3 py-1.5 font-mono">
                <span className="text-slate-400">Potencia total:</span>{' '}
                <strong className="text-slate-200">{formatPower(globalSummary.totalInstalledVA)}</strong>
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
                    onClick={() => setActivePanelId(p.id)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-left"
                  >
                    <Layers className={`size-4 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold">{p.name}</span>
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
                        <p className={`font-mono text-[10px] ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                          {formatPower(calc.demandVA)} · {calc.mainCurrent.toFixed(1)} A · {calc.occupiedModules} M
                        </p>
                      )}
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
                          if (confirm(`¿Eliminar ${p.name}?`)) deletePanel(p.id);
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
              <h2 className="mt-1 text-lg font-semibold">Del ambiente al tablero en pocos datos</h2>
              <p className="mt-1 text-xs text-slate-400">
                Elegí una base, corregí dimensiones y ocupación; después ajustá los circuitos reales.
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
                <Label htmlFor="quick-project-name" className="text-xs text-muted-foreground">
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
                <Label htmlFor="active-panel-name" className="text-xs text-muted-foreground">
                  Nombre del Tablero
                </Label>
                <Input
                  id="active-panel-name"
                  value={activePanel.name}
                  onChange={(event) => updateActivePanel('name', event.target.value)}
                  className="font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quick-supply" className="text-xs text-muted-foreground">
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
                  <NativeSelectOption value="mono">220 V mono</NativeSelectOption>
                  <NativeSelectOption
                    value="tri"
                    disabled={activePanel.type === 'TS' && tpPanel.supply === 'mono'}
                  >
                    380/220 V tri
                  </NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="rounded-xl border bg-muted/25 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Superficie
                </p>
                <p className="mt-1 font-mono text-lg font-bold">{projectArea.toFixed(0)} m²</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {areaPerPerson.toFixed(2)} m²/persona
                </p>
              </div>
            </div>

            {/* Feeder configuration if Seccional */}
            {activePanel.type === 'TS' && (
              <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-sky-950">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="size-4 text-sky-700" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-sky-900">
                        Línea Seccional (Alimentador desde TP hacia {activePanel.name})
                      </p>
                      <p className="text-[10px] text-sky-800/80">
                        Configuración del cable y de la térmica que lo protege dentro del Tablero Principal.
                      </p>
                    </div>
                  </div>
                  <Badge className="border-sky-300 bg-white text-sky-900">
                    ΔV Alimentador: {calculations.feederDrop.percent.toFixed(2)} % ({calculations.feederDrop.volts.toFixed(1)} V)
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
                    <Label className="text-xs text-muted-foreground">Sección alimentador</Label>
                    <NativeSelect
                      className="w-full bg-white"
                      value={activePanel.feederConductor ?? 6}
                      onChange={(e) => updateActivePanel('feederConductor', Number(e.target.value))}
                    >
                      {[4, 6, 10, 16, 25, 35].map((val) => (
                        <NativeSelectOption key={val} value={val}>
                          {val} mm² ({CONDUCTOR_CAPACITY[val]} A máx)
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Térmica en el TP para este alimentador
                    </Label>
                    <NativeSelect
                      className="w-full bg-white"
                      value={activePanel.feederBreaker ?? 32}
                      onChange={(e) => updateActivePanel('feederBreaker', Number(e.target.value))}
                    >
                      {STANDARD_BREAKERS.map((val) => (
                        <NativeSelectOption key={val} value={val}>
                          {val} A ({activePanel.supply === 'tri' ? '4P' : '2P'})
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Fase tomada del TP</Label>
                    <NativeSelect
                      className="w-full bg-white"
                      value={activePanel.supply === 'tri' ? '3Φ' : activePanel.feederPhase ?? 'L1'}
                      disabled={activePanel.supply === 'tri' || tpPanel.supply === 'mono'}
                      onChange={(event) =>
                        updateActivePanel('feederPhase', event.target.value as Phase)
                      }
                    >
                      {activePanel.supply === 'tri' ? (
                        <NativeSelectOption value="3Φ">L1 + L2 + L3</NativeSelectOption>
                      ) : tpPanel.supply === 'mono' ? (
                        <NativeSelectOption value="L1">L1 del TP monofásico</NativeSelectOption>
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

        {/* Technical parameters for active panel */}
        {experienceMode === 'technical' && (
          <div className="print-hide mb-5 grid gap-3 rounded-2xl border bg-card p-4 shadow-sm lg:grid-cols-3 xl:grid-cols-[minmax(240px,1.3fr)_repeat(6,minmax(110px,.55fr))]">
            <div className="space-y-1.5">
              <Label htmlFor="panel-select-tech" className="text-xs text-muted-foreground">
                Tablero activo
              </Label>
              <NativeSelect
                id="panel-select-tech"
                className="w-full font-medium"
                value={activePanel.id}
                onChange={(e) => setActivePanelId(e.target.value)}
              >
                {panels.map((p) => (
                  <NativeSelectOption key={p.id} value={p.id}>
                    {p.name} ({p.type})
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supply-tech" className="text-xs text-muted-foreground">
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
                  <NativeSelectOption value="mono">Monofásico · 220 V</NativeSelectOption>
                  <NativeSelectOption
                    value="tri"
                    disabled={activePanel.type === 'TS' && tpPanel.supply === 'mono'}
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
                onChange={(event) => updateActivePanel('demandFactor', Number(event.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reserve" className="text-xs text-muted-foreground">
                Reserva modular
              </Label>
              <div className="relative">
                <Input
                  id="reserve"
                  type="number"
                  min="0"
                  max="100"
                  value={activePanel.reservePercent}
                  onChange={(event) => updateActivePanel('reservePercent', Number(event.target.value))}
                  className="pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modules-row" className="text-xs text-muted-foreground">
                Módulos por fila
              </Label>
              <NativeSelect
                id="modules-row"
                className="w-full"
                value={activePanel.modulesPerRow}
                onChange={(event) => updateActivePanel('modulesPerRow', Number(event.target.value))}
              >
                {[12, 18, 24].map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {value} módulos
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dps-local" className="text-xs text-muted-foreground">
                DPS en este tablero
              </Label>
              <NativeSelect
                id="dps-local"
                className="w-full"
                value={panelHasDps(activePanel) ? 'yes' : 'no'}
                onChange={(event) => updateActivePanel('includeDps', event.target.value === 'yes')}
              >
                <NativeSelectOption value="yes">Incluido</NativeSelectOption>
                <NativeSelectOption value="no">No incluido</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="differential-type" className="text-xs text-muted-foreground">
                Tipo diferencial
              </Label>
              <NativeSelect
                id="differential-type"
                className="w-full"
                value={panelDifferentialType(activePanel)}
                onChange={(event) =>
                  updateActivePanel('differentialType', event.target.value as DifferentialType)
                }
              >
                <NativeSelectOption value="AC">Tipo AC</NativeSelectOption>
                <NativeSelectOption value="A">Tipo A</NativeSelectOption>
              </NativeSelect>
            </div>
          </div>
        )}

        {/* Panel Metrics */}
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
            label={activePanel.type === 'TP' ? 'IGA sugerido' : 'Corte local sugerido'}
            value={`${calculations.mainBreaker} A`}
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
                  <h2 className="font-semibold">Circuitos de {activePanel.name}</h2>
                  <Badge variant="secondary">{activePanel.circuits.length}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pasa el ratón sobre cualquier circuito para resaltarlo en el Riel DIN y el esquema unifilar.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  size="sm"
                  onClick={optimizeProject}
                >
                  <Sparkles data-icon="inline-start" /> Optimizar fases
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
                  experienceMode === 'technical' ? 'min-w-[1160px]' : 'min-w-[980px]'
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
                    const isHighlighted = activeHighlightedCircuitId === circuit.id;
                    const cDrop = voltageDrop(circuit, activePanel.supply);
                    const totalDropPercent =
                      cDrop.percent +
                      (activePanel.type === 'TS' ? calculations.feederDrop.percent : 0);

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
                              value={circuit.name}
                              onChange={(event) =>
                                updateCircuit(circuit.id, 'name', event.target.value)
                              }
                              className="border-transparent bg-transparent px-1 font-medium shadow-none hover:border-input focus-visible:bg-background"
                            />
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <NativeSelect
                            size="sm"
                            value={circuit.kind}
                            onChange={(event) =>
                              updateCircuit(circuit.id, 'kind', event.target.value as CircuitKind)
                            }
                          >
                            {(Object.keys(TEMPLATES) as CircuitKind[]).map((kind) => (
                              <NativeSelectOption key={kind} value={kind}>
                                {kind}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        </td>
                        <td className="px-2 py-2">
                          <CompactNumber
                            value={circuit.points}
                            min={1}
                            onChange={(value) => updateCircuit(circuit.id, 'points', value)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <CompactNumber
                            value={circuit.unitVA}
                            min={1}
                            onChange={(value) => updateCircuit(circuit.id, 'unitVA', value)}
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-xs font-semibold">
                          {formatPower(circuitPower(circuit))}
                        </td>
                        <td className="px-2 py-2">
                          <NativeSelect
                            size="sm"
                            value={activePanel.supply === 'mono' ? 'L1' : circuit.phase}
                            disabled={activePanel.supply === 'mono'}
                            onChange={(event) =>
                              updateCircuit(circuit.id, 'phase', event.target.value as Phase)
                            }
                          >
                            <NativeSelectOption value="L1">L1</NativeSelectOption>
                            {activePanel.supply === 'tri' && (
                              <>
                                <NativeSelectOption value="L2">L2</NativeSelectOption>
                                <NativeSelectOption value="L3">L3</NativeSelectOption>
                                <NativeSelectOption value="3Φ">3Φ</NativeSelectOption>
                              </>
                            )}
                          </NativeSelect>
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-xs">
                          {circuitCurrent(circuit, activePanel.supply).toFixed(1)} A
                        </td>
                        <td className="px-2 py-2">
                          <NativeSelect
                            size="sm"
                            className="ml-auto w-20"
                            value={circuit.breaker}
                            onChange={(event) =>
                              updateCircuit(circuit.id, 'breaker', Number(event.target.value))
                            }
                          >
                            {STANDARD_BREAKERS.slice(0, 9).map((value) => (
                              <NativeSelectOption key={value} value={value}>
                                {value} A
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        </td>
                        <td className="px-2 py-2">
                          <NativeSelect
                            size="sm"
                            className="ml-auto w-24"
                            value={circuit.conductor}
                            onChange={(event) =>
                              updateCircuit(circuit.id, 'conductor', Number(event.target.value))
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
                              value={circuit.lengthM}
                              min={1}
                              onChange={(value) => updateCircuit(circuit.id, 'lengthM', value)}
                            />
                          </td>
                        )}
                        {experienceMode === 'technical' && (
                          <td
                            className={`px-2 py-2 text-right font-mono text-xs font-semibold ${
                              totalDropPercent > 3 ? 'text-amber-700' : 'text-emerald-700'
                            }`}
                          >
                            {totalDropPercent.toFixed(1)} %
                          </td>
                        )}
                        <td className="px-2 py-2">
                          <CompactNumber
                            value={circuit.modules}
                            min={1}
                            max={8}
                            onChange={(value) => updateCircuit(circuit.id, 'modules', value)}
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
                                  activePanel.circuits.filter((item) => item.id !== circuit.id),
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
              {optimizationMessage && (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                  <CheckCircle2 className="size-4 shrink-0" /> {optimizationMessage}
                </div>
              )}
              {warnings.length ? (
                <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide">
                      Revisar {warnings.length} observación{warnings.length > 1 ? 'es' : ''}
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
                  <CheckCircle2 className="size-4" /> Sin alertas preliminares en {activePanel.name}.
                </div>
              )}
            </div>
          </section>

          {/* Visual DIN Panel and Phase Balance */}
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(520px,1.3fr)_minmax(360px,.7fr)]">
            <section className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Vista frontal de {activePanel.name}
                  </p>
                  <h2 className="text-lg font-semibold">Tablero DIN · {calculations.rows} filas</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Lectura de izquierda a derecha: cabecera, protección y circuitos de salida.
                  </p>
                </div>
                <Badge variant="outline">
                  ≈ {calculations.widthMm} × {calculations.heightMm} × 120 mm
                </Badge>
              </div>
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
                  <Badge variant={calculations.imbalance > 0.2 ? 'destructive' : 'secondary'}>
                    {Math.round(calculations.imbalance * 100)} % desbalance
                  </Badge>
                </div>
                <div className="space-y-3">
                  {(['L1', 'L2', 'L3'] as const).map((phase) => {
                    const max = Math.max(...Object.values(calculations.phaseVA), 1);
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
              <h2 className="text-lg font-semibold">Esquema unifilar preliminar</h2>
            </div>
            <p className="max-w-xl text-xs text-muted-foreground">
              El esquema muestra la arquitectura del tablero. Deben verificarse poder de corte,
              cortocircuito, selectividad, caída de tensión y método de instalación.
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
              <h2 className="text-lg font-semibold">Esquema multifilar para Ordenanza 72/83</h2>
            </div>
            <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
              La ordenanza pide agrupar fase, neutro y protección por salida, identificar circuitos y
              secciones. Este cuadro sirve como base; el plano profesional debe completar canalizaciones,
              diámetros, conductores y conexiones reales.
            </p>
          </div>
          <MultiLineDiagram
            panel={activePanel}
            childPanels={childPanels}
            calculations={panelCalculations}
          />
        </section>

        {/* Compliance and Municipal Checks */}
        <section className="mt-5 grid overflow-hidden rounded-2xl border bg-card shadow-sm xl:grid-cols-[minmax(320px,.8fr)_minmax(0,1.7fr)]">
          <div className="border-b bg-slate-950 p-4 text-white xl:border-b-0 xl:border-r">
            <div className="flex items-center gap-2 text-amber-300">
              <BookOpenCheck className="size-4" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">
                Datos de verificación
              </p>
            </div>
            <h2 className="mt-1 text-lg font-semibold">Lo que define la seguridad</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Estos valores deben surgir del proyecto y de mediciones. Los iniciales son supuestos
              editables, no certificaciones.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <QuickNumber
                dark
                label="Ik presunta"
                value={profile.prospectiveShortCircuitKa}
                suffix="kA"
                min={0.1}
                step={0.5}
                onChange={(value) => updateProfile('prospectiveShortCircuitKa', value)}
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
                onChange={(value) => updateProfile('groundResistanceOhm', value)}
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
                    updateProfile('evacuation', event.target.value as EvacuationClass)
                  }
                >
                  <NativeSelectOption value="BD1">BD1 · fácil</NativeSelectOption>
                  <NativeSelectOption value="BD2">BD2</NativeSelectOption>
                  <NativeSelectOption value="BD3">BD3 · público</NativeSelectOption>
                  <NativeSelectOption value="BD4">BD4 · difícil</NativeSelectOption>
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
                    updateProfile('planScale', event.target.value as ProjectProfile['planScale'])
                  }
                >
                  <NativeSelectOption value="1:50">1:50</NativeSelectOption>
                  <NativeSelectOption value="1:100">1:100 · salón amplio</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="flex items-end">
                <Badge
                  className={`mb-1 ${
                    warnings.length
                      ? 'border border-amber-300/30 bg-amber-300/10 text-amber-200'
                      : 'border border-emerald-300/30 bg-emerald-300/10 text-emerald-200'
                  }`}
                >
                  {warnings.length ? `${warnings.length} alertas` : 'Sin alertas'}
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
                  {complianceItems.filter((item) => item.ready).length} de {complianceItems.length}{' '}
                  controles con datos suficientes
                </h2>
              </div>
              <Badge variant="outline">Estado preliminar · no es visación</Badge>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {complianceItems.map((item) => (
                <div
                  key={`${item.group}-${item.label}`}
                  className={`flex gap-3 rounded-xl border p-3 ${
                    item.ready ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
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
                    {!item.ready && (
                      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                        {item.action}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="print-hide mt-3 grid gap-2 sm:grid-cols-3">
              <ChecklistToggle
                label="Memoria preparada"
                checked={profile.descriptiveMemoryReady}
                onChange={(checked) => updateProfile('descriptiveMemoryReady', checked)}
              />
              <ChecklistToggle
                label="Profesional matriculado"
                checked={profile.registeredProfessionalReady}
                onChange={(checked) => updateProfile('registeredProfessionalReady', checked)}
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
              <h2 className="mt-1 text-lg font-semibold">Fórmulas, valores reemplazados y resultados</h2>
              <p className="mt-1 max-w-3xl text-xs text-slate-400">
                Las cargas se ingresan en VA: la potencia aparente ya contempla el factor de potencia.
              </p>
            </div>
            <Badge className="w-fit border border-amber-300/20 bg-amber-300/10 text-amber-200">
              ρ cobre = 0,018 Ω·mm²/m
            </Badge>
          </div>

          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            <FormulaCard
              title="Potencia instalada"
              formula={activePanel.type === 'TP' ? 'Sinst,TP = Spropia + ΣSinst,TS' : 'Sinst = Σ(ni × Si)'}
              substitution={
                activePanel.type === 'TP'
                  ? `${Math.round(calculations.ownInstalledVA)} + ${childPanels.map((child) => Math.round(panelCalculations.get(child.id)?.ownInstalledVA ?? 0)).join(' + ') || '0'} VA`
                  : `${activePanel.circuits.map((circuit) => Math.round(circuitPower(circuit))).join(' + ') || '0'} VA`
              }
              result={formatPower(calculations.installedVA)}
              note={activePanel.type === 'TP' ? 'El TP agrega una sola vez la potencia propia de cada TS' : 'ni: cantidad de bocas · Si: VA asignados por boca'}
            />
            <FormulaCard
              title="Demanda simultánea"
              formula={activePanel.type === 'TP' ? 'Sd,TP = Spropia × fsTP + ΣSd,TS' : 'Sd = Sinst × fs'}
              substitution={
                activePanel.type === 'TP'
                  ? `${Math.round(calculations.ownInstalledVA)} × ${formatNumber(activePanel.demandFactor, 2)} + (${childPanels.map((child) => Math.round(panelCalculations.get(child.id)?.demandVA ?? 0)).join(' + ') || '0'}) VA`
                  : `${Math.round(calculations.installedVA)} VA × ${formatNumber(activePanel.demandFactor, 2)}`
              }
              result={formatPower(calculations.demandVA)}
              note={activePanel.type === 'TP' ? 'Cada TS conserva su propio factor de simultaneidad' : 'fs: factor de simultaneidad editable'}
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
              formula="In ≥ 1,15 × Ib"
              substitution={`1,15 × ${formatNumber(calculations.mainCurrent, 2)} A = ${formatNumber(calculations.mainCurrent * 1.15, 2)} A`}
              result={`${calculations.mainBreaker} A`}
              note={`Por corriente: ${calculations.currentBasedBreaker} A · mayor derivación: ${calculations.maxBranchBreaker || 0} A · se adopta el mayor y se verifican Iz e Ik`}
            />
            {activePanel.type === 'TS' && (
              <FormulaCard
                title="Caída del alimentador"
                formula={
                  activePanel.supply === 'tri' && activePanel.circuits.every((circuit) => circuit.phase === '3Φ')
                    ? 'ΔVsec = √3 × ρ × L × Ib / s'
                    : 'ΔVsec = 2 × ρ × L × Ib / s'
                }
                substitution={`${activePanel.supply === 'tri' && activePanel.circuits.every((circuit) => circuit.phase === '3Φ') ? '1,732' : '2'} × 0,018 × ${activePanel.feederLengthM ?? 15} × ${formatNumber(calculations.mainCurrent, 2)} / ${activePanel.feederConductor ?? 6}`}
                result={`${formatNumber(calculations.feederDrop.volts, 2)} V · ${formatNumber(calculations.feederDrop.percent, 2)} %`}
                note={`Chequeo: Ib ${formatNumber(calculations.mainCurrent, 2)} A ≤ In ${activePanel.feederBreaker ?? 32} A ≤ Iz ${CONDUCTOR_CAPACITY[activePanel.feederConductor ?? 6] ?? 0} A · criterio recomendado ΔVsec ≤ 1 %`}
              />
            )}
            <FormulaCard
              title="Reserva del tablero"
              formula="Mrec = ⌈Mocup × (1 + r/100)⌉"
              substitution={`⌈${calculations.occupiedModules} × (1 + ${activePanel.reservePercent}/100)⌉`}
              result={`${calculations.recommendedModules} módulos`}
              note={`Gabinete adoptado: ${calculations.rows} × ${activePanel.modulesPerRow} = ${calculations.cabinetModules} módulos`}
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
                    const totalDropVolts =
                      drop.volts +
                      (activePanel.type === 'TS' ? calculations.feederDrop.volts : 0);
                    const totalDropPercent =
                      drop.percent +
                      (activePanel.type === 'TS' ? calculations.feederDrop.percent : 0);
                    const capacity = CONDUCTOR_CAPACITY[circuit.conductor] ?? 0;
                    const protectionOkay =
                      current <= circuit.breaker && circuit.breaker <= capacity;
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
                        </td>
                        <td className="px-3 py-3">
                          <code className="block rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            {threePhase ? 'Ib = S / (√3 × 380)' : 'Ib = S / 220'}
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
                            Ib ≤ In ≤ Iz
                          </code>
                          <span className="mt-1 block font-mono text-[9px] text-muted-foreground">
                            {formatNumber(current, 2)} ≤ {circuit.breaker} ≤ {capacity} A
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <code className="block rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            {threePhase
                              ? 'ΔV = √3 × ρ × L × Ib / s'
                              : 'ΔV = 2 × ρ × L × Ib / s'}
                          </code>
                          <span className="mt-1 block font-mono text-[9px] text-muted-foreground">
                            {threePhase ? '1,732' : '2'} × 0,018 × {circuit.lengthM} ×{' '}
                            {formatNumber(current, 2)} / {circuit.conductor}
                          </span>
                        </td>
                        <td
                          className={`px-3 py-3 font-mono font-bold ${
                            totalDropPercent > (circuit.kind === 'FM' ? 5 : 3)
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {formatNumber(totalDropVolts, 2)} V · {formatNumber(totalDropPercent, 2)} %
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

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
              <h2 className="mt-1 text-lg font-semibold">Tres arquitecturas comparables</h2>
              <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
                Valores minoristas de referencia en ARS. Incluyen previsión para accesorios y armado.
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
                  <span key={item.id} className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-[10px] text-emerald-950">
                    {item.name}: <strong>{formatMoney(item.total)}</strong>
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-emerald-900/70">
                Suma gabinetes y dispositivos de todos los tableros. No incluye metros de cable, canalizaciones ni obra civil.
              </p>
            </div>
            <div className="rounded-lg bg-emerald-800 px-4 py-3 text-right text-white">
              <p className="text-[9px] uppercase tracking-wide text-emerald-100">Total estimado</p>
              <p className="font-mono text-xl font-black">{formatMoney(projectCostSummary.total)}</p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {costOptions.map((option) => (
              <CostOptionCard
                key={option.id}
                option={option}
                selected={activePanel.architecture === option.id}
                recommended={option.id === recommendedCost.id}
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
                  <h3 className="mt-1 font-semibold">Mayores impulsores de costo</h3>
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
                  <h3 className="font-semibold">Ajustá con tus cotizaciones locales</h3>
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
                  label="Gabinete 36 M"
                  value={prices.cabinet36}
                  onChange={(value) =>
                    setPrices((current) => ({ ...current, cabinet36: value }))
                  }
                />
                <PriceInput
                  label="Recargo diferencial Tipo A"
                  value={prices.typeAPremium}
                  suffix="%"
                  onChange={(value) =>
                    setPrices((current) => ({ ...current, typeAPremium: value }))
                  }
                />
                <PriceInput
                  label="Accesorios"
                  value={prices.accessoriesPercent}
                  suffix="%"
                  onChange={(value) =>
                    setPrices((current) => ({ ...current, accessoriesPercent: value }))
                  }
                />
                <PriceInput
                  label="Armado + contingencia"
                  value={prices.assemblyPercent}
                  suffix="%"
                  onChange={(value) =>
                    setPrices((current) => ({ ...current, assemblyPercent: value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <ExternalLink className="size-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold">Fuentes de precios y comparaciones</h3>
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
            <h2 className="text-sm font-semibold">Marco de cálculo y límites</h2>
            <p className="mt-1 text-xs leading-relaxed text-sky-900/80">
              Herramienta de predimensionado basada en AEA 90364 (Partes 0–3 y 6 vigentes, Secciones
              771 y 718), criterios de tableros IEC 61439 y Ordenanza General 72/83 de Mendoza. No
              reemplaza proyecto, memoria, firma, ensayos ni visación municipal.
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
      />
    </main>
  );
}

function ProjectPrintSummary({
  projectName,
  panels,
  calculations,
}: {
  projectName: string;
  panels: Panel[];
  calculations: Map<string, PanelCalculation>;
}) {
  return (
    <section className="print-sheet hidden p-0 print:block">
      {panels.map((panel) => {
        const calculation = calculations.get(panel.id);
        const children = panels.filter(
          (child) => child.type === 'TS' && child.parentId === panel.id,
        );
        return (
          <article key={panel.id} className="break-after-page border-2 border-slate-900 p-4 last:break-after-auto">
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em]">Planilla multi-tablero</p>
                <h1 className="text-xl font-bold">{projectName}</h1>
                <h2 className="mt-1 text-base font-semibold">{panel.name} · {panel.type}</h2>
              </div>
              <div className="text-right text-[10px]">
                <p>San Rafael · Mendoza</p>
                <p>{panel.supply === 'tri' ? '380/220 V trifásico' : '220 V monofásico'}</p>
              </div>
            </div>

            <div className="my-3 grid grid-cols-5 gap-2 text-[10px]">
              <div className="border p-2"><strong>Instalada</strong><br />{formatPower(calculation?.installedVA ?? 0)}</div>
              <div className="border p-2"><strong>Demanda</strong><br />{formatPower(calculation?.demandVA ?? 0)}</div>
              <div className="border p-2"><strong>Ib</strong><br />{formatNumber(calculation?.mainCurrent ?? 0, 1)} A</div>
              <div className="border p-2"><strong>Cabecera</strong><br />{calculation?.mainBreaker ?? 0} A</div>
              <div className="border p-2"><strong>Gabinete</strong><br />{calculation?.rows ?? 1} × {panel.modulesPerRow} M</div>
            </div>

            {panel.type === 'TS' && (
              <p className="mb-3 border border-sky-700 p-2 text-[10px]">
                <strong>Alimentador desde TP:</strong> TM {panel.feederBreaker ?? 32} A · {panel.feederConductor ?? 6} mm² · {panel.feederLengthM ?? 15} m · {panel.feederPhase ?? (panel.supply === 'tri' ? '3Φ' : 'L1')} · ΔV {formatNumber(calculation?.feederDrop.percent ?? 0, 2)} %
              </p>
            )}

            {children.length > 0 && (
              <div className="mb-3">
                <h3 className="mb-1 text-xs font-bold">Alimentadores a tableros seccionales</h3>
                <table className="w-full border-collapse text-[9px]">
                  <thead><tr><th className="border p-1">Destino</th><th className="border p-1">TM</th><th className="border p-1">Cable</th><th className="border p-1">Fase</th><th className="border p-1">ΔV</th></tr></thead>
                  <tbody>
                    {children.map((child) => (
                      <tr key={child.id}>
                        <td className="border p-1">{child.name}</td>
                        <td className="border p-1">{child.feederBreaker ?? 32} A</td>
                        <td className="border p-1">{child.feederConductor ?? 6} mm² · {child.feederLengthM ?? 15} m</td>
                        <td className="border p-1">{child.feederPhase ?? (child.supply === 'tri' ? '3Φ' : 'L1')}</td>
                        <td className="border p-1">{formatNumber(calculations.get(child.id)?.feederDrop.percent ?? 0, 2)} %</td>
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
                  <th className="border p-1">ID</th><th className="border p-1">Uso</th><th className="border p-1">Tipo</th><th className="border p-1">Carga</th><th className="border p-1">Fase</th><th className="border p-1">TM</th><th className="border p-1">Cable</th><th className="border p-1">Long.</th><th className="border p-1">ΔV</th>
                </tr>
              </thead>
              <tbody>
                {panel.circuits.map((circuit, index) => (
                  <tr key={circuit.id}>
                    <td className="border p-1">C{index + 1}</td><td className="border p-1">{circuit.name}</td><td className="border p-1">{circuit.kind}</td><td className="border p-1">{formatPower(circuitPower(circuit))}</td><td className="border p-1">{circuit.phase}</td><td className="border p-1">{circuit.breaker} A</td><td className="border p-1">{circuit.conductor} mm²</td><td className="border p-1">{circuit.lengthM} m</td><td className="border p-1">{formatNumber(voltageDrop(circuit, panel.supply).percent + (panel.type === 'TS' ? calculation?.feederDrop.percent ?? 0 : 0), 2)} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[8px]">Predimensionado preliminar: verificar instalación, selectividad, cortocircuito, puesta a tierra, canalizaciones y documentación profesional.</p>
          </article>
        );
      })}
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
            Distribución Física y Funcional: Tablero Principal (TP) vs Tableros Seccionales (TS)
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
              <Badge className="bg-amber-400 text-slate-950 font-bold">1. Acometida y TP</Badge>
              <span className="text-[10px] text-slate-400">Ubicación según distribuidora y proyecto</span>
            </div>
            <h3 className="mt-2.5 text-sm font-semibold text-white">Tablero Principal (TP)</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Ubicado en nicho exterior o línea municipal. Su función es brindar corte general y proteger la línea seccional (alimentador).
            </p>
            <div className="mt-3.5 space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-amber-400">•</span>
                <span><strong>IGA Cabecera:</strong> Térmica de corte general (curva C, In ≥ 1,15 × Ib).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-violet-400">•</span>
                <span><strong>DPS (Transitorias):</strong> Configurable según evaluación y esquema adoptado.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-sky-400">•</span>
                <span><strong>Térmica Alimentador:</strong> Protección visible y dedicada del cable hacia el TS1.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-emerald-400">•</span>
                <span><strong>Puesta a Tierra:</strong> Jabalina principal con RA ≤ 10 Ω (Ord. 72/83).</span>
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/5 p-2 text-[11px] text-amber-200/90">
            🛡️ <em>Envolvente:</em> Gabinete estanco (mínimo IP54) con doble aislamiento (Clase II) si está en intemperie.
          </div>
        </div>

        {/* Step 2: Línea Seccional */}
        <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-4">
          <div>
            <div className="flex items-center justify-between">
              <Badge className="bg-sky-500 text-white font-bold">2. Línea Seccional</Badge>
              <span className="text-[10px] text-slate-400">Tramo alimentador</span>
            </div>
            <h3 className="mt-2.5 text-sm font-semibold text-white">Alimentador entre TP y TS1</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Conductor de sección reforzada (mínimo 4, 6 o 10 mm²) canalizado de forma protegida contra daños mecánicos.
            </p>
            <div className="mt-3.5 space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-sky-400">•</span>
                <span><strong>Caída Acumulada:</strong> Se recomienda hasta 1 % en la línea seccional y 3 % total para cargas sin motor.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-sky-400">•</span>
                <span><strong>Conductores:</strong> Subterráneo (IRAM 2178) o unipolar bajo cañería (IRAM NM 247-3).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-sky-400">•</span>
                <span><strong>Conductor PE:</strong> El conductor de protección debe acompañar por el mismo conducto.</span>
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-sky-400/20 bg-sky-400/10 p-2 text-[11px] text-sky-200">
            ⚡ <em>Selectividad:</em> Los alimentadores a TS se representan antes de los ID de 30 mA que protegen circuitos propios del TP. Cualquier diferencial general debe justificarse y coordinarse.
          </div>
        </div>

        {/* Step 3: Tablero Seccional */}
        <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-4">
          <div>
            <div className="flex items-center justify-between">
              <Badge className="bg-emerald-500 text-white font-bold">3. Tablero Seccional</Badge>
              <span className="text-[10px] text-slate-400">Interior local</span>
            </div>
            <h3 className="mt-2.5 text-sm font-semibold text-white">Tablero Seccional (TS1)</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Ubicado en el interior a mano (altura de maniobra 0,90 m a 2,00 m). Distribuye y protege a los usuarios y circuitos finales.
            </p>
            <div className="mt-3.5 space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-emerald-400">•</span>
                <span><strong>Corte Local:</strong> Interruptor de cabecera para desenergizar el tablero en el lugar.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-emerald-400">•</span>
                <span><strong>Diferenciales 30 mA:</strong> Separar iluminación de tomas de uso general.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-emerald-400">•</span>
                <span><strong>Emergencia (AEA 718):</strong> Circuito EMG independiente que no comparta ID con tomas.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-emerald-400">•</span>
                <span><strong>Reserva DIN:</strong> Mínimo 20 % a 25 % de módulos libres para ampliación.</span>
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-2 text-[11px] text-emerald-200">
            🔒 <em>Pública Concurrencia:</em> Debe contar con puerta cerrada con llave para evitar acceso de personas no autorizadas.
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
  return (
    <div className="space-y-1.5">
      <Label className={`text-xs ${dark ? 'text-slate-400' : 'text-muted-foreground'}`}>
        {label}
      </Label>
      <div className="relative">
        <Input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
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
  onSelect,
}: {
  option: CostOption;
  selected: boolean;
  recommended: boolean;
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
        <Badge className="absolute right-3 top-3 bg-emerald-700 text-white">
          mejor costo/protección
        </Badge>
      )}
      <div className="flex items-center gap-2">
        <div
          className={`grid size-8 place-items-center rounded-lg ${
            selected ? 'bg-emerald-700 text-white' : 'bg-muted text-muted-foreground'
          }`}
        >
          <ShieldCheck className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{option.title}</h3>
          <p className="text-[10px] text-muted-foreground">{option.subtitle}</p>
        </div>
      </div>
      <p className="mt-4 font-mono text-2xl font-black tracking-tight">
        {formatMoney(option.total)}
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Materiales: {formatMoney(option.material)} · {option.cabinetLabel} · {option.modules} M
        requeridos
      </p>
      <Separator className="my-3" />
      <div className="space-y-2 text-[11px] leading-relaxed">
        <p>
          <strong>Protección:</strong> {option.protection}
        </p>
        <p>
          <strong>Continuidad:</strong> {option.continuity}
        </p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${option.score}%` }}
          />
        </div>
        <span className="font-mono text-[10px] font-bold">{option.score}/100</span>
      </div>
      <Button
        variant={selected ? 'default' : 'outline'}
        size="sm"
        className={`mt-4 w-full ${selected ? 'bg-emerald-700 hover:bg-emerald-800' : ''}`}
        onClick={onSelect}
      >
        {selected ? 'Propuesta aplicada' : 'Usar propuesta'}{' '}
        {!selected && <ArrowRight data-icon="inline-end" />}
      </Button>
    </article>
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
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className={
            suffix === '$'
              ? 'pl-7 font-mono text-xs'
              : 'pr-8 font-mono text-xs'
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
        emphasis ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : 'bg-card'
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
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Input
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
          : 'Interruptor de corte local',
      description:
        panelType === 'TP'
          ? 'Corte general y protección principal contra sobrecargas y cortocircuitos.'
          : 'Permite desenergizar el tablero seccional en el lugar; su alimentador se protege desde el TP.',
      swatch: 'bg-slate-800',
    },
    ...(hasDps
      ? [
          {
            code: 'DPS',
            title: 'Dispositivo de Protección contra Sobretensiones',
            description: 'Limita sobretensiones transitorias y las deriva hacia tierra.',
            swatch: 'bg-violet-600',
          },
        ]
      : []),
    ...(hasFeeders
      ? [
          {
            code: 'Alim.',
            title: 'Térmica de Alimentador a Tablero Seccional (TS)',
            description: 'Protege la línea seccional que sale desde el TP hacia un tablero seccional interior.',
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
      description: 'Cada C protege una salida final. El verde identifica iluminación de emergencia.',
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
      <span className="w-20 text-right font-mono text-xs">{formatPower(value)}</span>
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
  const slots: Array<{
    device?: (typeof devices)[number];
    start?: boolean;
    continuation?: boolean;
  }> = Array.from({ length: rows * modulesPerRow }, () => ({}));
  let cursor = 0;
  devices.forEach((device) => {
    if (cursor >= slots.length) return;
    const remainingOnRow = modulesPerRow - (cursor % modulesPerRow);
    if (device.span > remainingOnRow) cursor += remainingOnRow;
    if (cursor >= slots.length) return;
    for (let index = 0; index < device.span && cursor + index < slots.length; index += 1) {
      slots[cursor + index] = {
        device,
        start: index === 0,
        continuation: index > 0,
      };
    }
    cursor += device.span;
  });

  return (
    <div className="panel-shell rounded-2xl border-[10px] border-slate-800 bg-slate-200 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,.65),0_10px_28px_rgba(15,23,42,.16)]">
      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white/70 px-3 py-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Distribución modular
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-800">
            {panelType === 'TP'
              ? `IGA${hasDps ? ' → DPS' : ''}${hasFeeders ? ' → alimentadores TS' : ''} · ID → circuitos propios`
              : `Corte local${hasDps ? ' → DPS' : ''} → ID → circuitos terminales`}
          </p>
        </div>
        <span className="rounded-md bg-slate-800 px-2 py-1 font-mono text-[9px] font-bold text-white">
          1 módulo = 18 mm
        </span>
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
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
                            Protección
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
  onHoverCircuit?: (circuitId: number | undefined) => void;
}) {
  const { circuits, supply, architecture } = panel;
  const protectionLabel =
    architecture === 'essential'
      ? 'ID general'
      : architecture === 'balanced'
        ? 'ID A / ID B'
        : 'ID dedicado';

  const totalBranchesCount = circuits.length + childPanels.length;

  return (
    <div className="unifilar overflow-x-auto rounded-xl border bg-[#f8fafc] p-5">
      <div className="mx-auto min-w-[760px] max-w-6xl">
        <div className="flex items-stretch">
          <DiagramNode
            kicker={panel.type === 'TP' ? 'Alimentación' : 'Desde TP'}
            title={supply === 'tri' ? '3 × 380/220 V' : '1 × 220 V'}
            detail={
              panel.type === 'TP'
                ? `${panel.name} · TT`
                : `${panel.feederBreaker ?? 32} A · ${panel.feederConductor ?? 6} mm² · ${panel.feederPhase ?? (supply === 'tri' ? '3Φ' : 'L1')}`
            }
            tone="dark"
          />
          <DiagramWire />
          <DiagramNode
            kicker="Cabecera"
            title={`${panel.type === 'TP' ? 'IGA' : 'Corte local'} ${calculation.mainBreaker} A`}
            detail={supply === 'tri' ? '4P · Curva C' : '2P · Curva C'}
          />
          {panelHasDps(panel) && (
            <>
              <DiagramWire />
              <DiagramNode
                kicker="Sobretensiones"
                title="DPS"
                detail={supply === 'tri' ? '3P+N · Tipo 2' : '1P+N · Tipo 2'}
                tone="blue"
              />
            </>
          )}
          <DiagramWire />
          <DiagramNode
            kicker="Barras DIN"
            title={supply === 'tri' ? 'L1 · L2 · L3 · N · PE' : 'L · N · PE'}
            detail={`Derivaciones · ${protectionLabel}`}
            tone="amber"
          />
        </div>
        <div className="ml-auto mr-[75px] h-7 w-[2px] bg-slate-700" />
        <div
          className="grid gap-x-2 gap-y-4"
          style={{
            gridTemplateColumns: `repeat(${Math.min(Math.max(totalBranchesCount, 1), 6)}, minmax(110px, 1fr))`,
          }}
        >
          {/* Child TS feeder branches in TP */}
          {childPanels.map((child, idx) => (
            <div key={`feeder-branch-${child.id}`} className="relative pt-7">
              <span className="absolute left-1/2 top-0 h-7 w-[2px] -translate-x-1/2 bg-sky-600" />
              <span className="absolute left-0 right-0 top-0 h-[2px] bg-slate-700 first:left-1/2 last:right-1/2" />
              <div className="rounded-lg border-2 border-sky-400 bg-sky-50 p-2.5 shadow-sm text-sky-950">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="rounded bg-sky-700 px-1 py-0.5 font-mono text-[9px] font-bold text-white">
                    Alim. TS{idx + 1}
                  </span>
                  <span className="size-2 rounded-full bg-sky-500" />
                </div>
                <p className="truncate text-xs font-bold text-sky-900" title={child.name}>
                  → {child.name}
                </p>
                <Separator className="my-2 bg-sky-200" />
                <div className="grid grid-cols-2 gap-1 font-mono text-[9px] text-sky-800">
                  <span>{child.feederBreaker ?? 32} A</span>
                  <span>{child.feederConductor ?? 6} mm²</span>
                  <span>{child.supply === 'tri' ? '4P · 3Φ' : `2P · ${child.feederPhase ?? 'L1'}`}</span>
                  <span>{child.feederLengthM ?? 15} m</span>
                </div>
              </div>
            </div>
          ))}

          {/* Terminal circuits */}
          {circuits.map((circuit, index) => {
            const isHighlighted = highlightedCircuitId === circuit.id;

            return (
              <div
                key={circuit.id}
                onMouseEnter={() => onHoverCircuit?.(circuit.id)}
                onMouseLeave={() => onHoverCircuit?.(undefined)}
                className="relative pt-7 cursor-pointer"
              >
                <span className="absolute left-1/2 top-0 h-7 w-[2px] -translate-x-1/2 bg-slate-700" />
                <span className="absolute left-0 right-0 top-0 h-[2px] bg-slate-700 first:left-1/2 last:right-1/2" />
                <div
                  className={`rounded-lg border-2 bg-white p-2.5 shadow-sm transition-all ${
                    isHighlighted
                      ? 'border-amber-500 ring-2 ring-amber-400 scale-[1.05] shadow-md'
                      : circuit.kind === 'EMG'
                        ? 'border-emerald-400'
                        : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-black">
                      C{index + 1}
                    </span>
                    <span className={`size-2 rounded-full ${phaseColor(circuit.phase)}`} />
                  </div>
                  <p className="truncate text-xs font-semibold" title={circuit.name}>
                    {circuit.name}
                  </p>
                  <Separator className="my-2" />
                  <div className="grid grid-cols-2 gap-1 font-mono text-[9px] text-slate-600">
                    <span>
                      {architecture === 'essential'
                        ? 'ID'
                        : architecture === 'balanced'
                          ? circuit.kind === 'EMG' || index % 2 === 1
                            ? 'ID B'
                            : 'ID A'
                          : 'ID propio'}
                    </span>
                    <span>{circuit.breaker} A</span>
                    <span>{circuit.conductor} mm²</span>
                    <span>{circuit.phase} · {formatPower(circuitPower(circuit))}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MultiLineDiagram({
  panel,
  childPanels,
  calculations,
}: {
  panel: Panel;
  childPanels: Panel[];
  calculations: Map<string, PanelCalculation>;
}) {
  const { circuits, supply } = panel;
  return (
    <div className="overflow-x-auto rounded-xl border bg-[#f8fafc]">
      <table className="w-full min-w-[860px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b-2 border-slate-800 bg-slate-100 text-[10px] uppercase tracking-[0.08em] text-slate-600">
            <th className="px-3 py-2.5">Salida</th>
            <th className="px-3 py-2.5">Protección</th>
            <th className="px-3 py-2.5">Conductores activos</th>
            <th className="px-3 py-2.5">Neutro</th>
            <th className="px-3 py-2.5">Protección PE</th>
            <th className="px-3 py-2.5">Carga / recorrido</th>
          </tr>
        </thead>
        <tbody>
          {childPanels.map((child, index) => {
            const childCalculation = calculations.get(child.id);
            const threePhase = child.supply === 'tri';
            return (
              <tr key={`feeder-${child.id}`} className="border-b bg-sky-50/60">
                <td
                  className="px-3 py-3"
                  aria-label={`Alimentador A${index + 1}: ${child.name}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded bg-sky-700 font-mono text-[9px] font-bold text-white">
                      A{index + 1}
                    </span>
                    <div>
                      <p className="font-semibold">Alimentador a {child.name}</p>
                      <p className="text-[9px] text-sky-700">Circuito seccional</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 font-mono">
                  TM {child.feederBreaker ?? 32} A · {threePhase ? '4P' : '2P'}
                  <br />
                  <span className="text-[9px] text-slate-500">Protección ubicada en el TP</span>
                </td>
                <td className="px-3 py-3">
                  <ConductorLines
                    count={threePhase ? 3 : 1}
                    color="bg-amber-500"
                    label={
                      threePhase
                        ? `L1+L2+L3 · ${child.feederConductor ?? 6} mm²`
                        : `${child.feederPhase ?? 'L1'} · ${child.feederConductor ?? 6} mm²`
                    }
                  />
                </td>
                <td className="px-3 py-3">
                  <ConductorLines
                    count={1}
                    color="bg-sky-500"
                    label={`N · ${child.feederConductor ?? 6} mm²`}
                  />
                </td>
                <td className="px-3 py-3">
                  <ConductorLines
                    count={1}
                    color="bg-emerald-500"
                    label={`PE · ${child.feederConductor ?? 6} mm²*`}
                  />
                </td>
                <td className="px-3 py-3 font-mono">
                  {formatPower(childCalculation?.demandVA ?? 0)} · {child.feederLengthM ?? 15} m
                  <br />
                  <span className={(childCalculation?.feederDrop.percent ?? 0) > 1 ? 'text-amber-700' : 'text-emerald-700'}>
                    ΔV seccional {(childCalculation?.feederDrop.percent ?? 0).toFixed(2)} %
                  </span>
                </td>
              </tr>
            );
          })}
          {circuits.map((circuit, index) => {
            const threePhase = circuit.phase === '3Φ' && supply === 'tri';
            const circuitDrop = voltageDrop(circuit, supply);
            const totalDropPercent =
              circuitDrop.percent +
              (panel.type === 'TS' ? calculations.get(panel.id)?.feederDrop.percent ?? 0 : 0);
            return (
              <tr key={circuit.id} className="border-b last:border-0">
                <td
                  className="px-3 py-3"
                  aria-label={`Circuito C${index + 1}: ${circuit.name}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded bg-slate-900 font-mono text-[9px] font-bold text-white">
                      C{index + 1}
                    </span>
                    <div>
                      <p className="font-semibold">{circuit.name}</p>
                      <p className="text-[9px] text-slate-500">
                        {circuit.kind} · {circuit.phase}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 font-mono">
                  TM {circuit.breaker} A · {threePhase ? '4P' : '2P'}
                  <br />
                  <span className="text-[9px] text-slate-500">
                    {panel.architecture === 'continuity'
                      ? `ID propio 30 mA tipo ${panelDifferentialType(panel)}`
                      : `ID 30 mA tipo ${panelDifferentialType(panel)} aguas arriba`}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <ConductorLines
                    count={threePhase ? 3 : 1}
                    color="bg-amber-500"
                    label={
                      threePhase
                        ? `L1+L2+L3 · ${circuit.conductor} mm²`
                        : `${circuit.phase} · ${circuit.conductor} mm²`
                    }
                  />
                </td>
                <td className="px-3 py-3">
                  <ConductorLines
                    count={1}
                    color="bg-sky-500"
                    label={`N · ${circuit.conductor} mm²`}
                  />
                </td>
                <td className="px-3 py-3">
                  <ConductorLines
                    count={1}
                    color="bg-emerald-500"
                    label={`PE · ${circuit.conductor} mm²*`}
                  />
                </td>
                <td className="px-3 py-3 font-mono">
                  {formatPower(circuitPower(circuit))} · {circuit.lengthM} m
                  <br />
                  <span
                    className={
                      totalDropPercent > (circuit.kind === 'FM' ? 5 : 3)
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }
                  >
                    ΔV total {totalDropPercent.toFixed(1)} %
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-900">
        * La sección PE mostrada es conservadora e igual a la activa. Verificar su dimensionamiento,
        continuidad, canalización y la sección mínima del conductor entre tablero y electrodo según
        proyecto y reglamentación vigente.
      </p>
    </div>
  );
}

function ConductorLines({
  count,
  color,
  label,
}: {
  count: number;
  color: string;
  label: string;
}) {
  return (
    <div>
      <div className="space-y-1">
        {Array.from({ length: count }).map((_, index) => (
          <span key={index} className={`block h-0.5 w-24 ${color}`} />
        ))}
      </div>
      <p className="mt-1 font-mono text-[9px] text-slate-600">{label}</p>
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

function DiagramWire() {
  return (
    <div className="flex min-w-5 flex-1 items-center">
      <span className="h-[2px] w-full bg-slate-700" />
    </div>
  );
}
