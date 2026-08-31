# Exhaustive Audit Plan — Tablero AEA San Rafael

## Overview
A comprehensive, multi-domain, strictly read-only audit of the electrical panel dimensioning web application (`tablero-aea-san-rafael`) located at `c:\Users\Fendyk Daniel\Documents\ChatGPT\a`.

## Constraints
- Strictly read-only on repository files. No source code modifications.
- Subagent working directories are isolated under `.agents/`.
- All claims must cite specific line numbers and code snippets from `app/page.tsx` and related files.

## Audit Tracks & Subagent Allocation

### Track 1: Electrotechnical & Normative Compliance Audit (AEA 90364-7-771, AEA 90364-7-718, Ord. 72/83)
- **Assigned Subagent**: `teamwork_preview_explorer` (Explorer 1 - Electrotechnical)
- **Scope**:
  - Formulas in `app/page.tsx`: `circuitPower`, `circuitCurrent`, `voltageDrop`, `feederVoltageDrop`, `panelCalculations`, phase balancing, unbalance ratio.
  - Conductor thermal ratings ($I_z$), breaker ratings ($I_n$), coordination ($I_b \le I_n \le I_z$).
  - Voltage drop limits: Feeder $\le 1\%$, Branch $\le 2\%$, Lighting $\le 3\%$, Power/Motive $\le 5\%$, Total $\le 3\%$ (or $5\%$).
  - Ground resistance threshold ($R_A \le 10\,\Omega$), short circuit breaking capacity ($I_{cu} \ge I_k$).
  - AEA 90364-7-718 and Mendoza Ord. 72/83 rules: Emergency lighting autonomy $\ge 2\,\text{h}$, independent circuit, dedicated RCD, public venue constraints.

### Track 2: UI/UX, Diagram & Modular DIN Math Audit
- **Assigned Subagent**: `teamwork_preview_explorer` (Explorer 2 - UI/UX & Diagrams)
- **Scope**:
  - DIN rail modular math: $1\text{ M} = 18\,\text{mm}$, device widths (1P, 2P, 3P, 4P, RCD, SPD), row-breaking algorithm, module reserve calculation ($20\% - 25\%$).
  - SingleLineDiagram: SVG/DOM rendering, busbars, node connections, hierarchy, feeder branches to TS, differential labeling.
  - MultiLineDiagram: Phase (R, S, T), Neutral (N), Protective Earth (PE) routing, wire colors, section annotations.
  - Interactive bi-directional highlighting across circuits table, DIN rail layout, and diagrams.
  - Catalog price inputs, custom cost calculation formulas, material estimation logic.

### Track 3: State Persistence, Multi-Panel Hierarchy & Data Export/Import
- **Assigned Subagent**: `teamwork_preview_explorer` (Explorer 3 - State & Data)
- **Scope**:
  - `localStorage` lifecycle, `STORAGE_KEY`, persistence triggers, debounce.
  - Data sanitization and schema migration: `normalizePanels`, `normalizeProfile`, `normalizeCircuit`, `normalizePrices`, handling missing/corrupted fields.
  - Multi-panel tree structure: TP $\rightarrow$ TS1, TS2..., parent-child load aggregation, phase matching constraints (e.g. Mono TP feeding Tri TS prohibition/warnings).
  - Export/Import fidelity: JSON import/export roundtrip validation, CSV export formatting, delimiters, units, numerical precision, and locale compatibility.

### Track 4: Review, Verification & Synthesis
- **Assigned Subagent**: `teamwork_preview_reviewer` / `teamwork_preview_critic` & Project Orchestrator
- **Scope**:
  - Review all explorer findings against source code.
  - Verify reproduction of identified edge cases and mathematical defects.
  - Synthesize findings into structured severity tiers: Critical, Warning, Optimization.
  - Deliver authoritative comprehensive audit report.
