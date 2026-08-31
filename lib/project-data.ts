export function finiteNumber(
  value: unknown,
  fallback: number,
  min = 0,
  max = Number.POSITIVE_INFINITY,
) {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'string' && !value.trim())
  )
    return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(max, Math.max(min, parsed))
    : fallback;
}

export const STORAGE_KEY = 'tablero-aea-san-rafael:v3';
export const LEGACY_STORAGE_KEY = 'tablero-aea-san-rafael:v2';
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type ProjectStorageSnapshot = {
  current: string | null;
  legacy: string | null;
};

function storageSnapshot(storage: StorageLike): ProjectStorageSnapshot {
  const current = storage.getItem(STORAGE_KEY);
  return {
    current,
    legacy: current === null ? storage.getItem(LEGACY_STORAGE_KEY) : null,
  };
}

export function readStoredProject(getStorage: () => StorageLike) {
  try {
    const storage = getStorage();
    const snapshot = storageSnapshot(storage);
    const { current, legacy } = snapshot;
    const value = current ?? legacy;
    if (value === null)
      return { data: null, legacy: false, error: null, snapshot };
    const data: unknown = JSON.parse(value);
    if (typeof data !== 'object' || data === null || Array.isArray(data))
      throw new Error('Formato inválido');
    return {
      data: data as Record<string, unknown>,
      legacy: current === null,
      error: null,
      snapshot,
    };
  } catch {
    // Preserve the original bytes: blocked/corrupt storage must not be deleted or overwritten.
    return {
      data: null,
      legacy: false,
      snapshot: null,
      error:
        'No se pudo leer el guardado local. Los datos existentes no se borraron; podés trabajar y exportar JSON.',
    };
  }
}

export type ProjectSaveResult =
  | { ok: true; snapshot: ProjectStorageSnapshot }
  | { ok: false; kind: 'conflict' | 'storage'; error: string };

/**
 * Refuse to replace bytes changed since the caller last read or saved them.
 * This is an optimistic comparison, not an atomic transaction across processes;
 * localStorage does not provide a transactional compare-and-set primitive.
 */
export function saveStoredProjectIfUnchanged(
  getStorage: () => StorageLike,
  data: unknown,
  expectedSnapshot: ProjectStorageSnapshot | null,
): ProjectSaveResult {
  if (expectedSnapshot === null)
    return {
      ok: false,
      kind: 'storage',
      error:
        'No hay una lectura válida del guardado. Recargá el proyecto guardado o exportá el JSON antes de restablecer.',
    };
  try {
    const serialized = JSON.stringify(data);
    if (typeof serialized !== 'string') throw new Error('Proyecto inválido');
    const storage = getStorage();
    const actual = storageSnapshot(storage);
    if (
      actual.current !== expectedSnapshot.current ||
      actual.legacy !== expectedSnapshot.legacy
    )
      return {
        ok: false,
        kind: 'conflict',
        error:
          'El guardado cambió en otra pestaña. No se sobrescribió: exportá tu trabajo actual o recargá el proyecto guardado.',
      };
    if (actual.current !== serialized) storage.setItem(STORAGE_KEY, serialized);
    return { ok: true, snapshot: { current: serialized, legacy: null } };
  } catch {
    return {
      ok: false,
      kind: 'storage',
      error:
        'No se pudo guardar en este navegador. El proyecto sigue en memoria: exportá el JSON antes de cerrar.',
    };
  }
}

export function saveStoredProject(
  getStorage: () => StorageLike,
  data: unknown,
) {
  try {
    getStorage().setItem(STORAGE_KEY, JSON.stringify(data));
    return null;
  } catch {
    return 'No se pudo guardar en este navegador. El proyecto sigue en memoria: exportá el JSON antes de cerrar.';
  }
}

export function resetStoredProject(
  getStorage: () => StorageLike,
  initialData: unknown,
) {
  try {
    const storage = getStorage();
    // Write the current key FIRST so failure to delete legacy cannot resurrect it.
    storage.setItem(STORAGE_KEY, JSON.stringify(initialData));
    try {
      storage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* v3 shadows legacy */
    }
    return null;
  } catch {
    return 'Se restableció solo en memoria. El navegador impidió actualizar el guardado; al recargar podría recuperar el proyecto anterior.';
  }
}

export function canDeletePanel(
  panels: { id: string; type: string }[],
  id: string,
) {
  return (
    panels.length > 1 &&
    panels.some((panel) => panel.id === id && panel.type === 'TS')
  );
}

export function highlightedCircuit(
  hovered: number | null,
  selected: number | null,
) {
  return hovered ?? selected;
}

function isSafeId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export function safeCircuitId(value: unknown, fallback = 1): number {
  const parsed =
    typeof value === 'string' && value.trim() ? Number(value) : value;
  return isSafeId(parsed) ? parsed : isSafeId(fallback) ? fallback : 1;
}

/** Prefer an increasing ID, falling back to a free positive integer at the limit. */
export function nextCircuitId(ids: Iterable<number>): number {
  const used = new Set<number>();
  let largest = 0;
  for (const id of ids) {
    if (!isSafeId(id)) continue;
    used.add(id);
    largest = Math.max(largest, id);
  }
  if (largest < Number.MAX_SAFE_INTEGER) return largest + 1;
  // The first free positive ID is at most used.size + 1, so this cannot run
  // toward MAX_SAFE_INTEGER or get stuck incrementing an unsafe float.
  let candidate = 1;
  while (used.has(candidate)) candidate += 1;
  return candidate;
}

/** Keep every circuit and every first valid ID; only repaired rows are cloned. */
export function normalizeCircuitIds<T extends { id: number }>(
  circuits: T[],
): T[] {
  const reserved = new Set(
    circuits.map((circuit) => circuit.id).filter(isSafeId),
  );
  const seen = new Set<number>();
  let available = nextCircuitId(reserved);
  return circuits.map((circuit) => {
    if (isSafeId(circuit.id) && !seen.has(circuit.id)) {
      seen.add(circuit.id);
      return circuit;
    }
    const id = available;
    reserved.add(id);
    seen.add(id);
    do {
      available = available < Number.MAX_SAFE_INTEGER ? available + 1 : 1;
    } while (reserved.has(available));
    return { ...circuit, id };
  });
}

export function nextSectionalPanelNumber(panels: { name: string }[]): number {
  const numbers: number[] = [];
  for (const panel of panels) {
    const match = /^\s*TS\s*(\d+)(?=\s|[·:()—–-]|$)/i.exec(panel.name);
    if (!match) continue;
    const number = Number(match[1]);
    if (isSafeId(number)) numbers.push(number);
  }
  return nextCircuitId(numbers);
}
