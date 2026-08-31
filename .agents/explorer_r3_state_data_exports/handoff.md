# AUDIT REPORT: State Persistence, Multi-Panel Hierarchy & Data Export/Import

**Project**: `tablero-aea-san-rafael` (AEA 90364-7-771 / AEA 90364-7-718 / Mendoza Ord. 72/83)  
**Auditor**: Explorer 3 — State Persistence, Multi-Panel Hierarchy & Data Export/Import Auditor  
**Working Directory**: `c:\Users\Fendyk Daniel\Documents\ChatGPT\a\.agents\explorer_r3_state_data_exports`  
**Date**: 2026-08-30  
**Inspection Mode**: STRICTLY READ-ONLY  

---

## 1. Observation

Direct, verbatim inspection of repository files (`app/page.tsx`, `package.json`, `lib/utils.ts`, `hooks/use-mobile.ts`) yielded the following concrete observations:

### 1.1 LocalStorage State Management & Persistence Lifecycle
* **Storage Key**: `STORAGE_KEY = 'tablero-aea-san-rafael:v3'` defined at `app/page.tsx:172`.
* **State Initialization & SSR Hydration**:
  * Default state initialized via React `useState` hooks (`app/page.tsx:701-711`).
  * Hydration safely handled via `useEffect` executing client-side with deferred updates via `queueMicrotask` (`app/page.tsx:723-784`), preventing hydration mismatch errors between server render and client mount.
  * Corrupted JSON caught in `app/page.tsx:780-783`, clearing `STORAGE_KEY` and restoring defaults.
* **Storage Persistence Save Effect**:
  ```ts
  // app/page.tsx:794-807
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
  ```
  * **Observed Defect 1**: No debouncing on `localStorage.setItem`. Every keystroke in inputs (`projectName`, circuit names, points, unitVA, length) triggers immediate synchronous serialization of the entire panel tree.
  * **Observed Defect 2**: No `try / catch` block around `window.localStorage.setItem()`. If `localStorage` throws `QuotaExceededError` (e.g. storage full, iOS Safari private mode) or `SecurityError` (restricted iframe context), the unhandled exception crashes the React application.
* **Project Reset Logic**:
  ```ts
  // app/page.tsx:1758-1766
  function resetProject() {
    setProfile(INITIAL_PROFILE);
    setProjectName('SALÓN · 24 × 10 m');
    setPanels(INITIAL_PANELS);
    setActivePanelId('tp');
    setPrices(DEFAULT_PRICES);
    setOptimizationMessage('');
    window.localStorage.removeItem(STORAGE_KEY);
  }
  ```
  * **Observed Defect 3**: `resetProject()` removes `STORAGE_KEY` (`v3`), but fails to remove the legacy key `tablero-aea-san-rafael:v2`. If a user previously had a v2 installation and clicks "Restablecer", reloading the page re-migrates the old v2 state instead of presenting the clean reset state.

---

### 1.2 Data Sanitization, Coercion & Schema Normalization
* **Type Coercion Helper (`finiteNumber`)**:
  ```ts
  // app/page.tsx:529-532
  function finiteNumber(value: unknown, fallback: number, min = 0, max = Number.POSITIVE_INFINITY) {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  }
  ```
  * **Observed Defect 4**: In JavaScript, `Number(null) === 0`, `Number("") === 0`, and `Number(false) === 0`. Because `Number.isFinite(0)` is `true`, passing `null`, `""`, or `false` into `finiteNumber(val, fallback, min)` evaluates to `0` (or `min`) instead of returning the `fallback` value (e.g. `finiteNumber(null, 10)` returns `0` instead of `10`).
* **Profile Normalization (`normalizeProfile`)**:
  * Lines `app/page.tsx:552-587`: Safely handles missing/corrupted fields for preset, workType, evacuation classes, prospective short circuit, breaking capacity, ground resistance, and checklists with fallbacks to `INITIAL_PROFILE`.
* **Circuit Normalization (`normalizeCircuit`)**:
  * Lines `app/page.tsx:589-622`: Coerces circuit kind to valid enum, validates phases (`L1`, `L2`, `L3`, `3Φ`), snaps breaker ratings to `STANDARD_BREAKERS` (`app/page.tsx:171`), validates conductor against `CONDUCTOR_CAPACITY` table (`app/page.tsx:191-200`), clamps module count to `[1, 8]`.
