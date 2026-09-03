type CircuitShape = {
  id: number;
  name: string;
  kind: string;
  phase: string;
  modules: number;
  breaker: number;
};
type PanelShape = {
  id: string;
  name: string;
  type: string;
  supply: string;
  architecture: string;
  includeDps?: boolean;
  differentialType?: string;
  tpDifferentialMode?: string;
  feederBreaker?: number;
  feederPhase?: string;
  feederWiring?: string;
  circuits: CircuitShape[];
};
export type DinDevice = {
  key: string;
  label: string;
  fullName: string;
  detail: string;
  span: number;
  className: string;
  circuitId?: number;
};

// Width assumptions for the selected 2P / 4P architecture, not a claim that all
// manufacturers or every three-phase application have the same width.
export function circuitModuleSpan(circuit: {
  phase: string;
  modules?: number;
}) {
  const minimum = circuit.phase === '3Φ' ? 4 : 2;
  const requested = Number.isFinite(circuit.modules)
    ? Math.ceil(circuit.modules!)
    : minimum;
  return Math.max(minimum, Math.min(8, requested));
}

export const ARCHITECTURE_OPTIONS = [
  {
    id: 'essential',
    title: 'Económica · Salón',
    nominalCount: 2,
    subtitle: 'ID normal + ID EMG independiente',
    behavior:
      'Una fuga que dispare el ID normal corta luces y tomas juntas; EMG queda en otro diferencial.',
  },
  {
    id: 'balanced',
    title: 'Equilibrada · Continuidad en salón',
    nominalCount: 3,
    subtitle: 'ID A iluminación · ID B tomas/equipos · ID EMG',
    behavior:
      'El disparo exclusivo de ID B no corta la iluminación de ID A. No garantiza continuidad si dispara una protección común aguas arriba.',
  },
  {
    id: 'residential',
    title: 'Esencial domiciliaria',
    nominalCount: 1,
    subtitle: 'Un ID general para todos los circuitos',
    behavior:
      'Una fuga que dispare el ID general corta todos los circuitos del tablero, incluida EMG si existe.',
  },
] as const;

export const LEGACY_ARCHITECTURE = {
  id: 'continuity',
  title: 'Legado · ID por circuito',
  nominalCount: null,
  subtitle: 'Proyecto anterior conservado',
  behavior:
    'Cada salida tiene su ID. La continuidad sigue sujeta a coordinación con las protecciones aguas arriba.',
} as const;

export function architectureDetails(id: string) {
  return id === 'continuity'
    ? LEGACY_ARCHITECTURE
    : (ARCHITECTURE_OPTIONS.find((option) => option.id === id) ??
        ARCHITECTURE_OPTIONS[1]);
}

export function differentialGroups(panel: PanelShape) {
  const groups: {
    key: string;
    label: string;
    circuits: CircuitShape[];
    span: number;
    emergency: boolean;
  }[] = [];
  const span = panel.supply === 'tri' ? 4 : 2;
  // A transit-only TP has no local final circuits to assign to these RCDs.
  if (!panel.circuits.length) return groups;
  if (panel.architecture === 'residential')
    return [
      {
        key: 'id-general',
        label: 'ID general',
        circuits: [...panel.circuits],
        span,
        emergency: false,
      },
    ];
  if (panel.architecture === 'continuity') {
    return panel.circuits.map((circuit, index) => ({
      key: `id-${circuit.id}`,
      label: `ID C${index + 1}`,
      circuits: [circuit],
      span: circuit.phase === '3Φ' ? 4 : 2,
      emergency: circuit.kind === 'EMG',
    }));
  }
  const normal = panel.circuits.filter((circuit) => circuit.kind !== 'EMG');
  if (panel.architecture === 'balanced') {
    groups.push({
      key: 'ID A',
      label: 'ID A',
      circuits: normal.filter((circuit) => circuit.kind === 'IUG'),
      span,
      emergency: false,
    });
    groups.push({
      key: 'ID B',
      label: 'ID B',
      circuits: normal.filter((circuit) => circuit.kind !== 'IUG'),
      span,
      emergency: false,
    });
  } else
    groups.push({
      key: 'id-general',
      label: 'ID normal',
      circuits: normal,
      span,
      emergency: false,
    });
  const emergency = panel.circuits.filter((circuit) => circuit.kind === 'EMG');
  groups.push({
    key: 'id-emg',
    label: 'ID EMG',
    circuits: emergency,
    span,
    emergency: true,
  });
  return groups;
}

export function differentialLabel(panel: PanelShape, circuitId: number) {
  return (
    differentialGroups(panel).find((group) =>
      group.circuits.some((circuit) => circuit.id === circuitId),
    )?.label ?? 'Sin ID'
  );
}

