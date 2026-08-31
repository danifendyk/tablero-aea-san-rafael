# Track 2 Audit Report: UI/UX, Single-Line & Multi-Line Diagrams, Modular DIN Math, Interactivity & Budgeting

**Auditor Role**: UI/UX, Diagram & Modular DIN Math Auditor (`explorer_r2_ui_diagrams_din`)  
**Repository Working Directory**: `c:\Users\Fendyk Daniel\Documents\ChatGPT\a`  
**Primary Source File Audited**: `app/page.tsx`, `app/globals.css`, `documentos_normativos/`  
**Date**: 2026-08-30  
**Standards Evaluated**: AEA 90364-7-771 (Viviendas, Comercios y Oficinas), AEA 90364-7-718 (Lugares de Pública Concurrencia), IRAM NM 247-3 / IRAM 2178, Ordenanza General 72/83 de Mendoza (San Rafael).

---

## Executive Summary

An exhaustive read-only inspection of `app/page.tsx` and related UI/rendering components revealed 12 distinct findings across the five audited domains:
1. **Modular DIN Math**: 1 Critical defect (3-phase circuits default to 2 modules instead of 4 modules, underestimating physical panel size), 1 Warning (reserve space math yields 16.67% of total cabinet capacity instead of AEA mandated $\ge 20\%$, and lacks 2-module minimum enforcement), 1 Warning (visual slot truncation in `PanelFront` on row-break padding), and 1 Optimization (cabinet catalog granularity mismatch).
2. **Single-Line Diagram (`SingleLineDiagram`)**: 1 Critical defect (Arithmetic mismatch in TS feeder voltage drop formula card between text substitution and computed result), 1 Warning (hardcoded `mr-[75px]` connector and grid row-wrapping busbar rendering artifacts for $>6$ circuits), and 1 Optimization (missing conductor layout, curve, and conduit annotation).
3. **Multi-Line Diagram (`MultiLineDiagram`)**: 1 Critical defect (PE conductor section for lighting circuits shown as $1.5\text{ mm}^2$, directly violating AEA 771 minimum PE of $2.5\text{ mm}^2$), 1 Warning (color coding uses solid amber for all active phases instead of IRAM standard Brown/Black/Red), and 1 Optimization (tabular conductor schedule rather than topological wiring schematic).
4. **Bi-directional Interactivity**: 1 Warning (`MultiLineDiagram` completely disconnected from the 3-way highlighting bus), 1 Warning (selection click locks out hover feedback), and 1 Optimization (differential switches and TS feeders not mapped to circuit highlights).
5. **Catalog Price & Budget Calculation**: 1 Warning (`PriceInput` lacks real-time sanitization, allowing `NaN` and negative numbers into project cost state), and 1 Optimization (BOM lacks feeder interconnecting cables, grounding accessories, and distribution comb bars).
6. **Print & Document Generation**: 1 Warning (parent container has `print:hidden`, suppressing all visual diagrams despite children having `print:break-before-page`).

---

## 1. Observation

### 1.1. Modular DIN Rail Math & Enclosure Physics

- **Obs 1.1.1 (3-Phase Circuit Module Size Inconsistency)**:
  - In `app/page.tsx:620`:
    ```ts
    modules: Math.max(1, Math.round(finiteNumber(raw.modules, template.modules, 1, 8)))
    ```
  - In `app/page.tsx:262-322` (`TEMPLATES`), all templates (`IUG`, `TUG`, `TUE`, `EMG`, `FM`) specify `modules: 2`.
  - In `app/page.tsx:2731-2734`, selecting `3Φ` in the phase selector calls `updateCircuit(circuit.id, 'phase', '3Φ')` but does NOT update `circuit.modules`.
  - In `app/page.tsx:442` (`architectureOccupiedModules`):
    ```ts
    const circuitModules = circuits.reduce((total, circuit) => total + circuit.modules, 0);
    ```
  - In `app/page.tsx:1954-1960` (`devices`):
    ```ts
    span: circuit.modules + (activePanel.architecture === 'continuity' ? (circuit.phase === '3Φ' ? 4 : 2) : 0)
    ```
    *Finding*: A 3-phase circuit breaker is physically 3P ($3\times 18\text{ mm} = 54\text{ mm} = 3\text{ M}$) or 4P ($4\times 18\text{ mm} = 72\text{ mm} = 4\text{ M}$). Because `circuit.modules` remains `2`, the modular math under-allocates 2 modules per 3-phase circuit.