* **Panel Normalization (`normalizePanels`)**:
  * Lines `app/page.tsx:624-698`: Validates array existence, requires exactly one `TP`, deduplicates panel IDs via `usedIds` Set, assigns fallbacks for feeder conductors and breakers.
  * Lines `app/page.tsx:685-697`: Enforces that if TP is `mono`, all child TS panels are coerced to `mono`, `feederPhase: 'L1'`, and all branch circuits to `L1`.
  * **Observed Limitation 1**: Line 696 hardcodes `parentId: tp.id` for all TS panels, flattening any multi-tier sub-distribution hierarchy into a 1-level star topology.

---

### 1.3 Multi-Panel Hierarchy & Tree Structure
* **Panel Architecture**:
  * Root: `Tablero Principal (TP)` receiving utility supply (Acometida).
  * Children: `Tableros Seccionales (TS1, TS2, ...)` fed from TP via feeder circuits (Líneas Seccionales).
* **Load Aggregation Algorithm (`panelCalculations`)**:
  ```ts
  // app/page.tsx:937-1016
  // Own installed VA:
  const ownInstalledVA = panel.circuits.reduce((total, c) => total + circuitPower(c), 0);
  
  // TP aggregates demand from child TS panels:
  let childDemandVA = 0;
  if (isTP) {
    childPanelsForTP.forEach((child) => {
      const childOwnInstalledVA = child.circuits.reduce((total, c) => total + circuitPower(c), 0);
      childDemandVA += childOwnInstalledVA * child.demandFactor;
    });
  }
  const installedVA = ownInstalledVA + (isTP ? childPanelsForTP.reduce(...) : 0);
  const demandVA = ownInstalledVA * panel.demandFactor + childDemandVA;
  ```
  * **Verification**: TP correctly aggregates total demand while respecting each child panel's distinct demand factor ($f_s$).
* **Phase Balancing & Feeder Phase Mapping**:
  * Single-phase child TS panels: 100% of their calculated simultaneous demand is attributed to their configured `feederPhase` (`L1`, `L2`, or `L3`) on the TP (`app/page.tsx:996-1003`).
  * Three-phase child TS panels: Each circuit's load inside the TS is distributed across L1, L2, L3 according to its own phase assignment, multiplied by the child TS `demandFactor` (`app/page.tsx:1004-1014`).
  * Total `phaseVA.L1 + phaseVA.L2 + phaseVA.L3` on TP matches `demandVA` exactly.
* **Main Breaker Sizing & Selectivity Coordination**:
  ```ts
  // app/page.tsx:1028-1038
  const maxOutgoingBreaker = panel.circuits.reduce((max, c) => Math.max(max, c.breaker), 0);
  const maxFeederBreaker = isTP ? childPanelsForTP.reduce((max, c) => Math.max(max, c.feederBreaker ?? 0), 0) : 0;
  const maxBranchBreaker = Math.max(maxOutgoingBreaker, maxFeederBreaker);
  const currentBasedBreaker = nextBreaker(mainCurrent * 1.15);
  const mainBreaker = Math.max(currentBasedBreaker, maxBranchBreaker || 10);
  ```
  * **Verification**: Upstream IGA rating on TP is constrained to be $\ge \max(\text{all outgoing branch and TS feeder breakers})$ as well as $\ge 1.15 \times I_b$, preventing upstream trip before downstream branch protection.
* **Supply Compatibility & Restrictions**:
  * Single-phase TP feeding three-phase TS: Blocked in `changePanelSupply` (`app/page.tsx:818-823`), disabled in select dropdown (`app/page.tsx:2327`), and sanitized on import/load (`app/page.tsx:687-695`).
  * Three-phase TP feeding single-phase TS: Allowed; requires selection of feeding phase (`L1`, `L2`, or `L3`), which feeds into TP phase balance.
* **Panel Deletion Guard**:
  ```ts
  // app/page.tsx:927-934
  const deletePanel = (id: string) => {
    if (panels.length <= 1) return;
    const remaining = panels.filter((p) => p.id !== id);
    setPanels(remaining);
    if (activePanelId === id) {
      setActivePanelId(remaining[0].id);
    }
  };
  ```
  * **Observed Defect 5**: `deletePanel` does not check if `panel.type === 'TP'`. Although the UI does not render the delete button for TP, programmatic calls or future UI extensions could delete the TP, creating an invalid state without a root panel.

