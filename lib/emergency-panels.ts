import type { Panel } from '../app/page.tsx';

/** Move real emergency circuits without changing their electrical data. */
export function separateEmergencyPanels(
  panels: Panel[],
  createId: () => string,
) {
  const tp = panels.find((panel) => panel.type === 'TP');
  if (!tp) throw new Error('Falta el tablero principal.');
  const created: Panel[] = [];
  let movedCircuits = 0;
  const makeEmergencyPanel = (source: Panel, circuits: Panel['circuits']) => ({
    id: createId(),
    name: `TSE · Emergencia de ${source.name}`,
    type: 'TS' as const,
    parentId: tp.id,
    supply: source.supply,
    demandFactor: 1,
    reservePercent: source.reservePercent,
    modulesPerRow: source.modulesPerRow,
    architecture: source.architecture,
    includeDps: false,
    differentialType: source.differentialType,
    emergencyDedicated: true,
    feederDesignPending: true,
    feederLengthM: 0,
    feederConductor: 0,
    feederBreaker: 0,
    feederPhase:
      source.supply === 'tri' ? ('3Φ' as const) : (source.feederPhase ?? 'L1'),
    feederWiring: 'pending' as const,
    feederConduit: '',
    circuits,
  });
  const next = panels.map((source) => {
    const emergency = source.circuits.filter(
      (circuit) => circuit.kind === 'EMG',
    );
    if (
      !emergency.length ||
      (source.type === 'TS' && emergency.length === source.circuits.length)
    )
      return source;
    created.push(makeEmergencyPanel(source, emergency));
    movedCircuits += emergency.length;
    return {
      ...source,
      circuits: source.circuits.filter((circuit) => circuit.kind !== 'EMG'),
    };
  });
  const existing = next.find(
    (panel) =>
      panel.type === 'TS' &&
      ((panel.emergencyDedicated && panel.circuits.length === 0) ||
        (panel.circuits.length > 0 &&
          panel.circuits.every((circuit) => circuit.kind === 'EMG'))),
  );
  if (!created.length && !existing) created.push(makeEmergencyPanel(tp, []));
  return {
    panels: [...next, ...created],
    activePanelId: created[0]?.id ?? existing!.id,
    createdCount: created.length,
    movedCircuits,
  };
}
