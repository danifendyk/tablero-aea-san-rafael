type ProjectRecord = Record<string, unknown>;

export type ProjectStructureResult =
  | { ok: true; data: ProjectRecord }
  | { ok: false; error: string };

const architectures = ['essential', 'balanced', 'residential', 'continuity'];
const phases = ['L1', 'L2', 'L3', '3Φ'];

function record(value: unknown, path: string): ProjectRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error(`${path}: se esperaba un objeto`);
  return value as ProjectRecord;
}

function field(
  value: ProjectRecord,
  key: string,
  path: string,
  accepts: (entry: unknown) => boolean,
  required = false,
) {
  if (value[key] === undefined && !required) return;
  if (!accepts(value[key]))
    throw new Error(`${path}.${key}: dato inválido o ausente`);
}

const text = (value: unknown) => typeof value === 'string';
const boolean = (value: unknown) => typeof value === 'boolean';
const numeric = (value: unknown) =>
  (typeof value === 'number' ||
    (typeof value === 'string' && value.trim().length > 0)) &&
  Number.isFinite(Number(value));
const nonnegative = (value: unknown) => numeric(value) && Number(value) >= 0;
const positive = (value: unknown) => numeric(value) && Number(value) > 0;
const oneOf = (values: readonly unknown[]) => (value: unknown) =>
  values.includes(value);

function ampacity(value: unknown, path: string) {
  const raw = record(value, path);
  field(raw, 'mode', path, oneOf(['reference', 'declared']));
  field(raw, 'ambientC', path, numeric);
  field(raw, 'groupedCircuits', path, positive);
  field(raw, 'conductorTemperatureC', path, numeric);
  field(raw, 'declaredA', path, nonnegative);
  field(raw, 'basis', path, text);
}

function circuit(value: unknown, path: string, legacy: boolean) {
  const raw = record(value, path);
  // IDs are identifiers, not electrical inputs: unsafe/duplicate numeric IDs
  // can be regenerated afterwards without discarding or inventing a circuit.
  field(raw, 'id', path, numeric, true);
  field(raw, 'name', path, text, true);
  field(raw, 'kind', path, oneOf(['IUG', 'TUG', 'TUE', 'EMG', 'FM']), true);
  field(raw, 'phase', path, oneOf(phases), true);
  for (const key of ['points', 'unitVA', 'lengthM'])
    field(raw, key, path, nonnegative, true);
  for (const key of ['powerFactor', 'breaker', 'conductor'])
    field(raw, key, path, positive, true);
  field(raw, 'modules', path, positive, !legacy);
  field(raw, 'conduit', path, text);
  if (raw.ampacity !== undefined) ampacity(raw.ampacity, `${path}.ampacity`);
}

function circuits(value: unknown, path: string, legacy: boolean) {
  if (!Array.isArray(value))
    throw new Error(`${path}: se esperaba una lista de circuitos`);
  // A genuinely empty array is valid for a transit TP; absent/damaged data is not.
  value.forEach((item, index) => circuit(item, `${path}[${index}]`, legacy));
}

function panel(value: unknown, path: string) {
  const raw = record(value, path);
  field(
    raw,
    'id',
    path,
    (entry) => text(entry) && String(entry).trim().length > 0,
    true,
  );
  field(raw, 'name', path, text, true);
  field(raw, 'type', path, oneOf(['TP', 'TS']), true);
  field(raw, 'supply', path, oneOf(['mono', 'tri']), true);
  field(raw, 'demandFactor', path, nonnegative, true);
  field(raw, 'reservePercent', path, nonnegative, true);
  field(raw, 'modulesPerRow', path, positive, true);
  field(raw, 'architecture', path, oneOf(architectures), true);
  field(raw, 'parentId', path, (entry) => entry === null || text(entry));
  field(raw, 'includeDps', path, boolean);
  field(raw, 'differentialType', path, oneOf(['AC', 'A']));
  for (const key of ['feederLengthM', 'feederConductor', 'feederBreaker'])
    field(raw, key, path, positive);
  field(raw, 'feederPhase', path, oneOf(phases));
  field(raw, 'feederConduit', path, text);
  if (raw.feederAmpacity !== undefined)
    ampacity(raw.feederAmpacity, `${path}.feederAmpacity`);
  circuits(raw.circuits, `${path}.circuits`, false);
  return raw;
}

