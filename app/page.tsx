'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircuitBoard,
  Copy,
  Info,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
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

  const calculations = useMemo(() => {
    const installedVA = circuits.reduce((total, circuit) => total + circuitPower(circuit), 0);
    const demandVA = installedVA * demandFactor;
    const mainCurrent =
      supply === 'tri'
        ? demandVA / (Math.sqrt(3) * 380 * 0.9)
        : demandVA / (220 * 0.9);
    const mainBreaker = nextBreaker(mainCurrent * 1.15);
    const baseModules = supply === 'tri' ? 12 : 6;
    const circuitModules = circuits.reduce((total, circuit) => total + circuit.modules, 0);
    const occupiedModules = baseModules + circuitModules;
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
  }, [circuits, demandFactor, modulesPerRow, reservePercent, supply]);

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

  function resetProject() {
    setProjectName('Iglesia · Salón 24 × 10 m');
    setSupply('tri');
    setDemandFactor(0.8);
    setReservePercent(25);
    setModulesPerRow(18);
    setCircuits(INITIAL_CIRCUITS);
  }

  const devices = useMemo(() => {
    const mainDevices = [
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
      {
        key: 'diff',
        label: 'ID',
        detail: '30 mA',
        span: supply === 'tri' ? 4 : 2,
        className: 'device-rcd',
      },
    ];
    return [
      ...mainDevices,
      ...circuits.map((circuit, index) => ({
        key: `circuit-${circuit.id}`,
        label: `C${index + 1}`,
        detail: `${circuit.breaker} A`,
        span: circuit.modules,
        className: circuit.kind === 'EMG' ? 'device-emergency' : 'device-circuit',
      })),
    ];
  }, [calculations.mainBreaker, circuits, supply]);

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
          <SingleLineDiagram circuits={circuits} supply={supply} mainBreaker={calculations.mainBreaker} />
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

function SingleLineDiagram({ circuits, supply, mainBreaker }: { circuits: Circuit[]; supply: Supply; mainBreaker: number }) {
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
          <DiagramNode kicker="Protección" title="DPS + ID" detail="30 mA" tone="blue" />
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