- **Obs 1.1.2 (Reserve Space Math vs AEA 90364-7-771.18.2)**:
  - In `app/page.tsx:1054-1058`:
    ```ts
    const recommendedModules = Math.ceil(occupiedModules * (1 + panel.reservePercent / 100));
    const rows = Math.max(1, Math.ceil(recommendedModules / panel.modulesPerRow));
    const cabinetModules = rows * panel.modulesPerRow;
    ```
  - Example: `occupiedModules = 15`, `reservePercent = 20`, `modulesPerRow = 18`.
    $\text{recommendedModules} = \lceil 15 \times 1.20 \rceil = 18$.
    $\text{rows} = \lceil 18 / 18 \rceil = 1$.
    $\text{cabinetModules} = 18$.
    Free modules in cabinet $= 18 - 15 = 3\text{ M}$.
    Actual reserve of panel capacity $= 3 / 18 = 16.67\%$.
    *Finding*: AEA 771.18.2 specifies $\ge 20\%$ reserve of the total panel capacity or minimum 2 free modules. Applying $1 + r/100$ to occupied modules produces only $16.67\%$ free space in the resulting enclosure. Moreover, if a user enters `reservePercent = 0`, no minimum 2-module floor is enforced.

- **Obs 1.1.3 (Row-Breaking Slot Cursor Truncation)**:
  - In `app/page.tsx:4223-4238` (`PanelFront`):
    ```ts
    const slots = Array.from({ length: rows * modulesPerRow }, () => ({}));
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
    ```
    *Finding*: When devices cannot fit in the remaining space of a row, `cursor += remainingOnRow` leaves those slots empty and jumps to the next row. If the cumulative skipped padding exceeds the free modules in `slots.length`, subsequent devices hit `cursor >= slots.length` and are silently truncated from the visual DIN view.

- **Obs 1.1.4 (Cabinet Catalog Sizing Disconnect)**:
  - In `app/page.tsx:425-432` (`cabinetFor`):
    ```ts
    function cabinetFor(modules: number, prices: PriceCatalog) {
      if (modules <= 16) return { label: '16 M', value: prices.cabinet16 };
      if (modules <= 36) return { label: '36 M', value: prices.cabinet36 };
      if (modules <= 54) return { label: '54 M', value: prices.cabinet54 };
      if (modules <= 72) return { label: '72 M', value: prices.cabinet72 };
      const cabinets = Math.ceil(modules / 72);
      return { label: `${cabinets} × 72 M`, value: cabinets * prices.cabinet72 };
    }
    ```
  - In `app/page.tsx:661, 2515`, standard `modulesPerRow` options are `12, 18, 24`.
    *Finding*: An 18-module 1-row panel exceeds `cabinet16` and jumps directly to a 36-module cabinet costing $83,000, because there are no 18M or 24M tiers in the price catalog.

---

### 1.2. Single-Line Diagram (`SingleLineDiagram`)