export function tpDifferentialDevice(panel: PanelShape): DinDevice | null {
  if (panel.type !== 'TP' || panel.tpDifferentialMode === 'none') return null;
  const span = panel.supply === 'tri' ? 4 : 2;
  if (panel.tpDifferentialMode === 'selective300')
    return {
      key: 'id-selective-tp',
      label: 'ID-S',
      fullName: 'Interruptor diferencial general selectivo del TP',
      detail: '300 mA · tipo S',
      span,
      className: 'device-rcd-selective',
    };
  if (panel.tpDifferentialMode === 'instant30')
    return {
      key: 'id-general-tp',
      label: 'ID-G',
      fullName: 'Interruptor diferencial general instantáneo del TP',
      detail: '30 mA · no selectivo',
      span,
      className: 'device-rcd',
    };
  return null;
}

export function buildPanelDevices(
  panel: PanelShape,
  children: PanelShape[],
  mainBreaker: number | null,
): DinDevice[] {
  const span = panel.supply === 'tri' ? 4 : 2;
  const devices: DinDevice[] = [
    {
      key: 'cabecera',
      label: panel.type === 'TP' ? 'IGA' : 'CORTE',
      fullName:
        panel.type === 'TP'
          ? 'Interruptor General Automático'
          : 'Interruptor-seccionador de corte local · sin disparo por sobrecorriente',
      detail: mainBreaker === null ? 'Sin dimensionar' : `${mainBreaker} A`,
      span,
      className: 'device-main',
    },
  ];
  const tpDifferential = tpDifferentialDevice(panel);
  if (tpDifferential) devices.push(tpDifferential);
  if (panel.includeDps ?? panel.type === 'TP')
    devices.push({
      key: 'spd',
      label: 'DPS',
      fullName: 'Protección contra sobretensiones',
      detail: panel.supply === 'tri' ? '3P+N' : '1P+N',
      span,
      className: 'device-spd',
    });
  for (const child of children)
    devices.push({
      key: `feeder-${child.id}`,
      label: `Alim. ${child.name}`,
      fullName: `Alimentador a ${child.name}`,
      detail: `${child.feederBreaker ?? 32} A · ${child.supply === 'tri' ? '4P' : `2P ${child.feederPhase ?? 'L1'}`}`,
      span: child.supply === 'tri' ? 4 : 2,
      className: 'device-feeder',
    });
  // Keep every differential physically separate from its MCB, avoiding combined
  // fictitious devices which could be too wide to fit a rail.
  for (const group of differentialGroups(panel)) {
    devices.push({
      key: group.key,
      label: group.label,
      fullName: `Interruptor diferencial${group.circuits.length ? '' : ' · reservado sin circuitos'}`,
      detail: `30 mA · ${panel.differentialType === 'AC' ? 'AC' : 'A'}${group.circuits.length ? '' : ' · reserva'}`,
      span: group.span,
      className: 'device-rcd',
    });
    for (const circuit of group.circuits) {
      const index = panel.circuits.findIndex((item) => item.id === circuit.id);
      devices.push({
        key: `circuit-${circuit.id}`,
        circuitId: circuit.id,
        label: `C${index + 1}`,
        fullName: `Térmica · ${circuit.kind}`,
        detail: `${circuit.breaker} A`,
        span: circuitModuleSpan(circuit),
        className:
          circuit.kind === 'EMG' ? 'device-emergency' : 'device-circuit',
      });
    }
  }
  return devices;
}

export function layoutDin<T extends { span: number }>(
  devices: T[],
  modulesPerRow: number,
  reservePercent: number,
) {
  const width = Math.max(8, Math.floor(modulesPerRow));
  const reserve = Math.min(
    80,
    Math.max(20, Number.isFinite(reservePercent) ? reservePercent : 25),
  );
  let cursor = 0;
  let occupiedModules = 0;
  const placements = devices.map((device) => {
    if (
      !Number.isInteger(device.span) ||
      device.span < 1 ||
      device.span > width
    )
      throw new Error('El dispositivo no cabe en el riel seleccionado.');
    const remaining = width - (cursor % width);
    if (device.span > remaining) cursor += remaining;
    const start = cursor;
    cursor += device.span;
    occupiedModules += device.span;
    return { device, start };
  });
  const recommendedModules = Math.max(
    occupiedModules + 2,
    Math.ceil(occupiedModules / (1 - reserve / 100)),
  );
  const rows = Math.max(
    1,
    Math.ceil(Math.max(cursor, recommendedModules) / width),
  );
  const cabinetModules = rows * width;
  return {
    placements,
    rows,
    occupiedModules,
    recommendedModules,
    cabinetModules,
    freeModules: cabinetModules - occupiedModules,
    reservePercent: reserve,
    packingGaps: cursor - occupiedModules,
  };
}

export function protectiveConductorSection(activeSection: number) {
  return Math.max(2.5, activeSection);
}

export const PHASE_CONDUCTOR_COLORS = {
  L1: '#8b4513',
  L2: '#171717',
  L3: '#dc2626',
};