function profile(value: unknown) {
  const path = 'proyecto.profile';
  const raw = record(value, path);
  field(
    raw,
    'preset',
    path,
    oneOf(['hall', 'commercial', 'residential', 'custom']),
  );
  field(raw, 'workType', path, oneOf(['new', 'remodel', 'survey']));
  field(raw, 'evacuation', path, oneOf(['BD1', 'BD2', 'BD3', 'BD4']));
  field(raw, 'planScale', path, oneOf(['1:50', '1:100']));
  for (const key of ['widthM', 'lengthM', 'occupancy'])
    field(raw, key, path, positive);
  for (const key of [
    'prospectiveShortCircuitKa',
    'breakingCapacityKa',
    'groundResistanceOhm',
    'emergencyAutonomyHours',
  ])
    field(raw, key, path, nonnegative);
  for (const key of [
    'descriptiveMemoryReady',
    'registeredProfessionalReady',
    'siteTestReady',
  ])
    field(raw, key, path, boolean);
  field(raw, 'emergencyEvidence', path, text);
}

/**
 * Validate a complete saved/exported project before invoking lenient normalizers.
 * Versionless v3 browser drafts are supported. Older single-panel v2 data is
 * accepted only when the caller explicitly selects the legacy migration path.
 * This function never repairs, filters, normalizes, or mutates the input.
 */
export function validateProjectStructure(
  value: unknown,
  options: { legacy?: boolean } = {},
): ProjectStructureResult {
  try {
    const raw = record(value, 'proyecto');
    const legacy = options.legacy === true;
    const supportedVersions = legacy ? [2, '2', '2.0'] : [3, '3', '3.0'];
    field(raw, 'version', 'proyecto', oneOf(supportedVersions));
    field(raw, 'projectName', 'proyecto', text);
    field(raw, 'activePanelId', 'proyecto', text);
    field(raw, 'experienceMode', 'proyecto', oneOf(['guided', 'technical']));
    if (raw.profile !== undefined) profile(raw.profile);
    if (raw.prices !== undefined) {
      const prices = record(raw.prices, 'proyecto.prices');
      for (const [key, price] of Object.entries(prices))
        if (!nonnegative(price))
          throw new Error(`proyecto.prices.${key}: precio inválido`);
    }
    if (legacy) {
      if (raw.panels !== undefined)
        throw new Error(
          'La migración v2 requiere un proyecto de un solo tablero',
        );
      field(raw, 'supply', 'proyecto', oneOf(['mono', 'tri']), true);
      for (const key of ['demandFactor', 'reservePercent'])
        field(raw, key, 'proyecto', nonnegative);
      field(raw, 'modulesPerRow', 'proyecto', positive);
      field(raw, 'architecture', 'proyecto', oneOf(architectures));
      circuits(raw.circuits, 'proyecto.circuits', true);
    } else {
      if (!Array.isArray(raw.panels) || raw.panels.length === 0)
        throw new Error('proyecto.panels: se esperaba al menos un tablero');
      const panels = raw.panels.map((entry, index) =>
        panel(entry, `proyecto.panels[${index}]`),
      );
      const roots = panels.filter((entry) => entry.type === 'TP');
      if (roots.length !== 1) throw new Error('Debe existir exactamente un TP');
      const ids = new Set<string>();
      for (const entry of panels) {
        const id = String(entry.id).trim();
        if (ids.has(id))
          throw new Error(`Identificador de tablero duplicado: ${id}`);
        ids.add(id);
        if (
          entry.type === 'TS' &&
          typeof entry.parentId === 'string' &&
          entry.parentId.trim() !== String(roots[0].id).trim()
        )
          throw new Error(`El tablero ${id} no depende del TP del proyecto`);
      }
    }
    return { ok: true, data: raw };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : 'Formato de proyecto inválido',
    };
  }
}