- **Obs 1.2.1 (Feeder Voltage Drop FormulaCard Arithmetic Discrepancy)**:
  - In `app/page.tsx:485` (`feederVoltageDrop`):
    ```ts
    const threePhase = supply === 'tri';
    const volts = (threePhase ? Math.sqrt(3) : 2) * Math.max(0, lengthM) * current * COPPER_RESISTIVITY / Math.max(conductor, 0.1);
    return { volts, percent: (volts / (threePhase ? 380 : 220)) * 100 };
    ```
  - In `app/page.tsx:3210-3216` (`FormulaCard` for `Caída del alimentador`):
    ```tsx
    formula={
      activePanel.supply === 'tri' && activePanel.circuits.every((circuit) => circuit.phase === '3Φ')
        ? 'ΔVsec = √3 × ρ × L × Ib / s'
        : 'ΔVsec = 2 × ρ × L × Ib / s'
    }
    substitution={`${activePanel.supply === 'tri' && activePanel.circuits.every((circuit) => circuit.phase === '3Φ') ? '1,732' : '2'} × 0,018 × ${activePanel.feederLengthM ?? 15} × ${formatNumber(calculations.mainCurrent, 2)} / ${activePanel.feederConductor ?? 6}`}
    result={`${formatNumber(calculations.feederDrop.volts, 2)} V · ${formatNumber(calculations.feederDrop.percent, 2)} %`}
    ```
    *Finding*: When `activePanel.supply === 'tri'` but its circuits are single-phase on L1/L2/L3 (e.g. standard distribution), `activePanel.circuits.every(c => c.phase === '3Φ')` evaluates to `false`. The substitution text prints `2 × 0,018 × 15 × 8,23 / 6` (which mathematically equals $0.74\text{ V}$ / $0.34\%$), but the Result box displays $0.64\text{ V} \cdot 0.17\%$ (calculated using $\sqrt{3} / 380\text{V}$). The visible calculation memory is self-contradictory.