---

### 1.4 Project JSON Export & Import
* **JSON Export (`exportProjectJSON`)**:
  * Lines `app/page.tsx:1769-1789`: Exports full schema payload including `version: '3.0'`, `exportedAt`, `projectName`, `experienceMode`, `profile`, `panels`, `activePanelId`, `prices`.
  * **Roundtrip Fidelity**: All fields from `profile`, `panels`, `circuits`, `prices`, and active panel selection survive a complete Export $\rightarrow$ Import cycle without data loss or unwanted mutation.
* **JSON Import (`importProjectJSON`)**:
  * Lines `app/page.tsx:1792-1827`: Validates root object, executes `normalizePanels`, checks for exactly 1 TP, updates `profile` via `normalizeProfile`, updates `prices` via `normalizePrices`, catches errors and alerts the user with user-friendly error messages without crashing.

---

### 1.5 CSV / Spreadsheet Export
* **CSV Generation Code**:
  ```ts
  // app/page.tsx:1830-1859
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
    ...
  ```
  * **Observed Defect 6 [CRITICAL]**:
    * **Missing UTF-8 BOM (`\uFEFF`)**: In Microsoft Excel for Windows, opening a UTF-8 CSV without BOM causes Spanish accented characters (`Iluminación`, `Seccional`, `Salón`) and mathematical symbols (`ΔU`, `3Φ`, `mm²`) to render as garbled mojibake (`âˆ†U`, `3Î¦`, `mmÂ²`).
    * **Delimiter Incompatibility in Spanish Windows**: The CSV uses comma `,` as separator with period `.` for decimal places. In Argentina (and Spanish locale systems), the default list separator in Windows regional settings is semicolon `;` and decimal separator is comma `,`. Opening this CSV in Excel in Argentina causes all columns to lump into Column A without separating into table columns.
  * **Observed Defect 7**: For TS branch circuits, line 1848 exports only `drop.percent` (local branch circuit drop), omitting the feeder drop ($\Delta U_{sec}$) from the parent TP. In contrast, the on-screen table (`app/page.tsx:2654-2656`) and the print summary (`app/page.tsx:3676`) compute the total voltage drop $\Delta U_{total} = \Delta U_{circuito} + \Delta U_{alim}$.
  * **Observed Defect 8**: Unescaped double quotes in text fields (`"${panel.name}"`, `"${c.name}"`). If a user inputs quotes (e.g. `TUG 2" x 4"`), it produces malformed CSV records.

---

### 1.6 Edge Cases & Numerical Safety
* **Zero Load / Empty Panel**: Formulas are protected against $0/0$ division (`imbalance` checks `averagePhase > 0 ? ... : 0`, conductor uses `Math.max(conductor, 0.1)`).
* **Extreme Loads (>125 A)**: Correctly triggers warning: `"La corriente de cabecera supera el rango de calibres modelado (125 A)"` (`app/page.tsx:1241-1243`).
* **Input NaN / String Coercion**: If inputs are cleared or given non-numeric text, `Number("")` produces `0`, but invalid values could propagate `NaN` into currency/power formatters if not clamped with `Number.isFinite`.

---

## 2. Logic Chain

The step-by-step technical and normative reasoning linking observations to findings:

```
[Observation 1.1: localStorage.setItem runs on every keystroke without debounce or try/catch]
  │
  ├─► Logic 1A: localStorage quota in private mode or full storage throws QuotaExceededError.
  │              Uncaught exception in useEffect unmounts the React component tree (Application Crash).
  │
  └─► Logic 1B: JSON.stringify on every single character input blocks main thread on mobile devices.
                 Debouncing (300-500 ms) is standard best practice for client-side persistence.

[Observation 1.2: finiteNumber coercing null/""/false to 0 via Number(value)]
  │
  └─► Logic 2: In JS: Number(null) === 0, Number("") === 0. Number.isFinite(0) is true.
                When normalizing imported data with null fields (e.g. { points: null }),
                finiteNumber returns 0 instead of template.points (Schema Corruption).

[Observation 1.3: deletePanel('tp') does not check panel.type === 'TP']
  │
  └─► Logic 3: While UI hides the delete button on TP, any programmatic call or script
                deleting TP leaves orphaned TS panels with no root panel (Hierarchy Invalidation).

[Observation 1.5: CSV export uses comma delimiter, dot decimal, and lacks UTF-8 BOM]
  │
  ├─► Logic 5A: Under Argentine / Latin American Windows regional settings, Excel uses ';'
  │              as delimiter and ',' as decimal separator. Comma-separated CSVs fail to split columns.
  │
  ├─► Logic 5B: Excel for Windows requires \uFEFF BOM to interpret UTF-8; otherwise, symbols
  │              such as 'ΔU', '3Φ', 'mm²' and accents are severely corrupted.
  │
  └─► Logic 5C: TS circuits in CSV export only local branch ΔU, diverging from AEA 771 §771.19
                 total drop requirement and from the on-screen table which adds feeder ΔU.
```

