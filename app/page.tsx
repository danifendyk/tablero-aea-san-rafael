'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircuitBoard,
  Copy,
  DollarSign,
  ExternalLink,
  Info,
  Plus,
  Printer,
  RotateCcw,
  ShieldCheck,
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
    modules: 2,
  },
};

const INITIAL_CIRCUITS: Circuit[] = [
  {
    id: 1,
    name: 'Iluminación nave principal',
    kind: 'IUG',
    points: 12,
    unitVA: 100,
    phase: 'L1',
    powerFactor: 0.95,
    breaker: 16,
    conductor: 1.5,
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
  return circuitPower(circuit) / (divisor * voltage * Math.max(circuit.powerFactor, 0.1));
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
  const [projectName, setProjectName] = useState('Iglesia · Salón 24 × 10 m');
  const [supply, setSupply] = useState<Supply>('tri');
  const [demandFactor, setDemandFactor] = useState(0.8);
  const [reservePercent, setReservePercent] = useState(25);
  const [modulesPerRow, setModulesPerRow] = useState(18);
  const [circuits, setCircuits] = useState<Circuit[]>(INITIAL_CIRCUITS);
  const [architecture, setArchitecture] = useState<Architecture>('balanced');
  const [prices, setPrices] = useState<PriceCatalog>(DEFAULT_PRICES);
  const [optimizationMessage, setOptimizationMessage] = useState('');

  const calculations = useMemo(() => {
    const installedVA = circuits.reduce((total, circuit) => total + circuitPower(circuit), 0);
    const demandVA = installedVA * demandFactor;
    const mainCurrent =
      supply === 'tri'
        ? demandVA / (Math.sqrt(3) * 380 * 0.9)
        : demandVA / (220 * 0.9);
    const mainBreaker = nextBreaker(mainCurrent * 1.15);
    const baseModules = supply === 'tri' ? 12 : 6;
    const occupiedModules = architectureOccupiedModules(architecture, supply, circuits);
    const recommendedModules = Math.ceil(occupiedModules * (1 + reservePercent / 100));
    const rows = Math.max(1, Math.ceil(recommendedModules / modulesPerRow));
    const cabinetModules = rows * modulesPerRow;
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
      imbalance,
      widthMm: modulesPerRow * 18 + 80,
      heightMm: rows * 150 + 80,
    };
  }, [architecture, circuits, demandFactor, modulesPerRow, reservePercent, supply]);

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
    });
    if (calculations.imbalance > 0.2) {
      messages.push('El desbalance de fases estimado supera el 20 %.');
    }
    return messages;
  }, [calculations.imbalance, circuits, supply]);

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
      const conductor = Number(
        Object.keys(CONDUCTOR_CAPACITY)
          .map(Number)
          .sort((a, b) => a - b)
          .find((section) => section >= minimumSection && CONDUCTOR_CAPACITY[section] >= breaker)
          ?? 35,
      );
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
    setProjectName('Iglesia · Salón 24 × 10 m');
    setSupply('tri');
    setDemandFactor(0.8);
    setReservePercent(25);
    setModulesPerRow(18);
    setCircuits(INITIAL_CIRCUITS);
    setArchitecture('balanced');
    setPrices(DEFAULT_PRICES);
    setOptimizationMessage('');
  }

  const devices = useMemo(() => {
    const mainDevices: Array<{ key: string; label: string; detail: string; span: number; className: string }> = [
      {
        key: 'cabecera',
        label: 'IGA',
        detail: `${calculations.mainBreaker} A`,
        span: supply === 'tri' ? 4 : 2,
        className: 'device-main',
      },
      {
        key: 'spd',
        label: 'DPS',
        detail: supply === 'tri' ? '3P+N' : '1P+N',
        span: supply === 'tri' ? 4 : 2,
        className: 'device-spd',
      },
    ];
    if (architecture === 'essential') {
      mainDevices.push({ key: 'diff', label: 'ID', detail: '30 mA', span: supply === 'tri' ? 4 : 2, className: 'device-rcd' });
    }
    if (architecture === 'balanced') {
      mainDevices.push(
        { key: 'diff-a', label: 'ID A', detail: 'Normal · 30 mA', span: supply === 'tri' ? 4 : 2, className: 'device-rcd' },
        { key: 'diff-b', label: 'ID B', detail: 'Crítico · 30 mA', span: supply === 'tri' ? 4 : 2, className: 'device-rcd' },
      );
    }
    return [
      ...mainDevices,
      ...circuits.map((circuit, index) => ({
        key: `circuit-${circuit.id}`,
        label: architecture === 'continuity' ? `C${index + 1} + ID` : `C${index + 1}`,
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

      <section className="print-sheet mx-auto max-w-[1680px] px-4 py-5 lg:px-6">
        <div className="mb-4 hidden items-start justify-between border-b-2 border-slate-900 pb-3 print:flex">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em]">Planilla de predimensionado eléctrico</p>
            <h1 className="text-2xl font-bold">{projectName}</h1>
          </div>
          <div className="text-right text-xs">
            <p>San Rafael · Mendoza</p>
            <p>AEA 90364-7-718 · Ord. Gral. 72/83</p>
          </div>
        </div>

        <div className="print-hide mb-5 grid gap-3 rounded-2xl border bg-card p-4 shadow-sm lg:grid-cols-[minmax(280px,1.4fr)_repeat(4,minmax(120px,.6fr))]">
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
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <Metric label="Potencia instalada" value={formatPower(calculations.installedVA)} />
          <Metric label="Demanda estimada" value={formatPower(calculations.demandVA)} />
          <Metric label="Corriente de cabecera" value={`${calculations.mainCurrent.toFixed(1)} A`} />
          <Metric label="IGA sugerido" value={`${calculations.mainBreaker} A`} emphasis />
          <Metric label="Tablero sugerido" value={`${calculations.rows} × ${modulesPerRow} M`} emphasis />
          <Metric label="Ocupación / reserva" value={`${calculations.occupiedModules} / ${calculations.cabinetModules - calculations.occupiedModules} M`} />
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(420px,.9fr)]">
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
              <table className="circuit-table w-full min-w-[980px] text-left text-sm">
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
                  <h2 className="font-semibold">Tablero DIN · {calculations.rows} filas</h2>
                </div>
                <Badge variant="outline">≈ {calculations.widthMm} × {calculations.heightMm} × 120 mm</Badge>
              </div>
              <PanelFront devices={devices} rows={calculations.rows} modulesPerRow={modulesPerRow} />
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-muted-foreground">
                <Legend swatch="bg-slate-800" label="Cabecera" />
                <Legend swatch="bg-violet-600" label="DPS" />
                <Legend swatch="bg-sky-600" label="Diferencial" />
                <Legend swatch="bg-amber-400" label="Circuitos" />
                <Legend swatch="bg-emerald-500" label="Emergencia" />
              </div>
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
            <p className="mt-1 text-xs leading-relaxed text-sky-900/80">Herramienta de predimensionado basada en AEA 90364, Secciones 771 y 718, Código de Edificación de San Rafael y Ordenanza General 72/83. No reemplaza el proyecto, la memoria de cálculo, la firma profesional ni la visación municipal.</p>
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

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={`size-2 rounded-sm ${swatch}`} />{label}</span>;
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

function PanelFront({ devices, rows, modulesPerRow }: { devices: Array<{ key: string; label: string; detail: string; span: number; className: string }>; rows: number; modulesPerRow: number }) {
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
    <div className="panel-shell rounded-xl border-8 border-slate-800 bg-slate-200 p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,.4),0_8px_24px_rgba(15,23,42,.12)]">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="mb-3 last:mb-0">
          <div className="mb-1 flex justify-between font-mono text-[8px] font-bold uppercase tracking-wider text-slate-500"><span>Riel {rowIndex + 1}</span><span>{modulesPerRow}M</span></div>
          <div className="grid h-14 overflow-hidden rounded-md border border-slate-500 bg-slate-700 p-1" style={{ gridTemplateColumns: `repeat(${modulesPerRow}, minmax(0, 1fr))` }}>
            {slots.slice(rowIndex * modulesPerRow, (rowIndex + 1) * modulesPerRow).map((slot, index) => (
              <div key={index} className={`relative min-w-0 border-r border-black/15 last:border-r-0 ${slot.device ? slot.device.className : 'bg-slate-100'}`}>
                {slot.start && slot.device && (
                  <div className="absolute inset-y-0 left-0 z-10 flex items-center px-1.5 text-slate-950" style={{ width: `${slot.device.span * 100}%` }}>
                    <div className="min-w-0 leading-none"><p className="truncate font-mono text-[9px] font-black">{slot.device.label}</p><p className="mt-1 truncate font-mono text-[7px] font-semibold opacity-70">{slot.device.detail}</p></div>
                  </div>
                )}
                {slot.device && <span className="absolute bottom-1 right-1 h-3 w-1 rounded-full bg-slate-950/60" />}
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
