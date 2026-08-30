'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  Calculator,
  CheckCircle2,
  CircuitBoard,
  Copy,
  DollarSign,
  ExternalLink,
  Info,
  LayoutDashboard,
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

type Supply = 'mono' | 'tri';
type Phase = 'L1' | 'L2' | 'L3' | '3Φ';
type CircuitKind = 'IUG' | 'TUG' | 'TUE' | 'EMG' | 'FM';
type Architecture = 'essential' | 'balanced' | 'continuity';
type ExperienceMode = 'guided' | 'technical';
type ProjectPreset = 'hall' | 'commercial' | 'residential' | 'custom';
type WorkType = 'new' | 'remodel' | 'survey';
type EvacuationClass = 'BD1' | 'BD2' | 'BD3' | 'BD4';

type ProjectProfile = {
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

type Circuit = {
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

type CircuitTemplate = Omit<Circuit, 'id' | 'name' | 'phase'> & {
  label: string;
  shortName: string;
};

type PriceCatalog = {
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

type CostLine = { label: string; value: number };
type PanelDevice = {
  key: string;
  label: string;
  fullName: string;
  detail: string;
  span: number;
  className: string;
};
type CostOption = {
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
const STORAGE_KEY = 'tablero-aea-san-rafael:v2';
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
    href: 'https://www.easy.com.ar/interruptor-difer-2x40a-30ma--sica/p',
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

const INITIAL_CIRCUITS: Circuit[] = [
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
) {
  const poleSpan = supply === 'tri' ? 4 : 2;
  const circuitModules = circuits.reduce((total, circuit) => total + circuit.modules, 0);
  if (architecture === 'essential') return poleSpan * 3 + circuitModules;
  if (architecture === 'balanced') return poleSpan * 4 + circuitModules;
  const individualDifferentials = circuits.reduce(
    (total, circuit) => total + (circuit.phase === '3Φ' ? 4 : 2),
    0,
  );
  return poleSpan * 2 + circuitModules + individualDifferentials;
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
  const volts = (threePhase ? Math.sqrt(3) : 2)
    * Math.max(0, circuit.lengthM)
    * current
    * COPPER_RESISTIVITY
    / Math.max(circuit.conductor, 0.1);
  return { volts, percent: (volts / (threePhase ? 380 : 220)) * 100 };
}

function projectCircuits(preset: ProjectPreset): Circuit[] {
  const base = INITIAL_CIRCUITS.map((circuit) => ({ ...circuit }));
  if (preset === 'hall') return base;
  if (preset === 'commercial') {
    return [
      { ...base[0], name: 'Iluminación local', points: 14 },
      { ...base[1], name: 'Tomacorrientes generales', points: 12 },
      { ...base[2], name: 'Luces y carteles de emergencia', points: 6 },
      { ...base[3], name: 'Equipo dedicado', unitVA: 2500, breaker: 20, conductor: 4 },
    ];
  }
  if (preset === 'residential') {
    return [
      { ...base[0], name: 'Iluminación general', points: 10 },
      { ...base[1], name: 'Tomacorrientes generales', points: 10 },
      { ...base[3], id: 3, name: 'Cocina / uso especial', unitVA: 2500, breaker: 20, conductor: 4, phase: 'L1' },
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

export default function Home() {
  const [experienceMode, setExperienceMode] = useState<ExperienceMode>('guided');
  const [profile, setProfile] = useState<ProjectProfile>(INITIAL_PROFILE);
  const [projectName, setProjectName] = useState('SALÓN · 24 × 10 m');
  const [supply, setSupply] = useState<Supply>('tri');
  const [demandFactor, setDemandFactor] = useState(0.8);
  const [reservePercent, setReservePercent] = useState(25);
  const [modulesPerRow, setModulesPerRow] = useState(18);
  const [circuits, setCircuits] = useState<Circuit[]>(INITIAL_CIRCUITS);
  const [architecture, setArchitecture] = useState<Architecture>('balanced');
  const [prices, setPrices] = useState<PriceCatalog>(DEFAULT_PRICES);
  const [optimizationMessage, setOptimizationMessage] = useState('');
  const [persistenceReady, setPersistenceReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const data = stored ? JSON.parse(stored) as Partial<{
          experienceMode: ExperienceMode;
          profile: ProjectProfile;
          projectName: string;
          supply: Supply;
          demandFactor: number;
          reservePercent: number;
          modulesPerRow: number;
          circuits: Circuit[];
          architecture: Architecture;
          prices: PriceCatalog;
        }> : {};
      queueMicrotask(() => {
        if (data.experienceMode) setExperienceMode(data.experienceMode);
        if (data.profile) {
          const legacyPreset = (data.profile.preset as string) === 'church' ? 'hall' : data.profile.preset;
          setProfile({ ...INITIAL_PROFILE, ...data.profile, preset: legacyPreset as ProjectPreset });
        }
        if (data.projectName) {
          setProjectName(data.projectName
            .replace(/Iglesia\s*·\s*Salón/gi, 'SALÓN')
            .replace(/Iglesia/gi, 'SALÓN'));
        }
        if (data.supply) setSupply(data.supply);
        if (typeof data.demandFactor === 'number') setDemandFactor(data.demandFactor);
        if (typeof data.reservePercent === 'number') setReservePercent(data.reservePercent);
        if (typeof data.modulesPerRow === 'number') setModulesPerRow(data.modulesPerRow);
        if (Array.isArray(data.circuits)) setCircuits(data.circuits.map((circuit) => ({
          ...circuit,
          name: circuit.name === 'Iluminación nave principal' ? 'Iluminación salón principal' : circuit.name,
          lengthM: circuit.lengthM ?? 20,
        })));
        if (data.architecture) setArchitecture(data.architecture);
        if (data.prices) setPrices({ ...DEFAULT_PRICES, ...data.prices });
        setPersistenceReady(true);
      });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      queueMicrotask(() => setPersistenceReady(true));
    }
  }, []);

  useEffect(() => {
    if (!persistenceReady) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      experienceMode,
      profile,
      projectName,
      supply,
      demandFactor,
      reservePercent,
      modulesPerRow,
      circuits,
      architecture,
      prices,
    }));
  }, [architecture, circuits, demandFactor, experienceMode, modulesPerRow, persistenceReady, prices, profile, projectName, reservePercent, supply]);

  const calculations = useMemo(() => {
    const installedVA = circuits.reduce((total, circuit) => total + circuitPower(circuit), 0);
    const demandVA = installedVA * demandFactor;
    const phaseVA = { L1: 0, L2: 0, L3: 0 };

    circuits.forEach((circuit) => {
      const power = circuitPower(circuit);
      if (circuit.phase === '3Φ') {
        phaseVA.L1 += power / 3;
        phaseVA.L2 += power / 3;
        phaseVA.L3 += power / 3;
      } else {
        phaseVA[circuit.phase] += power;
      }
    });

    const phaseCurrent = {
      L1: (phaseVA.L1 * demandFactor) / 220,
      L2: (phaseVA.L2 * demandFactor) / 220,
      L3: (phaseVA.L3 * demandFactor) / 220,
    };
    const mainCurrent = supply === 'tri'
      ? Math.max(phaseCurrent.L1, phaseCurrent.L2, phaseCurrent.L3)
      : demandVA / 220;
    const mainBreaker = nextBreaker(mainCurrent * 1.15);
    const baseModules = supply === 'tri' ? 12 : 6;
    const occupiedModules = architectureOccupiedModules(architecture, supply, circuits);
    const recommendedModules = Math.ceil(occupiedModules * (1 + reservePercent / 100));
    const rows = Math.max(1, Math.ceil(recommendedModules / modulesPerRow));
    const cabinetModules = rows * modulesPerRow;

    const phaseValues = Object.values(phaseVA);
    const averagePhase = phaseValues.reduce((sum, value) => sum + value, 0) / 3;
    const imbalance =
      supply === 'tri' && averagePhase > 0
        ? Math.max(...phaseValues.map((value) => Math.abs(value - averagePhase))) / averagePhase
        : 0;

    return {
      installedVA,
      demandVA,
      mainCurrent,
      mainBreaker,
      baseModules,
      occupiedModules,
      recommendedModules,
      rows,
      cabinetModules,
      phaseVA,
      phaseCurrent,
      imbalance,
      widthMm: modulesPerRow * 18 + 80,
      heightMm: rows * 150 + 80,
    };
  }, [architecture, circuits, demandFactor, modulesPerRow, reservePercent, supply]);

  const isPublicVenue = profile.preset === 'hall'
    || profile.occupancy >= 50
    || profile.evacuation !== 'BD1';
  const projectArea = Math.max(0, profile.widthM) * Math.max(0, profile.lengthM);
  const areaPerPerson = profile.occupancy > 0 ? projectArea / profile.occupancy : 0;

  const warnings = useMemo(() => {
    const messages: string[] = [];
    circuits.forEach((circuit, index) => {
      const circuitNumber = index + 1;
      if ((circuit.kind === 'IUG' || circuit.kind === 'TUG') && circuit.points > 15) {
        messages.push(`C${circuitNumber}: supera el criterio conservador de 15 bocas.`);
      }
      if (circuitCurrent(circuit, supply) > circuit.breaker) {
        messages.push(`C${circuitNumber}: la corriente estimada supera la protección seleccionada.`);
      }
      const cableCapacity = CONDUCTOR_CAPACITY[circuit.conductor];
      if (cableCapacity && circuit.breaker > cableCapacity) {
        messages.push(`C${circuitNumber}: revisar relación entre sección y protección.`);
      }
      if (voltageDrop(circuit, supply).percent > 3) {
        messages.push(`C${circuitNumber}: caída estimada ${voltageDrop(circuit, supply).percent.toFixed(1)} %, revisar sección o recorrido.`);
      }
    });
    if (calculations.imbalance > 0.2) {
      messages.push('El desbalance de fases estimado supera el 20 %.');
    }
    if (profile.breakingCapacityKa < profile.prospectiveShortCircuitKa) {
      messages.push('El poder de corte declarado es menor que la corriente de cortocircuito presunta.');
    }
    if (profile.groundResistanceOhm > 10) {
      messages.push('La resistencia de puesta a tierra supera 10 Ω, máximo indicado por la Ordenanza 72/83.');
    }
    if (isPublicVenue && !circuits.some((circuit) => circuit.kind === 'EMG')) {
      messages.push('El local de pública concurrencia no tiene circuito de iluminación de emergencia.');
    }
    if (isPublicVenue && architecture === 'essential') {
      messages.push('Para pública concurrencia, separar usos normales y servicios de emergencia; evitar un único diferencial común.');
    }
    return messages;
  }, [architecture, calculations.imbalance, circuits, isPublicVenue, profile.breakingCapacityKa, profile.groundResistanceOhm, profile.prospectiveShortCircuitKa, supply]);

  const complianceItems = useMemo(() => [
    { group: 'Ordenanza 72/83', label: 'Memoria descriptiva y especificaciones', ready: profile.descriptiveMemoryReady, action: 'Completar para el expediente' },
    { group: 'Ordenanza 72/83', label: `Plano ${profile.planScale} con medidor, tableros, bocas y canalizaciones`, ready: profile.planScale === '1:50' || (profile.planScale === '1:100' && projectArea >= 200), action: '1:100 sólo para salón amplio; validar densidad y legibilidad' },
    { group: 'Ordenanza 72/83', label: 'Cuadro de cargas, protecciones y secciones', ready: circuits.length > 0 && circuits.every((circuit) => circuit.breaker > 0 && circuit.conductor > 0), action: 'Completar todos los circuitos' },
    { group: 'Ordenanza 72/83', label: 'Esquema multifilar del tablero', ready: circuits.length > 0, action: 'Generado abajo; completar canalizaciones en plano' },
    { group: 'Ordenanza 72/83', label: 'Profesional matriculado y dirección técnica', ready: profile.registeredProfessionalReady, action: 'Requiere firma y visación' },
    { group: 'AEA actual', label: 'Poder de corte ≥ cortocircuito presunto', ready: profile.breakingCapacityKa >= profile.prospectiveShortCircuitKa, action: 'Medir/calcular Ik en el origen' },
    { group: 'AEA actual', label: 'Caída de tensión preliminar ≤ 3 % por circuito', ready: circuits.every((circuit) => voltageDrop(circuit, supply).percent <= 3), action: 'Verificar recorrido, montaje y caída total' },
    { group: 'AEA 718', label: 'Circuito de emergencia separado para pública concurrencia', ready: !isPublicVenue || (architecture !== 'essential' && circuits.some((circuit) => circuit.kind === 'EMG')), action: 'Separar normal/emergencia y comprobar autonomía' },
    { group: 'AEA 90364-6', label: 'Ensayos, mediciones y protocolo de verificación', ready: profile.siteTestReady, action: 'Completar al ejecutar la instalación' },
  ], [architecture, circuits, isPublicVenue, profile, projectArea, supply]);

  const costOptions = useMemo<CostOption[]>(() => {
    const mainCost = supply === 'tri' ? prices.mcb4P : prices.mcb2P;
    const spdCost = supply === 'tri' ? prices.spd4P : prices.spd2P;
    const sharedRcdCost = supply === 'tri' ? prices.rcd4P : prices.rcd2P;
    const branchMcbCost = circuits.reduce(
      (total, circuit) => total + (circuit.phase === '3Φ' ? prices.mcb4P : prices.mcb2P),
      0,
    );
    const individualRcdCost = circuits.reduce(
      (total, circuit) => total + (circuit.phase === '3Φ' ? prices.rcd4P : prices.rcd2P),
      0,
    );
    const typeAFactor = 1 + prices.typeAPremium / 100;

    const buildOption = (
      id: Architecture,
      title: string,
      subtitle: string,
      rcdCost: number,
      continuity: string,
      protection: string,
      score: number,
    ): CostOption => {
      const occupied = architectureOccupiedModules(id, supply, circuits);
      const modules = Math.ceil(occupied * (1 + reservePercent / 100));
      const cabinet = cabinetFor(modules, prices);
      const core: CostLine[] = [
        { label: 'IGA', value: mainCost },
        { label: 'DPS', value: spdCost },
        { label: 'Térmicas de circuitos', value: branchMcbCost },
        { label: 'Protección diferencial', value: rcdCost },
        { label: `Gabinete ${cabinet.label}`, value: cabinet.value },
      ];
      const coreTotal = core.reduce((total, line) => total + line.value, 0);
      const accessories = coreTotal * (prices.accessoriesPercent / 100);
      const material = coreTotal + accessories;
      const assembly = material * (prices.assemblyPercent / 100);
      const lines = [
        ...core,
        { label: 'Barras, peines, borneras y rotulado', value: accessories },
        { label: 'Armado, pruebas y contingencia', value: assembly },
      ];
      return {
        id,
        title,
        subtitle,
        modules,
        cabinetLabel: cabinet.label,
        material,
        total: material + assembly,
        continuity,
        protection,
        score,
        lines,
      };
    };

    return [
      buildOption(
        'essential',
        'Esencial',
        'Menor costo inicial',
        sharedRcdCost,
        'Baja: una fuga puede apagar todo el tablero',
        '1 diferencial general de 30 mA',
        62,
      ),
      buildOption(
        'balanced',
        'Equilibrada',
        'Compromiso clásico',
        sharedRcdCost * 2 * typeAFactor,
        'Media/alta: emergencia y usos normales separados',
        '2 grupos diferenciales · factor Tipo A cotizable',
        88,
      ),
      buildOption(
        'continuity',
        'Alta continuidad',
        'Mayor selectividad funcional',
        individualRcdCost * typeAFactor,
        'Alta: una falla afecta principalmente a su circuito',
        'Diferencial de 30 mA por circuito + térmica',
        94,
      ),
    ];
  }, [circuits, prices, reservePercent, supply]);

  const selectedCost = costOptions.find((option) => option.id === architecture) ?? costOptions[1];
  const recommendedCost = [...costOptions].sort(
    (a, b) => a.total / (a.score ** 2) - b.total / (b.score ** 2),
  )[0];
  const selectedDrivers = [...selectedCost.lines]
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  function updateProfile<K extends keyof ProjectProfile>(key: K, value: ProjectProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function applyPreset(preset: ProjectPreset) {
    const presetData: Record<ProjectPreset, { name: string; supply: Supply; profile: Partial<ProjectProfile> }> = {
      hall: { name: 'SALÓN · 24 × 10 m', supply: 'tri', profile: { widthM: 24, lengthM: 10, occupancy: 180, evacuation: 'BD3' } },
      commercial: { name: 'Local comercial', supply: 'tri', profile: { widthM: 12, lengthM: 8, occupancy: 60, evacuation: 'BD2' } },
      residential: { name: 'Vivienda', supply: 'mono', profile: { widthM: 10, lengthM: 8, occupancy: 5, evacuation: 'BD1' } },
      custom: { name: 'Proyecto personalizado', supply, profile: {} },
    };
    const selected = presetData[preset];
    setProfile((current) => ({ ...current, ...selected.profile, preset }));
    setProjectName(selected.name);
    setSupply(selected.supply);
    setArchitecture(preset === 'residential' ? 'essential' : 'balanced');
    setCircuits(projectCircuits(preset).map((circuit) => ({
      ...circuit,
      phase: selected.supply === 'mono' ? 'L1' : circuit.phase,
      modules: selected.supply === 'mono' ? Math.min(circuit.modules, 2) : circuit.modules,
    })));
    setOptimizationMessage('Plantilla aplicada. Ajustá bocas, recorridos y cargas reales.');
  }

  function updateCircuit<K extends keyof Circuit>(id: number, key: K, value: Circuit[K]) {
    setCircuits((current) =>
      current.map((circuit) => (circuit.id === id ? { ...circuit, [key]: value } : circuit)),
    );
  }

  function addCircuit(kind: CircuitKind) {
    const template = TEMPLATES[kind];
    const id = Math.max(0, ...circuits.map((circuit) => circuit.id)) + 1;
    const phaseSequence: Phase[] = supply === 'tri' ? ['L1', 'L2', 'L3'] : ['L1'];
    const phase = kind === 'FM' && supply === 'tri' ? '3Φ' : phaseSequence[circuits.length % phaseSequence.length];
    setCircuits((current) => [
      ...current,
      {
        id,
        name: `${template.shortName} ${current.length + 1}`,
        kind,
        points: template.points,
        unitVA: template.unitVA,
        phase,
        powerFactor: template.powerFactor,
        breaker: template.breaker,
        conductor: template.conductor,
        lengthM: template.lengthM,
        modules: phase === '3Φ' ? 4 : template.modules,
      },
    ]);
  }

  function duplicateCircuit(circuit: Circuit) {
    const id = Math.max(0, ...circuits.map((item) => item.id)) + 1;
    setCircuits((current) => [...current, { ...circuit, id, name: `${circuit.name} · copia` }]);
  }

  function optimizeProject() {
    let nextId = Math.max(0, ...circuits.map((circuit) => circuit.id)) + 1;
    let splitCount = 0;
    let splitCircuits = circuits.flatMap((circuit) => {
      if ((circuit.kind !== 'IUG' && circuit.kind !== 'TUG') || circuit.points <= 15) {
        return [circuit];
      }
      const count = Math.ceil(circuit.points / 15);
      const basePoints = Math.floor(circuit.points / count);
      const remainder = circuit.points % count;
      splitCount += count - 1;
      return Array.from({ length: count }, (_, index) => ({
        ...circuit,
        id: index === 0 ? circuit.id : nextId++,
        name: `${circuit.name} · ${String.fromCharCode(65 + index)}`,
        points: basePoints + (index < remainder ? 1 : 0),
      }));
    });

    function provisionalImbalance(items: Circuit[]) {
      if (supply !== 'tri') return 0;
      const totals = { L1: 0, L2: 0, L3: 0 };
      items.filter((item) => item.phase === '3Φ').forEach((item) => {
        const share = circuitPower(item) / 3;
        totals.L1 += share;
        totals.L2 += share;
        totals.L3 += share;
      });
      items
        .filter((item) => item.phase !== '3Φ')
        .sort((a, b) => circuitPower(b) - circuitPower(a))
        .forEach((item) => {
          const phase = (Object.keys(totals) as Array<'L1' | 'L2' | 'L3'>)
            .sort((a, b) => totals[a] - totals[b])[0];
          totals[phase] += circuitPower(item);
        });
      const values = Object.values(totals);
      const average = values.reduce((total, value) => total + value, 0) / 3;
      return average > 0
        ? Math.max(...values.map((value) => Math.abs(value - average))) / average
        : 0;
    }

    let balanceSplits = 0;
    while (provisionalImbalance(splitCircuits) > 0.2 && balanceSplits < 3) {
      const candidate = splitCircuits
        .map((circuit, index) => ({ circuit, index }))
        .filter(({ circuit }) => (circuit.kind === 'IUG' || circuit.kind === 'TUG') && circuit.points >= 4)
        .sort((a, b) => circuitPower(b.circuit) - circuitPower(a.circuit))[0];
      if (!candidate) break;
      const firstPoints = Math.ceil(candidate.circuit.points / 2);
      const secondPoints = candidate.circuit.points - firstPoints;
      const first = { ...candidate.circuit, name: `${candidate.circuit.name} · A`, points: firstPoints };
      const second = { ...candidate.circuit, id: nextId++, name: `${candidate.circuit.name} · B`, points: secondPoints };
      splitCircuits = [
        ...splitCircuits.slice(0, candidate.index),
        first,
        second,
        ...splitCircuits.slice(candidate.index + 1),
      ];
      splitCount += 1;
      balanceSplits += 1;
    }

    const protectedCircuits = splitCircuits.map((circuit) => {
      const current = circuitCurrent(circuit, supply);
      const breaker = nextBreaker(current * 1.15);
      const minimumSection = circuit.kind === 'IUG' || circuit.kind === 'EMG'
        ? 1.5
        : circuit.kind === 'TUG'
          ? 2.5
          : circuit.conductor;
      const sections = Object.keys(CONDUCTOR_CAPACITY).map(Number).sort((a, b) => a - b);
      const conductor = Number(sections.find((section) => {
        if (section < minimumSection || CONDUCTOR_CAPACITY[section] < breaker) return false;
        return voltageDrop({ ...circuit, conductor: section }, supply).percent <= 3;
      }) ?? 35);
      return {
        ...circuit,
        breaker,
        conductor,
        modules: circuit.phase === '3Φ' && supply === 'tri' ? 4 : 2,
      };
    });

    const phaseAssignments = new Map<number, Phase>();
    if (supply === 'tri') {
      const totals = { L1: 0, L2: 0, L3: 0 };
      protectedCircuits
        .filter((circuit) => circuit.phase !== '3Φ')
        .sort((a, b) => circuitPower(b) - circuitPower(a))
        .forEach((circuit) => {
          const phase = (Object.keys(totals) as Array<'L1' | 'L2' | 'L3'>)
            .sort((a, b) => totals[a] - totals[b])[0];
          phaseAssignments.set(circuit.id, phase);
          totals[phase] += circuitPower(circuit);
        });
    }

    setCircuits(
      protectedCircuits.map((circuit) => ({
        ...circuit,
        phase: supply === 'mono'
          ? 'L1'
          : circuit.phase === '3Φ'
            ? '3Φ'
            : phaseAssignments.get(circuit.id) ?? 'L1',
      })),
    );
    setReservePercent(25);
    setModulesPerRow(18);
    setOptimizationMessage(
      splitCount
        ? `Se dividieron ${splitCount} circuito(s), se balancearon fases y se ajustaron protecciones.`
        : 'Fases balanceadas, protecciones revisadas y reserva modular ajustada.',
    );
  }

  function resetProject() {
    setExperienceMode('guided');
    setProfile(INITIAL_PROFILE);
    setProjectName('SALÓN · 24 × 10 m');
    setSupply('tri');
    setDemandFactor(0.8);
    setReservePercent(25);
    setModulesPerRow(18);
    setCircuits(INITIAL_CIRCUITS);
    setArchitecture('balanced');
    setPrices(DEFAULT_PRICES);
    setOptimizationMessage('');
    window.localStorage.removeItem(STORAGE_KEY);
  }

  const devices = useMemo(() => {
    const mainDevices: PanelDevice[] = [
      {
        key: 'cabecera',
        label: 'IGA',
        fullName: 'Interruptor General Automático',
        detail: `${calculations.mainBreaker} A`,
        span: supply === 'tri' ? 4 : 2,
        className: 'device-main',
      },
      {
        key: 'spd',
        label: 'DPS',
        fullName: 'Protección contra sobretensiones',
        detail: supply === 'tri' ? '3P+N' : '1P+N',
        span: supply === 'tri' ? 4 : 2,
        className: 'device-spd',
      },
    ];
    if (architecture === 'essential') {
      mainDevices.push({ key: 'diff', label: 'ID', fullName: 'Interruptor Diferencial', detail: 'General · 30 mA', span: supply === 'tri' ? 4 : 2, className: 'device-rcd' });
    }
    if (architecture === 'balanced') {
      mainDevices.push(
        { key: 'diff-a', label: 'ID A', fullName: 'Interruptor Diferencial', detail: 'Uso normal · 30 mA', span: supply === 'tri' ? 4 : 2, className: 'device-rcd' },
        { key: 'diff-b', label: 'ID B', fullName: 'Interruptor Diferencial', detail: 'Uso crítico · 30 mA', span: supply === 'tri' ? 4 : 2, className: 'device-rcd' },
      );
    }
    return [
      ...mainDevices,
      ...circuits.map((circuit, index) => ({
        key: `circuit-${circuit.id}`,
        label: architecture === 'continuity' ? `C${index + 1} + ID` : `C${index + 1}`,
        fullName: circuit.kind === 'EMG' ? 'Térmica · Emergencia' : `Térmica · ${circuit.kind}`,
        detail: architecture === 'continuity' ? `${circuit.breaker} A · 30 mA` : `${circuit.breaker} A`,
        span: circuit.modules + (architecture === 'continuity' ? (circuit.phase === '3Φ' ? 4 : 2) : 0),
        className: circuit.kind === 'EMG' ? 'device-emergency' : 'device-circuit',
      })),
    ];
  }, [architecture, calculations.mainBreaker, circuits, supply]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="print-hide sticky top-0 z-40 border-b border-white/10 bg-slate-950 text-white shadow-lg shadow-slate-950/10">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-400 text-slate-950 shadow-[0_0_24px_rgba(251,191,36,.25)]">
              <CircuitBoard className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">Tablero AEA</h1>
                <Badge className="border border-amber-300/20 bg-amber-300/10 text-amber-200">beta técnica</Badge>
              </div>
              <p className="truncate text-xs text-slate-400">Predimensionado · San Rafael, Mendoza</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="text-slate-300 hover:bg-white/10 hover:text-white" onClick={resetProject}>
              <RotateCcw data-icon="inline-start" />
              <span className="hidden sm:inline">Restablecer</span>
            </Button>
            <Button className="bg-amber-400 text-slate-950 hover:bg-amber-300" onClick={() => window.print()}>
              <Printer data-icon="inline-start" />
              Imprimir plano
            </Button>
          </div>
        </div>
      </header>

      <section className="print-sheet mx-auto flex max-w-[1680px] flex-col px-4 py-5 lg:px-6">
        <div className="mb-4 hidden items-start justify-between border-b-2 border-slate-900 pb-3 print:flex">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em]">Planilla de predimensionado eléctrico</p>
            <h1 className="text-2xl font-bold">{projectName}</h1>
          </div>
          <div className="text-right text-xs">
            <p>San Rafael · Mendoza</p>
            <p>AEA 90364 vigente · 771/718 · Ord. Gral. 72/83</p>
          </div>
        </div>

        <section className="print-hide mb-5 overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b bg-slate-950 p-4 text-white lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-300">
                <LayoutDashboard className="size-4" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Definir proyecto</p>
              </div>
              <h2 className="mt-1 text-lg font-semibold">Del ambiente al tablero en pocos datos</h2>
              <p className="mt-1 text-xs text-slate-400">Elegí una base, corregí dimensiones y ocupación; después ajustá los circuitos reales.</p>
            </div>
            <div className="flex rounded-lg border border-white/15 bg-white/5 p-1">
              <Button size="sm" variant="ghost" className={experienceMode === 'guided' ? 'bg-white text-slate-950 hover:bg-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'} onClick={() => setExperienceMode('guided')}>Rápido</Button>
              <Button size="sm" variant="ghost" className={experienceMode === 'technical' ? 'bg-white text-slate-950 hover:bg-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'} onClick={() => setExperienceMode('technical')}><SlidersHorizontal data-icon="inline-start" /> Técnico</Button>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([
                ['hall', 'SALÓN'],
                ['commercial', 'Comercio'],
                ['residential', 'Vivienda'],
                ['custom', 'Personalizado'],
              ] as Array<[ProjectPreset, string]>).map(([preset, label]) => (
                <button key={preset} type="button" onClick={() => applyPreset(preset)} className={`rounded-xl border p-3 text-left transition-colors ${profile.preset === preset ? 'border-amber-400 bg-amber-50 text-amber-950 ring-1 ring-amber-200' : 'hover:border-slate-300 hover:bg-muted/30'}`}>
                  <span className="text-xs font-semibold">{label}</span>
                  <span className="mt-1 block text-[10px] text-muted-foreground">{preset === 'hall' ? 'Pública concurrencia · emergencia' : preset === 'commercial' ? 'Atención al público' : preset === 'residential' ? 'Uso doméstico' : 'Sin supuestos previos'}</span>
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="quick-project-name" className="text-xs text-muted-foreground">Nombre del proyecto</Label>
                <Input id="quick-project-name" value={projectName} onChange={(event) => setProjectName(event.target.value)} className="font-medium" />
              </div>
              <QuickNumber label="Ancho" value={profile.widthM} suffix="m" min={1} onChange={(value) => updateProfile('widthM', value)} />
              <QuickNumber label="Largo" value={profile.lengthM} suffix="m" min={1} onChange={(value) => updateProfile('lengthM', value)} />
              <QuickNumber label="Ocupación" value={profile.occupancy} suffix="pers." min={1} onChange={(value) => updateProfile('occupancy', value)} />
              <div className="space-y-1.5">
                <Label htmlFor="quick-supply" className="text-xs text-muted-foreground">Suministro</Label>
                <NativeSelect id="quick-supply" className="w-full" value={supply} onChange={(event) => {
                  const nextSupply = event.target.value as Supply;
                  setSupply(nextSupply);
                  if (nextSupply === 'mono') setCircuits((current) => current.map((circuit) => ({ ...circuit, phase: 'L1', modules: Math.min(circuit.modules, 2) })));
                }}>
                  <NativeSelectOption value="mono">220 V mono</NativeSelectOption>
                  <NativeSelectOption value="tri">380/220 V tri</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="work-type" className="text-xs text-muted-foreground">Tipo de obra</Label>
                <NativeSelect id="work-type" className="w-full" value={profile.workType} onChange={(event) => updateProfile('workType', event.target.value as WorkType)}>
                  <NativeSelectOption value="new">Obra nueva</NativeSelectOption>
                  <NativeSelectOption value="remodel">Reforma</NativeSelectOption>
                  <NativeSelectOption value="survey">Relevamiento</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="rounded-xl border bg-muted/25 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Superficie</p>
                <p className="mt-1 font-mono text-lg font-bold">{projectArea.toFixed(0)} m²</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{areaPerPerson.toFixed(2)} m²/persona</p>
              </div>
            </div>
            {profile.preset === 'hall' && (
              <div className="mt-4 flex flex-col gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sky-950 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold">Plantilla SALÓN activa</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-sky-900/75">Incluye circuitos separados para iluminación, tomacorrientes, emergencia y audio. Confirmá el aforo, las vías de evacuación, la autonomía de emergencia y las cargas reales.</p>
                </div>
                <Badge className="w-fit border border-sky-300 bg-white text-sky-800">Local de pública concurrencia</Badge>
              </div>
            )}
          </div>
        </section>

        {experienceMode === 'technical' && <div className="print-hide mb-5 grid gap-3 rounded-2xl border bg-card p-4 shadow-sm lg:grid-cols-[minmax(280px,1.4fr)_repeat(4,minmax(120px,.6fr))]">
          <div className="space-y-1.5">
            <Label htmlFor="project-name" className="text-xs text-muted-foreground">Proyecto</Label>
            <Input id="project-name" value={projectName} onChange={(event) => setProjectName(event.target.value)} className="h-10 font-medium" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supply" className="text-xs text-muted-foreground">Suministro</Label>
            <NativeSelect
              className="w-full"
              value={supply}
              onChange={(event) => {
                const nextSupply = event.target.value as Supply;
                setSupply(nextSupply);
                if (nextSupply === 'mono') {
                  setCircuits((current) => current.map((circuit) => ({ ...circuit, phase: 'L1', modules: Math.min(circuit.modules, 2) })));
                }
              }}
            >
              <NativeSelectOption value="mono">Monofásico · 220 V</NativeSelectOption>
              <NativeSelectOption value="tri">Trifásico · 380/220 V</NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="demand" className="text-xs text-muted-foreground">Simultaneidad</Label>
            <Input id="demand" type="number" min="0.1" max="1" step="0.05" value={demandFactor} onChange={(event) => setDemandFactor(Number(event.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reserve" className="text-xs text-muted-foreground">Reserva modular</Label>
            <div className="relative">
              <Input id="reserve" type="number" min="0" max="100" value={reservePercent} onChange={(event) => setReservePercent(Number(event.target.value))} className="pr-8" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="modules-row" className="text-xs text-muted-foreground">Módulos por fila</Label>
            <NativeSelect className="w-full" value={modulesPerRow} onChange={(event) => setModulesPerRow(Number(event.target.value))}>
              {[12, 18, 24].map((value) => <NativeSelectOption key={value} value={value}>{value} módulos</NativeSelectOption>)}
            </NativeSelect>
          </div>
        </div>}

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <Metric label="Potencia instalada" value={formatPower(calculations.installedVA)} />
          <Metric label="Demanda estimada" value={formatPower(calculations.demandVA)} />
          <Metric label="Corriente de cabecera" value={`${calculations.mainCurrent.toFixed(1)} A`} />
          <Metric label="IGA sugerido" value={`${calculations.mainBreaker} A`} emphasis />
          <Metric label="Tablero sugerido" value={`${calculations.rows} × ${modulesPerRow} M`} emphasis />
          <Metric label="Ocupación / reserva" value={`${calculations.occupiedModules} / ${calculations.cabinetModules - calculations.occupiedModules} M`} />
        </div>

        <section className="order-last mt-5 overflow-hidden rounded-2xl border bg-card shadow-sm print:break-before-page">
          <div className="flex flex-col gap-3 border-b bg-slate-950 p-4 text-white sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-300">
                <Calculator className="size-4" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Anexo final · Memoria de cálculo</p>
              </div>
              <h2 className="mt-1 text-lg font-semibold">Fórmulas, valores reemplazados y resultados</h2>
              <p className="mt-1 max-w-3xl text-xs text-slate-400">Las cargas se ingresan en VA: la potencia aparente ya contempla el factor de potencia. Si el dato disponible está en W, primero debe convertirse con S = P / cos φ.</p>
            </div>
            <Badge className="w-fit border border-amber-300/20 bg-amber-300/10 text-amber-200">ρ cobre = 0,018 Ω·mm²/m</Badge>
          </div>

          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            <FormulaCard
              title="Potencia instalada"
              formula="Sinst = Σ(ni × Si)"
              substitution={`${circuits.map((circuit) => Math.round(circuitPower(circuit))).join(' + ') || '0'} VA`}
              result={formatPower(calculations.installedVA)}
              note="ni: cantidad de bocas · Si: VA asignados por boca"
            />
            <FormulaCard
              title="Demanda simultánea"
              formula="Sd = Sinst × fs"
              substitution={`${Math.round(calculations.installedVA)} VA × ${formatNumber(demandFactor, 2)}`}
              result={formatPower(calculations.demandVA)}
              note="fs: factor de simultaneidad editable"
            />
            <FormulaCard
              title="Corriente de cabecera"
              formula={supply === 'tri' ? 'Ib,max = max(SL1, SL2, SL3) × fs / 220 V' : 'Ib = Sd / 220 V'}
              substitution={supply === 'tri'
                ? `máx(${Math.round(calculations.phaseVA.L1)}, ${Math.round(calculations.phaseVA.L2)}, ${Math.round(calculations.phaseVA.L3)}) × ${formatNumber(demandFactor, 2)} / 220`
                : `${Math.round(calculations.demandVA)} / 220`}
              result={`${formatNumber(calculations.mainCurrent, 2)} A`}
              note={supply === 'tri'
                ? `Se adopta la fase más cargada: L1 ${formatNumber(calculations.phaseCurrent.L1, 2)} A · L2 ${formatNumber(calculations.phaseCurrent.L2, 2)} A · L3 ${formatNumber(calculations.phaseCurrent.L3, 2)} A`
                : 'Suministro monofásico'}
            />
            <FormulaCard
              title="Protección general sugerida"
              formula="In ≥ 1,15 × Ib"
              substitution={`1,15 × ${formatNumber(calculations.mainCurrent, 2)} A = ${formatNumber(calculations.mainCurrent * 1.15, 2)} A`}
              result={`${calculations.mainBreaker} A`}
              note="Se adopta el calibre normalizado inmediato superior; verificar Iz e Ik"
            />
            <FormulaCard
              title="Reserva del tablero"
              formula="Mrec = ⌈Mocup × (1 + r/100)⌉"
              substitution={`⌈${calculations.occupiedModules} × (1 + ${reservePercent}/100)⌉`}
              result={`${calculations.recommendedModules} módulos`}
              note={`Gabinete adoptado: ${calculations.rows} × ${modulesPerRow} = ${calculations.cabinetModules} módulos`}
            />
            <FormulaCard
              title="Dimensiones orientativas"
              formula="A = Mfila × 18 + 80 · H = filas × 150 + 80"
              substitution={`A = ${modulesPerRow} × 18 + 80 · H = ${calculations.rows} × 150 + 80`}
              result={`${calculations.widthMm} × ${calculations.heightMm} mm`}
              note="Estimación geométrica; adoptar dimensiones reales del fabricante y verificar disipación"
            />
            <FormulaCard
              title="Desbalance de fases"
              formula="D = max(|Sfase − Sprom|) / Sprom × 100"
              substitution={supply === 'tri'
                ? `máx. desvío respecto del promedio de L1, L2 y L3`
                : 'No aplica a suministro monofásico'}
              result={supply === 'tri' ? `${formatNumber(calculations.imbalance * 100, 1)} %` : 'No aplica'}
              note="La aplicación alerta cuando el valor estimado supera 20 %"
            />
            <FormulaCard
              title="Poder de corte"
              formula="Icn ≥ Ik presunta"
              substitution={`${formatNumber(profile.breakingCapacityKa, 1)} kA ≥ ${formatNumber(profile.prospectiveShortCircuitKa, 1)} kA`}
              result={profile.breakingCapacityKa >= profile.prospectiveShortCircuitKa ? 'Condición satisfecha' : 'No satisfecha'}
              note="Ik debe calcularse o medirse en el punto de instalación"
            />
            <FormulaCard
              title="Costo de la propuesta"
              formula="Ctotal = Cbase × (1 + a/100) × (1 + m/100)"
              substitution={`${formatMoney(selectedCost.material / (1 + prices.accessoriesPercent / 100))} × (1 + ${prices.accessoriesPercent}/100) × (1 + ${prices.assemblyPercent}/100)`}
              result={formatMoney(selectedCost.total)}
              note="a: accesorios · m: armado y contingencia · valores sólo referenciales"
            />
          </div>

          <div className="border-t px-4 py-3">
            <div className="mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Desarrollo por circuito</p>
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
                  {circuits.map((circuit, index) => {
                    const threePhase = circuit.phase === '3Φ' && supply === 'tri';
                    const current = circuitCurrent(circuit, supply);
                    const drop = voltageDrop(circuit, supply);
                    const capacity = CONDUCTOR_CAPACITY[circuit.conductor] ?? 0;
                    const protectionOkay = current <= circuit.breaker && circuit.breaker <= capacity;
                    return (
                      <tr key={circuit.id} className="border-b last:border-0">
                        <td className="px-3 py-3"><strong>C{index + 1}</strong><span className="ml-2 text-muted-foreground">{circuit.name}</span></td>
                        <td className="px-3 py-3 font-mono">{circuit.points} × {circuit.unitVA} = {Math.round(circuitPower(circuit))} VA</td>
                        <td className="px-3 py-3">
                          <code className="block rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-800">{threePhase ? 'Ib = S / (√3 × 380)' : 'Ib = S / 220'}</code>
                          <span className="mt-1 block font-mono text-[9px] text-muted-foreground">{threePhase ? `${Math.round(circuitPower(circuit))} / (1,732 × 380)` : `${Math.round(circuitPower(circuit))} / 220`}</span>
                        </td>
                        <td className="px-3 py-3 font-mono font-bold">{formatNumber(current, 2)} A</td>
                        <td className="px-3 py-3">
                          <code className={`block rounded px-2 py-1 text-[10px] font-semibold ${protectionOkay ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>Ib ≤ In ≤ Iz</code>
                          <span className="mt-1 block font-mono text-[9px] text-muted-foreground">{formatNumber(current, 2)} ≤ {circuit.breaker} ≤ {capacity} A</span>
                        </td>
                        <td className="px-3 py-3">
                          <code className="block rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-800">{threePhase ? 'ΔV = √3 × ρ × L × Ib / s' : 'ΔV = 2 × ρ × L × Ib / s'}</code>
                          <span className="mt-1 block font-mono text-[9px] text-muted-foreground">{threePhase ? '1,732' : '2'} × 0,018 × {circuit.lengthM} × {formatNumber(current, 2)} / {circuit.conductor}</span>
                        </td>
                        <td className={`px-3 py-3 font-mono font-bold ${drop.percent > 3 ? 'text-amber-700' : 'text-emerald-700'}`}>{formatNumber(drop.volts, 2)} V · {formatNumber(drop.percent, 2)} %</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">Símbolos: S = potencia aparente [VA], Ib = corriente de diseño [A], In = corriente nominal de la protección [A], L = longitud de ida [m], s = sección [mm²], ρ = resistividad del cobre. El límite de 3 % usado por la aplicación es un criterio preliminar conservador; deben verificarse temperatura, reactancia, método de instalación, agrupamiento y caída total conforme al proyecto.</p>
          </div>
        </section>

        <section className="mb-5 grid overflow-hidden rounded-2xl border bg-card shadow-sm xl:grid-cols-[minmax(320px,.8fr)_minmax(0,1.7fr)]">
          <div className="border-b bg-slate-950 p-4 text-white xl:border-b-0 xl:border-r">
            <div className="flex items-center gap-2 text-amber-300">
              <BookOpenCheck className="size-4" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Datos de verificación</p>
            </div>
            <h2 className="mt-1 text-lg font-semibold">Lo que define la seguridad</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">Estos valores deben surgir del proyecto y de mediciones. Los iniciales son supuestos editables, no certificaciones.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <QuickNumber dark label="Ik presunta" value={profile.prospectiveShortCircuitKa} suffix="kA" min={0.1} step={0.5} onChange={(value) => updateProfile('prospectiveShortCircuitKa', value)} />
              <QuickNumber dark label="Poder de corte" value={profile.breakingCapacityKa} suffix="kA" min={1} step={0.5} onChange={(value) => updateProfile('breakingCapacityKa', value)} />
              <QuickNumber dark label="Puesta a tierra" value={profile.groundResistanceOhm} suffix="Ω" min={0} step={0.1} onChange={(value) => updateProfile('groundResistanceOhm', value)} />
              <div className="space-y-1.5">
                <Label htmlFor="evacuation" className="text-xs text-slate-400">Evacuación AEA</Label>
                <NativeSelect id="evacuation" className="w-full border-white/15 bg-white/10 text-white" value={profile.evacuation} onChange={(event) => updateProfile('evacuation', event.target.value as EvacuationClass)}>
                  <NativeSelectOption value="BD1">BD1 · fácil</NativeSelectOption>
                  <NativeSelectOption value="BD2">BD2</NativeSelectOption>
                  <NativeSelectOption value="BD3">BD3 · público</NativeSelectOption>
                  <NativeSelectOption value="BD4">BD4 · difícil</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-scale" className="text-xs text-slate-400">Escala del plano</Label>
                <NativeSelect id="plan-scale" className="w-full border-white/15 bg-white/10 text-white" value={profile.planScale} onChange={(event) => updateProfile('planScale', event.target.value as ProjectProfile['planScale'])}>
                  <NativeSelectOption value="1:50">1:50</NativeSelectOption>
                  <NativeSelectOption value="1:100">1:100 · salón amplio</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="flex items-end">
                <Badge className={`mb-1 ${warnings.length ? 'border border-amber-300/30 bg-amber-300/10 text-amber-200' : 'border border-emerald-300/30 bg-emerald-300/10 text-emerald-200'}`}>{warnings.length ? `${warnings.length} alertas` : 'Sin alertas'}</Badge>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Expediente y control técnico</p>
                <h2 className="font-semibold">{complianceItems.filter((item) => item.ready).length} de {complianceItems.length} controles con datos suficientes</h2>
              </div>
              <Badge variant="outline">Estado preliminar · no es visación</Badge>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {complianceItems.map((item) => (
                <div key={`${item.group}-${item.label}`} className={`flex gap-3 rounded-xl border p-3 ${item.ready ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                  {item.ready ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{item.group}</p>
                    <p className="text-xs font-semibold">{item.label}</p>
                    {!item.ready && <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{item.action}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="print-hide mt-3 grid gap-2 sm:grid-cols-3">
              <ChecklistToggle label="Memoria preparada" checked={profile.descriptiveMemoryReady} onChange={(checked) => updateProfile('descriptiveMemoryReady', checked)} />
              <ChecklistToggle label="Profesional matriculado" checked={profile.registeredProfessionalReady} onChange={(checked) => updateProfile('registeredProfessionalReady', checked)} />
              <ChecklistToggle label="Ensayos ejecutados" checked={profile.siteTestReady} onChange={(checked) => updateProfile('siteTestReady', checked)} />
            </div>
          </div>
        </section>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(520px,1fr)]">
          <section className="min-w-0 rounded-2xl border bg-card shadow-sm">
            <div className="print-hide flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="size-4 text-amber-500" />
                  <h2 className="font-semibold">Circuitos del tablero</h2>
                  <Badge variant="secondary">{circuits.length}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Agregá bocas y ajustá cada circuito; el tablero se redimensiona en el momento.</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button className="bg-slate-900 text-white hover:bg-slate-800" size="sm" onClick={optimizeProject}>
                  <Sparkles data-icon="inline-start" /> Optimizar
                </Button>
                {(Object.keys(TEMPLATES) as CircuitKind[]).map((kind) => (
                  <Button key={kind} variant="outline" size="sm" onClick={() => addCircuit(kind)} title={TEMPLATES[kind].label}>
                    <Plus data-icon="inline-start" /> {kind}
                  </Button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className={`circuit-table w-full text-left text-sm ${experienceMode === 'technical' ? 'min-w-[1160px]' : 'min-w-[980px]'}`}>
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
                    {experienceMode === 'technical' && <th className="px-2 py-2.5 text-right">Recorrido</th>}
                    {experienceMode === 'technical' && <th className="px-2 py-2.5 text-right">ΔV</th>}
                    <th className="px-2 py-2.5 text-right">Mód.</th>
                    <th className="print-hide w-20 px-2 py-2.5"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {circuits.map((circuit, index) => (
                    <tr key={circuit.id} className="group border-b last:border-0 hover:bg-muted/25">
                      <td className="min-w-52 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-slate-900 font-mono text-[10px] font-bold text-white">C{index + 1}</span>
                          <Input value={circuit.name} onChange={(event) => updateCircuit(circuit.id, 'name', event.target.value)} className="border-transparent bg-transparent px-1 font-medium shadow-none hover:border-input focus-visible:bg-background" />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <NativeSelect size="sm" value={circuit.kind} onChange={(event) => updateCircuit(circuit.id, 'kind', event.target.value as CircuitKind)}>
                          {(Object.keys(TEMPLATES) as CircuitKind[]).map((kind) => <NativeSelectOption key={kind} value={kind}>{kind}</NativeSelectOption>)}
                        </NativeSelect>
                      </td>
                      <td className="px-2 py-2"><CompactNumber value={circuit.points} min={1} onChange={(value) => updateCircuit(circuit.id, 'points', value)} /></td>
                      <td className="px-2 py-2"><CompactNumber value={circuit.unitVA} min={1} onChange={(value) => updateCircuit(circuit.id, 'unitVA', value)} /></td>
                      <td className="px-2 py-2 text-right font-mono text-xs font-semibold">{formatPower(circuitPower(circuit))}</td>
                      <td className="px-2 py-2">
                        <NativeSelect size="sm" value={supply === 'mono' ? 'L1' : circuit.phase} disabled={supply === 'mono'} onChange={(event) => updateCircuit(circuit.id, 'phase', event.target.value as Phase)}>
                          <NativeSelectOption value="L1">L1</NativeSelectOption>
                          {supply === 'tri' && <><NativeSelectOption value="L2">L2</NativeSelectOption><NativeSelectOption value="L3">L3</NativeSelectOption><NativeSelectOption value="3Φ">3Φ</NativeSelectOption></>}
                        </NativeSelect>
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-xs">{circuitCurrent(circuit, supply).toFixed(1)} A</td>
                      <td className="px-2 py-2">
                        <NativeSelect size="sm" className="ml-auto w-20" value={circuit.breaker} onChange={(event) => updateCircuit(circuit.id, 'breaker', Number(event.target.value))}>
                          {STANDARD_BREAKERS.slice(0, 9).map((value) => <NativeSelectOption key={value} value={value}>{value} A</NativeSelectOption>)}
                        </NativeSelect>
                      </td>
                      <td className="px-2 py-2">
                        <NativeSelect size="sm" className="ml-auto w-24" value={circuit.conductor} onChange={(event) => updateCircuit(circuit.id, 'conductor', Number(event.target.value))}>
                          {Object.keys(CONDUCTOR_CAPACITY).map((value) => <NativeSelectOption key={value} value={value}>{value} mm²</NativeSelectOption>)}
                        </NativeSelect>
                      </td>
                      {experienceMode === 'technical' && <td className="px-2 py-2"><CompactNumber value={circuit.lengthM} min={1} onChange={(value) => updateCircuit(circuit.id, 'lengthM', value)} /></td>}
                      {experienceMode === 'technical' && <td className={`px-2 py-2 text-right font-mono text-xs font-semibold ${voltageDrop(circuit, supply).percent > 3 ? 'text-amber-700' : 'text-emerald-700'}`}>{voltageDrop(circuit, supply).percent.toFixed(1)} %</td>}
                      <td className="px-2 py-2"><CompactNumber value={circuit.modules} min={1} max={8} onChange={(value) => updateCircuit(circuit.id, 'modules', value)} /></td>
                      <td className="print-hide px-2 py-2">
                        <div className="flex justify-end opacity-50 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <Button variant="ghost" size="icon-sm" onClick={() => duplicateCircuit(circuit)} aria-label={`Duplicar ${circuit.name}`}><Copy /></Button>
                          <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setCircuits((current) => current.filter((item) => item.id !== circuit.id))} aria-label={`Eliminar ${circuit.name}`}><Trash2 /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
                    <p className="text-xs font-semibold uppercase tracking-wide">Revisar {warnings.length} observación{warnings.length > 1 ? 'es' : ''}</p>
                    <ul className="mt-1 space-y-0.5 text-xs">{warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 className="size-4" /> Sin alertas preliminares en los datos cargados.</div>
              )}
            </div>
          </section>

          <div className="space-y-5">
            <section className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Vista frontal</p>
                  <h2 className="text-lg font-semibold">Tablero DIN · {calculations.rows} filas</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Lectura de izquierda a derecha: cabecera, protección y circuitos de salida.</p>
                </div>
                <Badge variant="outline">≈ {calculations.widthMm} × {calculations.heightMm} × 120 mm</Badge>
              </div>
              <PanelFront devices={devices} rows={calculations.rows} modulesPerRow={modulesPerRow} />
              <ProtectionGuide />
            </section>

            {supply === 'tri' && (
              <section className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Balance de fases</p>
                    <h2 className="font-semibold">Distribución de carga</h2>
                  </div>
                  <Badge variant={calculations.imbalance > 0.2 ? 'destructive' : 'secondary'}>{Math.round(calculations.imbalance * 100)} % desbalance</Badge>
                </div>
                <div className="space-y-3">
                  {(['L1', 'L2', 'L3'] as const).map((phase) => {
                    const max = Math.max(...Object.values(calculations.phaseVA), 1);
                    return <PhaseBar key={phase} phase={phase} value={calculations.phaseVA[phase]} percent={(calculations.phaseVA[phase] / max) * 100} />;
                  })}
                </div>
              </section>
            )}
          </div>
        </div>

        <section className="mt-5 rounded-2xl border bg-card p-4 shadow-sm print:break-before-page">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Generado automáticamente</p>
              <h2 className="text-lg font-semibold">Esquema unifilar preliminar</h2>
            </div>
            <p className="max-w-xl text-xs text-muted-foreground">El esquema muestra la arquitectura del tablero. Deben verificarse poder de corte, cortocircuito, selectividad, caída de tensión y método de instalación.</p>
          </div>
          <SingleLineDiagram circuits={circuits} supply={supply} mainBreaker={calculations.mainBreaker} architecture={architecture} />
        </section>

        <section className="mt-5 rounded-2xl border border-sky-200 bg-card p-4 shadow-sm print:break-before-page">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">Exigencia municipal verificada</p>
              <h2 className="text-lg font-semibold">Esquema multifilar para Ordenanza 72/83</h2>
            </div>
            <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">La ordenanza pide agrupar fase, neutro y protección por salida, identificar circuitos y secciones. Este cuadro sirve como base; el plano profesional debe completar canalizaciones, diámetros, conductores y conexiones reales.</p>
          </div>
          <MultiLineDiagram circuits={circuits} supply={supply} />
        </section>

        <section className="mt-5 rounded-2xl border bg-card p-4 shadow-sm print:break-before-page">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-700">
                <DollarSign className="size-4" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Costo y optimización</p>
              </div>
              <h2 className="mt-1 text-lg font-semibold">Tres arquitecturas comparables</h2>
              <p className="mt-1 max-w-3xl text-xs text-muted-foreground">Valores minoristas de referencia en ARS consultados el 29/08/2026. Incluyen una previsión editable para accesorios, armado y contingencia; no incluyen cableado del edificio, puesta a tierra, canalizaciones ni honorarios.</p>
            </div>
            <Badge className="w-fit border border-emerald-200 bg-emerald-50 text-emerald-800">Propuesta activa: {selectedCost.title}</Badge>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {costOptions.map((option) => (
              <CostOptionCard
                key={option.id}
                option={option}
                selected={architecture === option.id}
                recommended={option.id === recommendedCost.id}
                onSelect={() => setArchitecture(option.id)}
              />
            ))}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.4fr)]">
            <div className="rounded-xl border bg-slate-950 p-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Qué encarece esta propuesta</p>
                  <h3 className="mt-1 font-semibold">Mayores impulsores de costo</h3>
                </div>
                <TrendingUp className="size-5 text-amber-300" />
              </div>
              <div className="mt-4 space-y-3">
                {selectedDrivers.map((driver, index) => {
                  const percent = selectedCost.total > 0 ? (driver.value / selectedCost.total) * 100 : 0;
                  return (
                    <div key={driver.label}>
                      <div className="mb-1 flex justify-between gap-3 text-xs">
                        <span>{index + 1}. {driver.label}</span>
                        <span className="font-mono font-semibold">{formatMoney(driver.value)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-300" style={{ width: `${Math.max(4, percent)}%` }} /></div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-slate-300">
                <strong className="text-white">Criterio:</strong> el DPS y los diferenciales no se eliminan para ahorrar. La mejora de costo viene de evitar sobredimensionamiento, balancear fases, dividir circuitos sobrecargados y elegir el gabinete inmediato superior con al menos {reservePercent}% de reserva.
              </div>
            </div>

            <div className="print-hide rounded-xl border bg-muted/20 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Catálogo editable</p>
                  <h3 className="font-semibold">Ajustá con tus cotizaciones locales</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setPrices(DEFAULT_PRICES)}><RotateCcw data-icon="inline-start" /> Restaurar precios</Button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <PriceInput label="Térmica 2P" value={prices.mcb2P} onChange={(value) => setPrices((current) => ({ ...current, mcb2P: value }))} />
                <PriceInput label="Térmica / IGA 4P" value={prices.mcb4P} onChange={(value) => setPrices((current) => ({ ...current, mcb4P: value }))} />
                <PriceInput label="Diferencial 2P" value={prices.rcd2P} onChange={(value) => setPrices((current) => ({ ...current, rcd2P: value }))} />
                <PriceInput label="Diferencial 4P" value={prices.rcd4P} onChange={(value) => setPrices((current) => ({ ...current, rcd4P: value }))} />
                <PriceInput label="DPS 1P+N / 2P" value={prices.spd2P} onChange={(value) => setPrices((current) => ({ ...current, spd2P: value }))} />
                <PriceInput label="DPS 3P+N / 4P" value={prices.spd4P} onChange={(value) => setPrices((current) => ({ ...current, spd4P: value }))} />
                <PriceInput label="Gabinete 16 M" value={prices.cabinet16} onChange={(value) => setPrices((current) => ({ ...current, cabinet16: value }))} />
                <PriceInput label="Gabinete 36 M" value={prices.cabinet36} onChange={(value) => setPrices((current) => ({ ...current, cabinet36: value }))} />
                <PriceInput label="Gabinete 54 M (estim.)" value={prices.cabinet54} onChange={(value) => setPrices((current) => ({ ...current, cabinet54: value }))} />
                <PriceInput label="Gabinete 72 M (estim.)" value={prices.cabinet72} onChange={(value) => setPrices((current) => ({ ...current, cabinet72: value }))} />
                <PriceInput label="Prima Tipo A" value={prices.typeAPremium} suffix="%" onChange={(value) => setPrices((current) => ({ ...current, typeAPremium: value }))} />
                <PriceInput label="Accesorios" value={prices.accessoriesPercent} suffix="%" onChange={(value) => setPrices((current) => ({ ...current, accessoriesPercent: value }))} />
                <PriceInput label="Armado + contingencia" value={prices.assemblyPercent} suffix="%" onChange={(value) => setPrices((current) => ({ ...current, assemblyPercent: value }))} />
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
                <a key={source.label} href={source.href} target="_blank" rel="noreferrer" className="group rounded-lg border bg-background p-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50">
                  <p className="text-xs font-semibold group-hover:text-emerald-900">{source.label}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{source.detail}</p>
                </a>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">Las promociones y el stock cambian. El diferencial Tipo A se modela con una prima porcentual editable porque la referencia económica relevada es clase AC. Para LED, fuentes conmutadas, audio y electrónica conviene que el profesional verifique la clase requerida. Los gabinetes de 54 y 72 módulos son extrapolaciones editables, no precios publicados.</p>
          </div>
        </section>

        <section className="mt-5 grid gap-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="grid size-9 place-items-center rounded-lg bg-sky-100"><Info className="size-5" /></div>
          <div>
            <h2 className="text-sm font-semibold">Marco de cálculo y límites</h2>
            <p className="mt-1 text-xs leading-relaxed text-sky-900/80">Herramienta de predimensionado basada en AEA 90364 (Partes 0–3 y 6 vigentes, Secciones 771 y 718), criterios modernos de tableros IEC 61439 y Ordenanza General 72/83 de Mendoza. La ordenanza es histórica y puede contener criterios superados: ante conflicto prevalece el requisito de seguridad vigente y la definición de la autoridad/profesional. No reemplaza proyecto, memoria, firma, ensayos ni visación municipal.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <a className="rounded-lg border border-sky-300 bg-white px-3 py-2 font-medium hover:bg-sky-100" href="https://www.sanrafael.gov.ar/archivos-muni/obras/edificacion.pdf" target="_blank" rel="noreferrer">Código municipal</a>
            <a className="rounded-lg border border-sky-300 bg-white px-3 py-2 font-medium hover:bg-sky-100" href="https://aea.org.ar/wp-content/uploads/2017/10/90364-7-718-1.pdf" target="_blank" rel="noreferrer">AEA 718</a>
          </div>
        </section>
      </section>
    </main>
  );
}

function FormulaCard({ title, formula, substitution, result, note }: { title: string; formula: string; substitution: string; result: string; note: string }) {
  return (
    <article className="rounded-xl border bg-background p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">{title}</p>
      <code className="mt-2 block rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 font-mono text-xs font-semibold text-slate-900">{formula}</code>
      <div className="mt-2 grid grid-cols-[1fr_auto] items-end gap-3">
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Reemplazo</p>
          <p className="mt-0.5 break-words font-mono text-[10px] leading-relaxed text-slate-600">{substitution}</p>
        </div>
        <p className="whitespace-nowrap font-mono text-lg font-black tracking-tight text-slate-950">{result}</p>
      </div>
      <p className="mt-2 border-t pt-2 text-[9px] leading-relaxed text-muted-foreground">{note}</p>
    </article>
  );
}

function QuickNumber({ label, value, suffix, min, step = 1, dark = false, onChange }: { label: string; value: number; suffix: string; min?: number; step?: number; dark?: boolean; onChange: (value: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className={`text-xs ${dark ? 'text-slate-400' : 'text-muted-foreground'}`}>{label}</Label>
      <div className="relative">
        <Input type="number" min={min} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className={`pr-12 font-mono ${dark ? 'border-white/15 bg-white/10 text-white' : ''}`} />
        <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] ${dark ? 'text-slate-400' : 'text-muted-foreground'}`}>{suffix}</span>
      </div>
    </div>
  );
}

function ChecklistToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-background p-2.5 text-xs font-medium hover:bg-muted/30">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-emerald-700" />
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
    <article className={`relative rounded-xl border p-4 transition-all ${selected ? 'border-emerald-400 bg-emerald-50 shadow-sm ring-1 ring-emerald-200' : 'bg-background hover:border-slate-300'}`}>
      {recommended && <Badge className="absolute right-3 top-3 bg-emerald-700 text-white">mejor costo/protección</Badge>}
      <div className="flex items-center gap-2">
        <div className={`grid size-8 place-items-center rounded-lg ${selected ? 'bg-emerald-700 text-white' : 'bg-muted text-muted-foreground'}`}><ShieldCheck className="size-4" /></div>
        <div>
          <h3 className="text-sm font-semibold">{option.title}</h3>
          <p className="text-[10px] text-muted-foreground">{option.subtitle}</p>
        </div>
      </div>
      <p className="mt-4 font-mono text-2xl font-black tracking-tight">{formatMoney(option.total)}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">Materiales: {formatMoney(option.material)} · {option.cabinetLabel} · {option.modules} M requeridos</p>
      <Separator className="my-3" />
      <div className="space-y-2 text-[11px] leading-relaxed">
        <p><strong>Protección:</strong> {option.protection}</p>
        <p><strong>Continuidad:</strong> {option.continuity}</p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${option.score}%` }} /></div>
        <span className="font-mono text-[10px] font-bold">{option.score}/100</span>
      </div>
      <Button variant={selected ? 'default' : 'outline'} size="sm" className={`mt-4 w-full ${selected ? 'bg-emerald-700 hover:bg-emerald-800' : ''}`} onClick={onSelect}>
        {selected ? 'Propuesta aplicada' : 'Usar propuesta'} {!selected && <ArrowRight data-icon="inline-end" />}
      </Button>
    </article>
  );
}

function PriceInput({ label, value, suffix = '$', onChange }: { label: string; value: number; suffix?: string; onChange: (value: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input type="number" min="0" step="1" value={value} onChange={(event) => onChange(Number(event.target.value))} className={suffix === '$' ? 'pl-7 font-mono text-xs' : 'pr-8 font-mono text-xs'} />
        <span className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground ${suffix === '$' ? 'left-3' : 'right-3'}`}>{suffix}</span>
      </div>
    </div>
  );
}

function Metric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 shadow-sm ${emphasis ? 'border-amber-300 bg-amber-50' : 'bg-card'}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-lg font-bold tracking-tight ${emphasis ? 'text-amber-950' : ''}`}>{value}</p>
    </div>
  );
}

function CompactNumber({ value, min, max, onChange }: { value: number; min?: number; max?: number; onChange: (value: number) => void }) {
  return <Input type="number" value={value} min={min} max={max} onChange={(event) => onChange(Number(event.target.value))} className="ml-auto w-20 text-right font-mono text-xs" />;
}

function ProtectionGuide() {
  const items = [
    { code: 'IGA', title: 'Interruptor General Automático', description: 'Corte general y protección principal contra sobrecargas y cortocircuitos.', swatch: 'bg-slate-800' },
    { code: 'DPS', title: 'Dispositivo de Protección contra Sobretensiones', description: 'Limita sobretensiones transitorias y las deriva hacia tierra.', swatch: 'bg-violet-600' },
    { code: 'ID', title: 'Interruptor Diferencial', description: 'Detecta fugas de corriente. En este esquema se considera sensibilidad de 30 mA.', swatch: 'bg-sky-600' },
    { code: 'C1…', title: 'Interruptor termomagnético de circuito', description: 'Cada C protege una salida. El verde identifica iluminación de emergencia.', swatch: 'bg-amber-400' },
  ];
  return (
    <div className="mt-4 space-y-2 border-t pt-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Cómo leer el tablero, en orden</p>
      {items.map((item, index) => (
        <div key={item.code} className="grid grid-cols-[auto_auto_1fr] items-start gap-3 rounded-xl border bg-muted/20 p-3">
          <span className="grid size-6 place-items-center rounded-full bg-slate-200 font-mono text-[10px] font-black text-slate-700">{index + 1}</span>
          <span className={`grid h-8 min-w-12 place-items-center rounded-lg font-mono text-[11px] font-black ${item.swatch} ${item.code === 'C1…' ? 'text-slate-950' : 'text-white'}`}>{item.code}</span>
          <div>
            <p className="text-xs font-semibold leading-tight">{item.title}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function PhaseBar({ phase, value, percent }: { phase: Phase; value: number; percent: number }) {
  return (
    <div className="grid grid-cols-[30px_1fr_auto] items-center gap-3">
      <span className="font-mono text-xs font-bold">{phase}</span>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full transition-[width] duration-500 ${phaseColor(phase)}`} style={{ width: `${Math.max(3, percent)}%` }} /></div>
      <span className="w-20 text-right font-mono text-xs">{formatPower(value)}</span>
    </div>
  );
}

function PanelFront({ devices, rows, modulesPerRow }: { devices: PanelDevice[]; rows: number; modulesPerRow: number }) {
  const slots: Array<{ device?: (typeof devices)[number]; start?: boolean; continuation?: boolean }> = Array.from({ length: rows * modulesPerRow }, () => ({}));
  let cursor = 0;
  devices.forEach((device) => {
    if (cursor >= slots.length) return;
    const remainingOnRow = modulesPerRow - (cursor % modulesPerRow);
    if (device.span > remainingOnRow) cursor += remainingOnRow;
    if (cursor >= slots.length) return;
    for (let index = 0; index < device.span && cursor + index < slots.length; index += 1) {
      slots[cursor + index] = { device, start: index === 0, continuation: index > 0 };
    }
    cursor += device.span;
  });

  return (
    <div className="panel-shell rounded-2xl border-[10px] border-slate-800 bg-slate-200 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,.65),0_10px_28px_rgba(15,23,42,.16)]">
      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white/70 px-3 py-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Distribución modular</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-800">IGA → DPS → ID → circuitos</p>
        </div>
        <span className="rounded-md bg-slate-800 px-2 py-1 font-mono text-[9px] font-bold text-white">1 módulo = 18 mm</span>
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="mb-4 last:mb-0">
          <div className="mb-1.5 flex justify-between font-mono text-[10px] font-black uppercase tracking-[0.1em] text-slate-600"><span>Riel DIN {rowIndex + 1}</span><span>{modulesPerRow} módulos</span></div>
          <div className="grid h-[92px] overflow-hidden rounded-xl border-4 border-slate-700 bg-slate-700 p-1.5 shadow-[inset_0_2px_8px_rgba(15,23,42,.35)]" style={{ gridTemplateColumns: `repeat(${modulesPerRow}, minmax(0, 1fr))` }}>
            {slots.slice(rowIndex * modulesPerRow, (rowIndex + 1) * modulesPerRow).map((slot, index) => (
              <div key={index} className={`relative min-w-0 border-r border-slate-950/20 last:border-r-0 ${slot.device ? slot.device.className : 'bg-slate-50'}`}>
                {slot.start && slot.device && (
                  <div className="absolute inset-y-0 left-0 z-10 flex flex-col justify-between p-2 text-inherit" style={{ width: `${slot.device.span * 100}%` }} title={`${slot.device.label} · ${slot.device.fullName} · ${slot.device.detail}`}>
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="truncate font-mono text-base font-black leading-none tracking-tight">{slot.device.label}</p>
                        <span className="shrink-0 rounded border border-current/20 bg-white/20 px-1 py-0.5 font-mono text-[7px] font-bold">{slot.device.span}M</span>
                      </div>
                      <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.1em] opacity-75">Protección</p>
                    </div>
                    <div className="flex items-end justify-between gap-2 pr-1">
                      <p className="w-fit rounded-md border border-current/20 bg-white/30 px-1.5 py-1 font-mono text-[10px] font-black leading-none backdrop-blur-sm">{slot.device.detail}</p>
                      <span className="mb-0.5 h-6 w-1.5 shrink-0 rounded-full bg-slate-950/70 shadow-[0_0_0_1px_rgba(255,255,255,.25)]" />
                    </div>
                  </div>
                )}
                {!slot.device && <span className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SingleLineDiagram({ circuits, supply, mainBreaker, architecture }: { circuits: Circuit[]; supply: Supply; mainBreaker: number; architecture: Architecture }) {
  const protectionLabel = architecture === 'essential'
    ? 'DPS + ID'
    : architecture === 'balanced'
      ? 'DPS + 2 ID'
      : 'DPS + ID/circuito';
  return (
    <div className="unifilar overflow-x-auto rounded-xl border bg-[#f8fafc] p-5">
      <div className="mx-auto min-w-[760px] max-w-6xl">
        <div className="flex items-stretch">
          <DiagramNode kicker="Red" title={supply === 'tri' ? '3 × 380/220 V' : '1 × 220 V'} detail="50 Hz · TT" tone="dark" />
          <DiagramWire />
          <DiagramNode kicker="Medición" title="Medidor" detail={supply === 'tri' ? 'Trifásico' : 'Monofásico'} />
          <DiagramWire />
          <DiagramNode kicker="Cabecera" title={`IGA ${mainBreaker} A`} detail={supply === 'tri' ? '4P' : '2P'} />
          <DiagramWire />
          <DiagramNode kicker="Protección" title={protectionLabel} detail="30 mA" tone="blue" />
          <DiagramWire />
          <DiagramNode kicker="Barras" title={supply === 'tri' ? 'L1 · L2 · L3 · N · PE' : 'L · N · PE'} detail="Distribución" tone="amber" />
        </div>
        <div className="ml-auto mr-[75px] h-7 w-[2px] bg-slate-700" />
        <div className="grid gap-x-2 gap-y-4" style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(circuits.length, 1), 6)}, minmax(110px, 1fr))` }}>
          {circuits.map((circuit, index) => (
            <div key={circuit.id} className="relative pt-7">
              <span className="absolute left-1/2 top-0 h-7 w-[2px] -translate-x-1/2 bg-slate-700" />
              <span className="absolute left-0 right-0 top-0 h-[2px] bg-slate-700 first:left-1/2 last:right-1/2" />
              <div className={`rounded-lg border-2 bg-white p-2.5 shadow-sm ${circuit.kind === 'EMG' ? 'border-emerald-400' : 'border-slate-300'}`}>
                <div className="mb-2 flex items-center justify-between gap-2"><span className="font-mono text-[10px] font-black">C{index + 1}</span><span className={`size-2 rounded-full ${phaseColor(circuit.phase)}`} /></div>
                <p className="truncate text-xs font-semibold" title={circuit.name}>{circuit.name}</p>
                <Separator className="my-2" />
                <div className="grid grid-cols-2 gap-1 font-mono text-[9px] text-slate-600"><span>{circuit.breaker} A</span><span>{circuit.conductor} mm²</span><span>{circuit.phase}</span><span>{formatPower(circuitPower(circuit))}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MultiLineDiagram({ circuits, supply }: { circuits: Circuit[]; supply: Supply }) {
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
          {circuits.map((circuit, index) => {
            const threePhase = circuit.phase === '3Φ' && supply === 'tri';
            return (
              <tr key={circuit.id} className="border-b last:border-0">
                <td className="px-3 py-3" aria-label={`Circuito C${index + 1}: ${circuit.name}`}>
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded bg-slate-900 font-mono text-[9px] font-bold text-white">C{index + 1}</span>
                    <div><p className="font-semibold">{circuit.name}</p><p className="text-[9px] text-slate-500">{circuit.kind} · {circuit.phase}</p></div>
                  </div>
                </td>
                <td className="px-3 py-3 font-mono">TM {circuit.breaker} A · {threePhase ? '4P' : '2P'}<br /><span className="text-[9px] text-slate-500">ID 30 mA aguas arriba</span></td>
                <td className="px-3 py-3"><ConductorLines count={threePhase ? 3 : 1} color="bg-amber-500" label={threePhase ? `L1+L2+L3 · ${circuit.conductor} mm²` : `${circuit.phase} · ${circuit.conductor} mm²`} /></td>
                <td className="px-3 py-3"><ConductorLines count={1} color="bg-sky-500" label={`N · ${circuit.conductor} mm²`} /></td>
                <td className="px-3 py-3"><ConductorLines count={1} color="bg-emerald-500" label={`PE · ${circuit.conductor} mm²*`} /></td>
                <td className="px-3 py-3 font-mono">{formatPower(circuitPower(circuit))} · {circuit.lengthM} m<br /><span className={voltageDrop(circuit, supply).percent > 3 ? 'text-amber-700' : 'text-emerald-700'}>ΔV {voltageDrop(circuit, supply).percent.toFixed(1)} %</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-900">* La sección PE mostrada es conservadora e igual a la activa. Verificar su dimensionamiento, continuidad, canalización y la sección mínima del conductor entre tablero y electrodo según proyecto y reglamentación vigente.</p>
    </div>
  );
}

function ConductorLines({ count, color, label }: { count: number; color: string; label: string }) {
  return (
    <div>
      <div className="space-y-1">{Array.from({ length: count }).map((_, index) => <span key={index} className={`block h-0.5 w-24 ${color}`} />)}</div>
      <p className="mt-1 font-mono text-[9px] text-slate-600">{label}</p>
    </div>
  );
}

function DiagramNode({ kicker, title, detail, tone = 'light' }: { kicker: string; title: string; detail: string; tone?: 'light' | 'dark' | 'blue' | 'amber' }) {
  const tones = {
    light: 'border-slate-300 bg-white text-slate-950',
    dark: 'border-slate-900 bg-slate-900 text-white',
    blue: 'border-sky-300 bg-sky-50 text-sky-950',
    amber: 'border-amber-400 bg-amber-50 text-amber-950',
  };
  return <div className={`flex w-36 shrink-0 flex-col justify-center rounded-lg border-2 p-3 shadow-sm ${tones[tone]}`}><span className="text-[8px] font-bold uppercase tracking-[0.12em] opacity-60">{kicker}</span><strong className="mt-0.5 text-xs">{title}</strong><span className="mt-1 font-mono text-[9px] opacity-70">{detail}</span></div>;
}

function DiagramWire() {
  return <div className="flex min-w-5 flex-1 items-center"><span className="h-[2px] w-full bg-slate-700" /></div>;
}