---

## 3. Caveats

1. **Multi-Tier Hierarchy**: The current data model and UI architecture support a single-level parent-child hierarchy (`TP -> [TS1, TS2, ...]`). Multi-tier cascading (`TP -> TS1 -> TS1.1`) is deliberately normalized to 1 level.
2. **Third-Party File Readers**: CSV compatibility issues specifically target Microsoft Excel on Windows with regional settings (Argentina/Latin America/Spain). Web-based Google Sheets or modern LibreOffice handle UTF-8 and comma-separated CSVs more flexibly, but Argentine municipal professionals almost universally review spreadsheets in desktop Microsoft Excel.
3. **Investigation Boundary**: No source code was modified or overwritten, adhering strictly to the read-only inspection protocol.

---

## 4. Conclusion & Actionable Findings

### 4.1 Summary of Findings Table

| ID | Title | Domain | Severity | Exact Location in `app/page.tsx` |
|---|---|---|---|---|
| **F-01** | CSV Missing UTF-8 BOM & Semicolon Delimiter for Excel in Argentina | Data Export | **CRITICAL** | Lines 1830–1859 |
| **F-02** | Uncaught `QuotaExceededError` / `SecurityError` in LocalStorage Save Effect | State Persistence | **CRITICAL** | Lines 794–807 |
| **F-03** | Missing Debounce on LocalStorage Save (Keystroke Serialization Lag) | State Persistence | **WARNING** | Lines 794–807 |
| **F-04** | Project Reset Leaves Legacy V2 Key in LocalStorage | State Persistence | **WARNING** | Lines 1758–1766 |
| **F-05** | Type Coercion Bug in `finiteNumber` for `null` and Empty Strings | Schema Normalization | **WARNING** | Lines 529–532 |
| **F-06** | CSV Export Omits Feeder Voltage Drop for TS Circuits | Data Export | **WARNING** | Lines 1847–1848 |
| **F-07** | `deletePanel` Function Lacks Guard for Tablero Principal (TP) | Multi-Panel Hierarchy | **WARNING** | Lines 927–934 |
| **F-08** | CSV Export Missing Double-Quote Escaping for User-Entered Names | Data Export | **WARNING** | Lines 1841, 1848 |
| **F-09** | Phase Optimization Function Omits Balancing of Child TS Feeders | Multi-Panel Hierarchy | **OPTIMIZATION** | Lines 1706–1756 |
| **F-10** | Hardcoded Parent ID Flattening for TS Panels in `normalizePanels` | Schema Normalization | **OPTIMIZATION** | Lines 685–697 |
| **F-11** | Missing UI Action to Export Single Active Panel to CSV | Data Export | **OPTIMIZATION** | Lines 1830, 2025 |

---

### 4.2 Detailed Findings & Recommended Code Fixes