- **Obs 1.2.2 (Hardcoded Busbar Drop & Grid Row-Break Line Artifacts)**:
  - In `app/page.tsx:4391`:
    ```tsx
    <div className="ml-auto mr-[75px] h-7 w-[2px] bg-slate-700" />
    ```
  - In `app/page.tsx:4393-4396`:
    ```tsx
    <div className="grid gap-x-2 gap-y-4" style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(totalBranchesCount, 1), 6)}, minmax(110px, 1fr))` }}>
    ```
  - In `app/page.tsx:4402, 4436`:
    ```tsx
    <span className="absolute left-0 right-0 top-0 h-[2px] bg-slate-700 first:left-1/2 last:right-1/2" />
    ```
    *Finding*: The vertical connector line uses a hardcoded `mr-[75px]` offset. When `totalBranchesCount > 6`, the grid wraps to row 2. Because CSS pseudo-classes `:first-child` and `:last-child` only apply to item 1 and item N, item 6 on row 1 and item 7 on row 2 bleed their horizontal lines out of the grid boundaries into the container padding.

- **Obs 1.2.3 (Emergency Circuit Shared Differential in Balanced Architecture)**:
  - In `app/page.tsx:4461-4463`:
    ```tsx
    architecture === 'balanced'
      ? circuit.kind === 'EMG' || index % 2 === 1
        ? 'ID B'
        : 'ID A'
      : 'ID propio'
    ```
    *Finding*: An emergency lighting circuit (EMG) is mapped to 'ID B' along with all odd-indexed circuits (including general receptacles TUG at index 1). Under AEA 90364-7-718 clause 718.5.3, emergency circuits must not share an RCD with general receptacle circuits.

- **Obs 1.2.4 (Missing Standard Unifilar Branch Annotations)**:
  - In `app/page.tsx:4456-4470`:
    *Finding*: Branch cards display `breaker A` and `conductor mm²`, omitting standard IRAM/AEA unifilar notation: curve designation (e.g. `C16`), multi-conductor specification (e.g. `2x2.5 + 1x2.5 PE mm²`), differential tripping sensitivity ($I_{\Delta n} = 30\text{ mA}$), and conduit sizing (e.g. $\varnothing 19\text{ mm}$ / RS 19).

---

### 1.3. Multi-Line Diagram (`MultiLineDiagram`)

- **Obs 1.3.1 (Protective Earth Conductor Undersizing for Lighting Circuits)**:
  - In `app/page.tsx:4550, 4618`:
    ```tsx
    <ConductorLines count={1} color="bg-emerald-500" label={`PE · ${circuit.conductor} mm²*`} />
    ```
    *Finding*: For lighting circuits with `conductor: 1.5 mm²`, the PE conductor is labeled `PE · 1.5 mm²`. AEA 90364-7-771.13.1 and Table 771.13.I explicitly prohibit PE conductors smaller than $2.5\text{ mm}^2$ when protected in conduit ($4\text{ mm}^2$ if unprotected).

- **Obs 1.3.2 (Wire Color Standards Compliance)**:
  - In `app/page.tsx:4531, 4599, 4661` (`ConductorLines`):
    - Active conductors: `color="bg-amber-500"`
    - Neutral conductor: `color="bg-sky-500"`
    - PE conductor: `color="bg-emerald-500"`
    *Finding*: Active phases are rendered in uniform amber for all 3 phases. Standard Argentine AEA / IRAM NM 247-3 requires:
    - Phase R (L1): Brown (Castaño)
    - Phase S (L2): Black (Negro)
    - Phase T (L3): Red (Rojo) or Gray (Gris)
    - Neutral (N): Light Blue (Celeste)
    - Ground (PE): Green-Yellow (Verde-Amarillo bicolor).

- **Obs 1.3.3 (Tabular Schedule vs Wiring Schematic)**:
  - In `app/page.tsx:4491-4645`:
    *Finding*: `MultiLineDiagram` is structured as a tabular conductor schedule (`<table>`) rather than a graphical wiring diagram showing physical toroidal core routing, isolated neutral bar, and direct ground bar bonding.

---

### 1.4. Bi-Directional Interactive Highlighting

- **Obs 1.4.1 (`MultiLineDiagram` Highlighting Disconnect)**:
  - In `app/page.tsx:2977-2982`:
    ```tsx
    <MultiLineDiagram
      panel={activePanel}
      childPanels={childPanels}
      calculations={panelCalculations}
    />
    ```
  - In `app/page.tsx:4480-4489`:
    *Finding*: `MultiLineDiagram` does not accept `highlightedCircuitId` or `onHoverCircuit`. Hovering or clicking circuits in the Table, DIN Rail, or Single-Line Diagram produces no response in the Multi-Line view.

- **Obs 1.4.2 (Hover Deadlock on Item Selection)**:
  - In `app/page.tsx:1967`:
    ```ts
    const activeHighlightedCircuitId = selectedCircuitId ?? hoveredCircuitId;
    ```
    *Finding*: When any circuit is selected by click (`selectedCircuitId !== null`), all hover interactions on other circuits across the DIN Rail and Single-Line Diagram are completely suppressed until the user deselects the current circuit.

- **Obs 1.4.3 (Unlinked Differentials and TS Feeder Devices)**:
  - In `app/page.tsx:1893-1934`:
    *Finding*: Differential devices (`diff`, `diff-a`, `diff-b`) and child feeder breakers (`feeder-*`) lack `circuitId` or relationship keys, preventing cross-highlighting of downstream branch circuits or sectional panels.

---

### 1.5. Catalog Price & Budget Calculation

- **Obs 1.5.1 (Real-Time Price Input Sanitization Bypass)**:
  - In `app/page.tsx:3452-3528`:
    ```tsx
    onChange={(value) => setPrices((current) => ({ ...current, mcb2P: value }))}
    ```
  - In `app/page.tsx:4015` (`PriceInput`):
    ```tsx
    onChange={(event) => onChange(Number(event.target.value))}
    ```
    *Finding*: Clearing the price input produces `NaN` (`Number("") = 0` in some browsers or `NaN`), and negative inputs are not clamped to 0 during live typing. This causes `projectCostSummary` (line 1489) to evaluate to `NaN` and display `"$ NaN"` in the UI.

- **Obs 1.5.2 (BOM Scope Omissions)**:
  - In `app/page.tsx:1481-1492`:
    *Finding*: The project cost summary aggregates only enclosures, MCBs, RCDs, and DPS. It omits feeder line cables between TP and TS, copper ground rods (jabalinas), neutral/PE busbars, and distribution combs.

---

### 1.6. Print & Export Media Styles

- **Obs 1.6.1 (Parent Container `print:hidden` Suppressing Visual Diagrams)**:
  - In `app/page.tsx:2052`:
    ```tsx
    <section className="print-sheet mx-auto flex max-w-[1680px] flex-col px-4 py-5 print:hidden lg:px-6">
    ```
  - In `app/page.tsx:2940, 2963, 3135, 3340, 3690`:
    Child sections declare `print:break-before-page`.
    *Finding*: Because the parent container has `print:hidden`, all child sections (SingleLineDiagram, MultiLineDiagram, Calculation Memory, Cost Options, Architecture Guide) are completely hidden when printing. Only the text table in `ProjectPrintSummary` (line 3611) prints.

---

## 2. Logic Chain

1. **DIN Rail Sizing**:
   - `TEMPLATES` initializes all circuit kinds with `modules: 2`.
   - When a user changes a circuit phase from single-phase (`L1`) to three-phase (`3Φ`), `updateCircuit` alters `circuit.phase` but leaves `circuit.modules` at `2`.
   - `architectureOccupiedModules` computes occupied space by summing `circuit.modules`.
   - Therefore, a 3-phase panel with multiple 3Φ circuits underestimates its module demand by $2\text{ M}$ per 3-phase circuit (since 3P/4P breakers require 3M/4M).
   - This cascades into `recommendedModules`, which selects a smaller enclosure than physically required to mount the equipment.

2. **AEA Reserve Space Compliance**:
   - AEA 90364-7-771.18.2 states: "Los tableros deberán tener una reserva de espacio libre... de al menos el 20 % de la capacidad total del tablero, o como mínimo 2 módulos".
   - The codebase defines `recommendedModules = Math.ceil(occupiedModules * (1 + reservePercent / 100))`.
   - For an enclosure with $M_{\text{occupied}} = 15$ and $r = 20\%$, $M_{\text{rec}} = 18$. A 1-row 18M enclosure is chosen.
   - The reserve space inside the enclosure is $18 - 15 = 3\text{ M}$, which is $3 / 18 = 16.67\%$ of total enclosure capacity.
   - To guarantee $\ge 20\%$ of total capacity, the formula must be $M_{\text{capacity}} \ge \frac{M_{\text{occupied}}}{1 - r/100}$ (e.g. $15 / 0.8 = 18.75 \rightarrow 2\times 12\text{ M} = 24\text{ M}$ or $2\times 18\text{ M} = 36\text{ M}$).

3. **FormulaCard Discrepancy**:
   - `feederVoltageDrop` calculates $\Delta V$ using $\sqrt{3} \approx 1.732$ whenever `supply === 'tri'`.
   - `FormulaCard` chooses its formula and text substitution based on whether all branch circuits are 3-phase (`activePanel.circuits.every(c => c.phase === '3Φ')`).
   - In standard 3-phase distribution boards feeding single-phase circuits, the formula condition evaluates to `false`, causing the card to display the single-phase multiplier `2` in the substitution while displaying the 3-phase result from `feederVoltageDrop`.

4. **Grounding Conductor Normative Defect**:
   - `MultiLineDiagram` sets $S_{PE} = S_{\text{conductor}}$ without a minimum floor.
   - For lighting circuits ($S = 1.5\text{ mm}^2$), $S_{PE}$ is marked as $1.5\text{ mm}^2$.
   - AEA 90364-7-771.13.1 sets the absolute minimum cross-section for protective earth conductors at $2.5\text{ mm}^2$ in conduit.
   - Outputting $1.5\text{ mm}^2$ for PE creates non-compliant municipal documentation.

---

## 3. Caveats

- **Scope Boundary**: This audit is strictly read-only and did not alter any code or assets in `c:\Users\Fendyk Daniel\Documents\ChatGPT\a`.
- **Single-File Architecture**: The application is concentrated in `app/page.tsx` (~4,700 lines). The recommendations below are structured to allow modular refactoring or localized in-place corrections without introducing breaking changes.
- **Browser Print Behavior**: Different browser print engines (Chromium vs Firefox vs Safari) handle `@page { size: A3 landscape }` differently. The print audit evaluated the source CSS and DOM hierarchy.

---

## 4. Conclusion & Severity Categorization

### Table of Findings

| ID | Domain | Description | Severity | Impact |
|---|---|---|---|---|
| **F-01** | DIN Math | 3Φ circuits default to 2M instead of 4M in `TEMPLATES` & phase switch | **CRITICAL** | Underestimates enclosure size by 2M per 3Φ circuit |
| **F-02** | Diagrams | `FormulaCard` TS Feeder $\Delta V$ substitution math contradicts computed result | **CRITICAL** | Calculation memory displays invalid arithmetic ($2\times \dots \neq 0.64\text{ V}$) |
| **F-03** | MLD | Protective Earth conductor (PE) shown as $1.5\text{ mm}^2$ on IUG circuits | **CRITICAL** | Direct violation of AEA 90364-7-771 minimum PE of $2.5\text{ mm}^2$ |
| **F-04** | DIN Math | Reserve formula yields $16.67\%$ total capacity and allows 0 free modules | **WARNING** | Non-compliance with AEA 771.18.2 ($20\%$ total capacity / min 2M) |
| **F-05** | DIN Visual | Row-break cursor gap skips cause device clipping in `PanelFront` | **WARNING** | Visual dropping of devices on multi-row rails |
| **F-06** | SLD | Hardcoded `mr-[75px]` connector and grid line overflow on $>6$ circuits | **WARNING** | Broken busbar lines and floating drop connector on resize/wrapping |
| **F-07** | SLD | Emergency circuit (EMG) shares 'ID B' with general receptacles in Balanced mode | **WARNING** | Non-compliance with AEA 90364-7-718 dedicated RCD rule |
| **F-08** | MLD | Conductor wire colors use uniform amber for all active phases | **WARNING** | Non-compliance with IRAM NM 247-3 (Brown/Black/Red/Light Blue/Green-Yellow) |
| **F-09** | Interactivity | `MultiLineDiagram` completely disconnected from cross-component highlighting | **WARNING** | Breaks 4-way interactive synchronization |
| **F-10** | Interactivity | Click-selection creates hover deadlock on all other components | **WARNING** | Suppresses visual feedback during inspection |
| **F-11** | Budgeting | Live `PriceInput` allows `NaN` and negative inputs into state | **WARNING** | Corrupts project budget displays to `"$ NaN"` |
| **F-12** | Print CSS | Parent `print:hidden` hides diagrams despite child `print:break-before-page` | **WARNING** | Prevents printing complete engineering dossiers |
| **F-13** | Catalog | Granularity gap between 16M and 36M enclosures in `cabinetFor` | **OPTIMIZATION** | Overprices single-row 18M panels ($83,000 vs $31,000) |
| **F-14** | SLD/MLD | Missing conduit/canalization sizing ($\varnothing 19\text{ mm}$ / RS 19) | **OPTIMIZATION** | Incomplete municipal submission data (Ord. 72/83) |

---

## 5. Recommended Code Fixes

### Fix 1: 3-Phase Circuit Module Adjustment (`app/page.tsx`)

```tsx
// In changePanelSupply or updateCircuit:
function updateCircuit<K extends keyof Circuit>(id: number, key: K, value: Circuit[K]) {
  updateActivePanel(
    'circuits',
    activePanel.circuits.map((circuit) => {
      if (circuit.id !== id) return circuit;
      const updated = { ...circuit, [key]: value };
      if (key === 'phase') {
        updated.modules = value === '3Φ' ? 4 : 2;
      }
      return updated;
    }),
  );
}
```

### Fix 2: AEA Compliant Reserve Space Calculation (`app/page.tsx:1054`)

```tsx
// Correct total panel capacity formula:
const requestedReserve = Math.max(panel.reservePercent ?? 20, 20) / 100;
const rawRecommended = Math.ceil(occupiedModules / (1 - requestedReserve));
// Ensure at least 2 free modules per AEA 771.18.2:
const recommendedModules = Math.max(rawRecommended, occupiedModules + 2);
const rows = Math.max(1, Math.ceil(recommendedModules / panel.modulesPerRow));
const cabinetModules = rows * panel.modulesPerRow;
```

### Fix 3: TS Feeder $\Delta V$ FormulaCard Substitution Fix (`app/page.tsx:3210`)

```tsx
// Match feederVoltageDrop logic exactly:
<FormulaCard
  title="Caída del alimentador"
  formula={
    activePanel.supply === 'tri'
      ? 'ΔVsec = √3 × ρ × L × Ib / s'
      : 'ΔVsec = 2 × ρ × L × Ib / s'
  }
  substitution={`${activePanel.supply === 'tri' ? '1,732' : '2'} × 0,018 × ${activePanel.feederLengthM ?? 15} × ${formatNumber(calculations.mainCurrent, 2)} / ${activePanel.feederConductor ?? 6}`}
  result={`${formatNumber(calculations.feederDrop.volts, 2)} V · ${formatNumber(calculations.feederDrop.percent, 2)} %`}
  note={`Chequeo: Ib ${formatNumber(calculations.mainCurrent, 2)} A ≤ In ${activePanel.feederBreaker ?? 32} A ≤ Iz ${CONDUCTOR_CAPACITY[activePanel.feederConductor ?? 6] ?? 0} A · criterio recomendado ΔVsec ≤ 1 %`}
