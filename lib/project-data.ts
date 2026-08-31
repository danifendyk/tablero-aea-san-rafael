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

export function readStoredProject(getStorage: () => StorageLike) {
  try {
    const storage = getStorage();
    const current = storage.getItem(STORAGE_KEY);
    const legacy =
      current === null ? storage.getItem(LEGACY_STORAGE_KEY) : null;
    const value = current ?? legacy;
    if (value === null) return { data: null, legacy: false, error: null };
    const data: unknown = JSON.parse(value);
    if (typeof data !== 'object' || data === null || Array.isArray(data))
      throw new Error('Formato inválido');
    return {
      data: data as Record<string, unknown>,
      legacy: current === null,
      error: null,
    };
  } catch {
    // Preserve the original bytes: blocked/corrupt storage must not be deleted or overwritten.
    return {
      data: null,
      legacy: false,
      error:
        'No se pudo leer el guardado local. Los datos existentes no se borraron; podés trabajar y exportar JSON.',
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