#### Finding F-01 [CRITICAL]: CSV Missing UTF-8 BOM & Semicolon Delimiter for Excel Compatibility
* **Description**: The CSV export is generated with comma `,` delimiters and dot `.` decimals, without the UTF-8 Byte Order Mark (`\uFEFF`). In Argentina and Latin American Windows environments, opening this file in Excel fails to parse columns (all text remains in Column A) and corrupts Spanish characters and electrotechnical symbols (`ΔU`, `3Φ`, `mm²`).
* **Proposed Fix in `app/page.tsx:1830-1859`**:
```ts
function escapeCsv(value: string | number | undefined | null): string {
  const str = String(value ?? '');
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportCircuitsCSV(allPanels = false) {
  const targetPanels = allPanels ? panels : [activePanel];
  const DELIMITER = ';';
  
  const headers = [
    'Tablero',
    'Clase',
    'ID',
    'Nombre',
    'Tipo',
    'Bocas',
    'VA por Boca',
    'Potencia Total [VA]',
    'Fase',
    'Ib [A]',
    'Protección In [A]',
    'Conductor [mm2]',
    'Longitud [m]',
    'Caída Circuito ΔU [%]',
    'Caída Total ΔU [%]',
    'Módulos DIN'
  ];
  
  let csv = headers.join(DELIMITER) + '\r\n';

  targetPanels.forEach((panel) => {
    if (panel.type === 'TP') {
      panels
        .filter((child) => child.type === 'TS' && child.parentId === panel.id)
        .forEach((child, index) => {
          const childCalculation = panelCalculations.get(child.id);
          const row = [
            escapeCsv(panel.name),
            'Alimentador',
            `A${index + 1}`,
            escapeCsv(child.name),
            'TS',
            '',
            '',
            (childCalculation?.demandVA ?? 0).toFixed(0),
            escapeCsv(child.feederPhase ?? (child.supply === 'tri' ? '3Φ' : 'L1')),
            (childCalculation?.mainCurrent ?? 0).toFixed(2).replace('.', ','),
            child.feederBreaker ?? 32,
            child.feederConductor ?? 6,
            child.feederLengthM ?? 15,
            (childCalculation?.feederDrop.percent ?? 0).toFixed(2).replace('.', ','),
            (childCalculation?.feederDrop.percent ?? 0).toFixed(2).replace('.', ','),
            child.supply === 'tri' ? 4 : 2,
          ];
          csv += row.join(DELIMITER) + '\r\n';
        });
    }
    panel.circuits.forEach((c, index) => {
      const power = circuitPower(c);
      const current = circuitCurrent(c, panel.supply);
      const drop = voltageDrop(c, panel.supply);
      const feederDropPercent = panel.type === 'TS' ? (panelCalculations.get(panel.id)?.feederDrop.percent ?? 0) : 0;
      const totalDropPercent = drop.percent + feederDropPercent;
      
      const row = [
        escapeCsv(panel.name),
        'Circuito terminal',
        `C${index + 1}`,
        escapeCsv(c.name),
        c.kind,
        c.points,
        c.unitVA,
        power,
        c.phase,
        current.toFixed(2).replace('.', ','),
        c.breaker,
        c.conductor,
        c.lengthM,
        drop.percent.toFixed(2).replace('.', ','),
        totalDropPercent.toFixed(2).replace('.', ','),
        c.modules,
      ];
      csv += row.join(DELIMITER) + '\r\n';
    });
  });

  // Prepend UTF-8 BOM (\uFEFF) for Excel Windows compatibility
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_cargas.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
```

---

#### Finding F-02 & F-03 [CRITICAL / WARNING]: LocalStorage Error Resilience & Debouncing
* **Description**: `localStorage.setItem` runs synchronously on every keystroke without a debounce timer and without `try/catch`. Quota exceeded or permission errors immediately crash the application.
* **Proposed Fix in `app/page.tsx:794-807`**:
```ts
// Debounced and resilient LocalStorage persistence
useEffect(() => {
  if (!persistenceReady) return;

  const timer = setTimeout(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
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
      }
    } catch (error) {
      console.warn('No se pudo persistir el estado en localStorage:', error);
    }
  }, 400);

  return () => clearTimeout(timer);
}, [activePanelId, experienceMode, panels, persistenceReady, prices, profile, projectName]);
```

---

#### Finding F-04 [WARNING]: Complete Reset Including Legacy V2 Keys
* **Description**: `resetProject()` leaves `'tablero-aea-san-rafael:v2'` in `localStorage`.
* **Proposed Fix in `app/page.tsx:1758-1766`**:
```ts
function resetProject() {
  setProfile(INITIAL_PROFILE);
  setProjectName('SALÓN · 24 × 10 m');
  setPanels(INITIAL_PANELS);
  setActivePanelId('tp');
  setPrices(DEFAULT_PRICES);
  setOptimizationMessage('');
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem('tablero-aea-san-rafael:v2');
  } catch (err) {
    console.warn('Error al limpiar localStorage:', err);
  }
}
```