/>
```

### Fix 4: Minimum PE Conductor Sizing Floor (`app/page.tsx:4550, 4618`)

```tsx
// In MultiLineDiagram:
const peConductor = Math.max(circuit.conductor, 2.5);
<ConductorLines
  count={1}
  color="bg-emerald-500"
  label={`PE · ${peConductor} mm² (mín. AEA 2,5)`}
/>
```

### Fix 5: MultiLineDiagram Bi-directional Highlighting Integration (`app/page.tsx:2977`)

```tsx
<MultiLineDiagram
  panel={activePanel}
  childPanels={childPanels}
  calculations={panelCalculations}
  highlightedCircuitId={activeHighlightedCircuitId}
  onHoverCircuit={(id) => setHoveredCircuitId(id ?? null)}
  onSelectCircuit={(id) => setSelectedCircuitId((curr) => curr === id ? null : id)}
/>
```

### Fix 6: Prioritize Hover when Available (`app/page.tsx:1967`)

```tsx
// Allow hovering to give immediate feedback even while another circuit is clicked:
const activeHighlightedCircuitId = hoveredCircuitId ?? selectedCircuitId;
```

---

## 6. Verification Method

To independently verify these findings:

1. **Verify 3-Phase Module Calculation**:
   - Inspect `app/page.tsx:620` and `app/page.tsx:2732`.
   - Set a panel to `Trifásico` and add a `FM` (Fuerza Motriz) circuit set to `3Φ`.
   - Observe that `circuit.modules` remains `2`, and `occupiedModules` increments by only 2 instead of 4.

2. **Verify Feeder $\Delta V$ FormulaCard Arithmetic Conflict**:
   - Inspect `app/page.tsx:3210-3216`.
   - In a project with a TS panel having 3-phase supply (`supply: 'tri'`) and single-phase branch circuits, inspect the `Caída del alimentador` card.
   - Observe that substitution displays `2 × 0,018 × 15 × ...` ($0.74\text{ V}$) while the result displays $0.64\text{ V}$ ($0.17\%$).

3. **Verify PE Sizing for Lighting**:
   - Inspect `app/page.tsx:4618`.
   - Add an `IUG` circuit with $1.5\text{ mm}^2$ conductor.
   - Observe that column "Protección PE" outputs `PE · 1.5 mm²` instead of enforcing the mandatory $2.5\text{ mm}^2$ floor.

4. **Verify MultiLineDiagram Highlighting Isolation**:
   - Inspect `app/page.tsx:2977-2982` and `app/page.tsx:4480-4489`.
   - Confirm that `MultiLineDiagram` receives no highlight props or callback handlers.
