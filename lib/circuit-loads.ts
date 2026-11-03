export type MixedLoad = {
  name: string;
  kind: 'lighting' | 'socket';
  points: number;
  unitPower: number;
  unit: 'VA' | 'W';
  powerFactor: number;
};

export type CircuitLoadInput = {
  kind?: string;
  points: number;
  unitVA: number;
  powerFactor?: number;
  mixedLoads?: MixedLoad[];
};

export const MUNICIPAL_CIRCUIT_REFERENCE_URL =
  'https://www.lesikarquitectura.com/wp-content/uploads/2024/07/ORDENANZA-GENERAL-No-72-INSTALACIONES-ELECTRICAS-MENDOZA.pdf#page=21';

export function mixedLoadVA(load: MixedLoad) {
  return (
    (load.points * load.unitPower) / (load.unit === 'W' ? load.powerFactor : 1)
  );
}

/** Arithmetic sum of apparent powers: conservative, not a phasor solution. */
export function circuitApparentPower(circuit: CircuitLoadInput) {
  return circuit.kind === 'MIX'
    ? (circuit.mixedLoads ?? []).reduce(
        (sum, load) => sum + mixedLoadVA(load),
        0,
      )
    : Math.max(0, circuit.points) * Math.max(0, circuit.unitVA);
}

export function circuitActivePower(circuit: CircuitLoadInput) {
  return circuit.kind === 'MIX'
    ? (circuit.mixedLoads ?? []).reduce(
        (sum, load) => sum + mixedLoadVA(load) * load.powerFactor,
        0,
      )
    : circuitApparentPower(circuit) *
        Math.min(1, Math.max(0, circuit.powerFactor ?? 1));
}

export function circuitPointCount(circuit: CircuitLoadInput) {
  return circuit.kind === 'MIX'
    ? (circuit.mixedLoads ?? []).reduce((sum, load) => sum + load.points, 0)
    : circuit.points;
}

export function mixedCircuitFields(mixedLoads: MixedLoad[]) {
  const input = { kind: 'MIX', mixedLoads, points: 0, unitVA: 0 };
  const points = circuitPointCount(input);
  const power = circuitApparentPower(input);
  return {
    mixedLoads,
    points,
    unitVA: points ? power / points : 0,
    powerFactor: power ? circuitActivePower(input) / power : 1,
  };
}

export function circuitLoadDescription(circuit: CircuitLoadInput) {
  return circuit.kind === 'MIX'
    ? (circuit.mixedLoads ?? [])
        .map(
          (load) =>
            `${load.name || (load.kind === 'lighting' ? 'Iluminación' : 'Tomacorrientes')}: ${load.points} × ${load.unitPower} ${load.unit} (FP ${load.powerFactor})`,
        )
        .join(' + ')
    : `${circuit.points} × ${circuit.unitVA} VA`;
}

export function mixedCircuitIssues(
  circuit: CircuitLoadInput & { breaker: number; phase: string },
) {
  if (circuit.kind !== 'MIX') return [];
  const issues: string[] = [];
  if (circuitPointCount(circuit) > 15)
    issues.push('mixto: supera 15 bocas en total (Ord. 72/83, III.2.8.3.3).');
  if (circuit.breaker > 15)
    issues.push('mixto: la protección supera 15 A (Ord. 72/83, III.2.8.3.3).');
  if (circuitApparentPower(circuit) / 220 > 6 + 1e-9)
    issues.push(
      'mixto: la suma de cargas supera 6 A a 220 V, sin aplicar simultaneidad del tablero (Ord. 72/83, III.2.8.3.3).',
    );
  if (circuit.phase === '3Φ')
    issues.push(
      'mixto: el encuadre municipal modelado es monofásico a 220 V; seleccionar L1, L2 o L3.',
    );
  if (
    !circuit.mixedLoads?.some(
      (load) => load.kind === 'lighting' && load.points > 0,
    ) ||
    !circuit.mixedLoads?.some(
      (load) => load.kind === 'socket' && load.points > 0,
    )
  )
    issues.push(
      'mixto: completar al menos una boca de iluminación y una de tomacorrientes, o elegir otro tipo de circuito.',
    );
  return issues;
}