---

#### Finding F-05 [WARNING]: Robust Number Normalization in `finiteNumber`
* **Description**: `finiteNumber` treats `null`, `""`, and `false` as `0`.
* **Proposed Fix in `app/page.tsx:529-532`**:
```ts
function finiteNumber(value: unknown, fallback: number, min = 0, max = Number.POSITIVE_INFINITY): number {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
    return fallback;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}
```

---

#### Finding F-07 [WARNING]: Root Panel Deletion Guard
* **Description**: `deletePanel` must explicitly forbid deletion of the Tablero Principal.
* **Proposed Fix in `app/page.tsx:927-934`**:
```ts
const deletePanel = (id: string) => {
  const panelToDelete = panels.find((p) => p.id === id);
  if (!panelToDelete || panelToDelete.type === 'TP' || panels.length <= 1) return;
  const remaining = panels.filter((p) => p.id !== id);
  setPanels(remaining);
  if (activePanelId === id) {
    setActivePanelId(remaining[0].id);
  }
};
```

---

#### Finding F-09 [OPTIMIZATION]: Phase Balancing on TP Including Single-Phase TS Feeders
* **Description**: When `optimizeProject()` runs on a three-phase TP, single-phase child TS feeders currently remain pinned to their initial `feederPhase` (often all on L1).
* **Proposed Improvement in `optimizeProject` (`app/page.tsx:1706-1756`)**:
  * Include child single-phase TS feeder loads in the bin-packing optimization queue alongside TP single-phase branch circuits to achieve a globally balanced 3-phase load distribution.

---

## 5. Verification Method

To independently verify all findings and validate future implementations, follow these concrete procedures:

### 5.1 Verification Commands & Checks
1. **Lint & Typecheck**:
   ```powershell
   npx oxlint
   npx tsc --noEmit
   ```
2. **Build Validation**:
   ```powershell
   npm run build
   ```

### 5.2 Test Scenarios & Invalidation Conditions

| Test ID | Objective | Procedure | Expected Pass Result | Invalidation Condition |
|---|---|---|---|---|
| **V-01** | Verify CSV Excel Compatibility | Click "CSV proyecto", open the downloaded `.csv` in Microsoft Excel on Windows (Spanish regional settings). | Columns automatically separate into distinct columns; accents and symbols (`ΔU`, `3Φ`, `mm²`) render cleanly with no mojibake. | If text stays lumped in Column A or symbols render as `âˆ†U`, fix is invalid. |
| **V-02** | Verify Total Voltage Drop in CSV | Add TS1 with 15 m feeder (6 mm²) and a 20 m branch circuit. Export CSV. | CSV contains both branch $\Delta U$ and total accumulated $\Delta U$ ($\Delta U_{branch} + \Delta U_{feeder}$). | If TS circuit row only shows local branch $\Delta U$, fix is invalid. |
| **V-03** | Verify Reset Purity | Inject `'tablero-aea-san-rafael:v2'` into `localStorage` via DevTools. Click "Restablecer" and reload page. | App loads clean `INITIAL_PROFILE` and `INITIAL_PANELS` without restoring legacy v2 state. | If old v2 circuits resurrect after refresh, fix is invalid. |
| **V-04** | Verify JSON Export/Import Fidelity | Configure custom 2-panel project with custom prices and circuits. Export JSON. Clear storage, import JSON. | All circuits, phases, breakers, prices, and active panel state match 100% identically with zero mutation. | Any field resetting to default indicates normalization schema mismatch. |
| **V-05** | Verify Storage Quota Resilience | Mock `window.localStorage.setItem` to throw `QuotaExceededError`. Edit project name. | Application continues running smoothly with console warning; no React unmount/crash. | If React white-screens or unmounts, fix is invalid. |
| **V-06** | Verify `finiteNumber(null)` | Test `finiteNumber(null, 10)` in DevTools console or unit test. | Returns `10` (the fallback). | If it returns `0`, type coercion bug is still present. |
| **V-07** | Verify TP Protected from Deletion | Execute `deletePanel('tp')` from console or component state. | `panels` array retains `TP` unmodified. | If `TP` is removed, fix is invalid. |

---
**Report Status**: Complete, Comprehensive, Self-Contained.
