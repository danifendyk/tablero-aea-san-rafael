# Comprehensive Electrotechnical & Normative Compliance Audit Report
**Project**: `tablero-aea-san-rafael` (c:\Users\Fendyk Daniel\Documents\ChatGPT\a)  
**Auditor**: Electrotechnical & Normative Compliance Auditor (Explorer R1)  
**Standards Evaluated**: AEA 90364-7-771 (2006/Corrigenda), AEA 90364-7-718 (2008), AEA 90364 Partes 0–6, Ordenanza General 72/83 de Mendoza (San Rafael), IRAM 2183 / NM 247-3 / 2178, IRAM 2309 / 2315, IEC 60898 / IEC 61008 / IEC 61439.  
**Date**: 2026-08-30  

---

## 1. Observation

Direct, verbatim source code observations from `app/page.tsx`, `documentos_normativos/`, and regulatory reference files:

### 1.1 Constants & Electrical Reference Data
- **Resistivity constant** (`app/page.tsx:173`):
  ```typescript
  173: const COPPER_RESISTIVITY = 0.018;
  ```
- **Conductor ampacity table ($I_z$)** (`app/page.tsx:191-200`):
  ```typescript
  191: const CONDUCTOR_CAPACITY: Record<number, number> = {
  192:   1.5: 16,
  193:   2.5: 20,
  194:   4: 25,
  195:   6: 32,
  196:   10: 50,
  197:   16: 63,
  198:   25: 80,
  199:   35: 100,
  200: };
  ```
- **Standard MCB ratings ($I_n$)** (`app/page.tsx:171`):
  ```typescript
  171: const STANDARD_BREAKERS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];
  ```
- **Circuit templates ($IUG, TUG, TUE, EMG, FM$)** (`app/page.tsx:261-322`):
  ```typescript
  262:   IUG: {
  263:     label: 'Iluminación general',
  264:     shortName: 'Iluminación',
  265:     kind: 'IUG',
  266:     points: 10,
  267:     unitVA: 100,
  268:     powerFactor: 0.95,
  269:     breaker: 16,
  270:     conductor: 1.5,
  271:     lengthM: 24,
  272:     modules: 2,
  273:   },
  ```

### 1.2 Core Mathematical Functions
- **Apparent power calculation** (`app/page.tsx:457-459`):
  ```typescript
  457: function circuitPower(circuit: Circuit) {
  458:   return Math.max(0, circuit.points) * Math.max(0, circuit.unitVA);
  459: }
  ```
- **Nominal current calculation ($I_b$)** (`app/page.tsx:461-465`):
  ```typescript
  461: function circuitCurrent(circuit: Circuit, supply: Supply) {
  462:   const voltage = circuit.phase === '3Φ' && supply === 'tri' ? 380 : 220;
  463:   const divisor = circuit.phase === '3Φ' && supply === 'tri' ? Math.sqrt(3) : 1;
  464:   return circuitPower(circuit) / (divisor * voltage);
  465: }
  ```
- **Branch circuit voltage drop ($\Delta U$)** (`app/page.tsx:467-477`):
  ```typescript
  467: function voltageDrop(circuit: Circuit, supply: Supply) {
  468:   const current = circuitCurrent(circuit, supply);
  469:   const threePhase = circuit.phase === '3Φ' && supply === 'tri';
  470:   const volts =
  471:     (threePhase ? Math.sqrt(3) : 2) *
  472:     Math.max(0, circuit.lengthM) *
  473:     current *
  474:     COPPER_RESISTIVITY /
  475:     Math.max(circuit.conductor, 0.1);
  476:   return { volts, percent: (volts / (threePhase ? 380 : 220)) * 100 };
  477: }
  ```
- **Feeder voltage drop ($\Delta U_{\text{sec}}$)** (`app/page.tsx:479-493`):
  ```typescript
  479: function feederVoltageDrop(
  480:   current: number,
  481:   lengthM: number,
  482:   conductor: number,
  483:   supply: Supply,
  484: ) {
  485:   const threePhase = supply === 'tri';
  486:   const volts =
  487:     (threePhase ? Math.sqrt(3) : 2) *
  488:     Math.max(0, lengthM) *
  489:     current *
  490:     COPPER_RESISTIVITY /
  491:     Math.max(conductor, 0.1);
  492:   return { volts, percent: (volts / (threePhase ? 380 : 220)) * 100 };
  493: }
  ```

### 1.3 Aggregation, Demand Factor & Phase Balancing
- **Panel calculations & Phase unbalance** (`app/page.tsx:946-1067`):
  ```typescript
  974:   const demandVA = ownInstalledVA * panel.demandFactor + childDemandVA;
  ...
  1019:  const phaseCurrent = {
  1020:    L1: (phaseVA.L1 * (isTP ? 1 : panel.demandFactor)) / 220,
  1021:    L2: (phaseVA.L2 * (isTP ? 1 : panel.demandFactor)) / 220,
  1022:    L3: (phaseVA.L3 * (isTP ? 1 : panel.demandFactor)) / 220,
  1023:  };
  1024:  const mainCurrent =
  1025:    panel.supply === 'tri'
  1026:      ? Math.max(phaseCurrent.L1, phaseCurrent.L2, phaseCurrent.L3)
  1027:      : demandVA / 220;
  ...
  1060:  const phaseValues = Object.values(phaseVA);
  1061:  const averagePhase = phaseValues.reduce((sum, value) => sum + value, 0) / 3;
  1062:  const imbalance =
  1063:    panel.supply === 'tri' && averagePhase > 0
  1064:      ? Math.max(...phaseValues.map((value) => Math.abs(value - averagePhase))) /
  1065:        averagePhase
  1066:      : 0;
  ```

### 1.4 Inconsistency in Calculation Memory (`FormulaCard`)
- **Feeder voltage drop formula discrepancy** (`app/page.tsx:3210-3218`):
  ```typescript
  3210: title="Caída del alimentador"
  3211: formula={
  3212:   activePanel.supply === 'tri' && activePanel.circuits.every((circuit) => circuit.phase === '3Φ')
  3213:     ? 'ΔVsec = √3 × ρ × L × Ib / s'
  3214:     : 'ΔVsec = 2 × ρ × L × Ib / s'
  3215: }
  3216: substitution={`${activePanel.supply === 'tri' && activePanel.circuits.every((circuit) => circuit.phase === '3Φ') ? '1,732' : '2'} × 0,018 × ${activePanel.feederLengthM ?? 15} × ${formatNumber(calculations.mainCurrent, 2)} / ${activePanel.feederConductor ?? 6}`}
  3217: result={`${formatNumber(calculations.feederDrop.volts, 2)} V · ${formatNumber(calculations.feederDrop.percent, 2)} %`}
  ```

### 1.5 Grounding & Regulatory Verifications
- **Mendoza Municipal Ordinance 72/83 & AEA 771 checks** (`app/page.tsx:1248-1267`, `1515-1528`):
  ```typescript
  1249: if (profile.groundResistanceOhm > 10) {
  1250:   messages.push(
  1251:     'La resistencia de puesta a tierra supera 10 Ω, máximo indicado por la Ordenanza 72/83.',
  1252:   );
  1253: }
  1255: if (
  1256:   isPublicVenue &&
  1257:   !panels.some((panel) => panel.circuits.some((circuit) => circuit.kind === 'EMG'))
  1258: ) {
  1259:   messages.push(
  1260:     'El proyecto de pública concurrencia no tiene ningún circuito de iluminación de emergencia.',
  1261:   );
  1262: }
  ```

---

## 2. Logic Chain

From the direct observations above, the step-by-step electrotechnical and normative analysis proceeds as follows:

### 2.1 Power & Current Mathematical Validation
1. **Apparent Power ($S$)**: $S = n \times S_{\text{unit}} = \text{points} \times \text{unitVA}$. In AC circuits, $S$ is expressed in Volt-Amperes ($\text{VA}$). The formula `circuitPower(circuit)` returns $S$ directly.
2. **Current ($I_b$)**:
   - Single-phase ($220\,\text{V}$): $I_b = \frac{S}{U} = \frac{S}{220}$.
   - Three-phase ($380\,\text{V}$ line-to-line): $I_b = \frac{S}{\sqrt{3} \times U_{\text{line}}} = \frac{S}{\sqrt{3} \times 380} \approx \frac{S}{658.18}$.
   - Observation: In `circuitCurrent` (`app/page.tsx:461-465`), these exact relations are implemented without approximation.
   - Note on $\cos\varphi$: Because $S$ is apparent power ($\text{VA}$), $I = S / U$ is exact. `powerFactor` is stored in the model but neither used nor required for $I_b$ calculation when input is in $\text{VA}$.
3. **Simultaneity & Hierarchy**:
   - `demandVA` computes $S_d = S_{\text{installed}} \times f_s$.
   - In `panelCalculations` (`app/page.tsx:953-974`), subpanels (`TS`) apply their local `demandFactor`, and the TP aggregates the resulting simultaneous demand from child panels plus its own load with its own `demandFactor`. This matches standard multi-tier DPMS calculation.

### 2.2 Phase Balancing & Imbalance Formulation
1. **Unbalance Definition**:
   - Imbalance is calculated as: $\text{Imbalance} = \frac{\max(|S_{L1} - S_{\text{avg}}|, |S_{L2} - S_{\text{avg}}|, |S_{L3} - S_{\text{avg}}|)}{S_{\text{avg}}}$.
   - This matches IEEE/NEMA standard Phase Voltage/Current Unbalance Rate (PVUR).
   - AEA 90364-7-771 clause 771.8.2 recommends keeping unbalance below $20\%$. The code triggers an alert when $\text{imbalance} > 0.20$ (`app/page.tsx:1238`), complying with AEA criteria.
2. **Unbalance in `optimizeProject`**:
   - `optimizeProject` sorts single-phase circuits in descending order of power and assigns each to the least loaded phase.
   - Observation: When running on the TP, `optimizeProject` resets `phaseTotals` to zero (`app/page.tsx:1728`) instead of seeding it with the phase loads already imposed by connected TS subpanels. This causes the optimization to ignore subpanel phase allocations when balancing TP branch circuits.

### 2.3 Conductor Ampacity ($I_z$) vs AEA 90364-7-771 Table 771.16.I
1. **Conductor Sizing Rule (Clause 771.19)**:
   The primary thermal protection coordination condition is:
   $$I_b \le I_n \le I_z \quad \text{and} \quad I_2 \le 1.45 \times I_z$$
2. **Comparison with Official Table 771.16.I (Method B1, Cu/PVC, $70^\circ\text{C}$, $40^\circ\text{C}$ ambient)**:
   - For $1.5\,\text{mm}^2$: Table 771.16.I specifies $I_z = 15\,\text{A}$ (2 loaded conductors) or $14\,\text{A}$ (3 loaded conductors).
   - Code `CONDUCTOR_CAPACITY[1.5]` (`app/page.tsx:192`) specifies **`16` A**.
   - Consequence: In `TEMPLATES.IUG` (`app/page.tsx:269-270`), `breaker = 16` and `conductor = 1.5`. Under the standard, $I_n = 16\,\text{A} > I_z = 15\,\text{A}$, which violates $I_n \le I_z$. Because the lookup table has 16 A, the software fails to warn the user of this non-compliance.
   - For other sections ($2.5, 4, 6, 10, 16, 25, 35\,\text{mm}^2$), the values in `CONDUCTOR_CAPACITY` ($20, 25, 32, 50, 63, 80, 100\,\text{A}$) are conservative relative to Table 771.16.I 2-conductor ratings ($21, 28, 36, 50, 66, 88, 109\,\text{A}$), safely matching standard nominal breaker sizes.

### 2.4 Voltage Drop Equations & Constants
1. **Equation Verification**:
   - Single-phase ($220\,\text{V}$): $\Delta U = 2 \cdot \frac{L \cdot I_b \cdot \rho}{S}$, $\Delta U\% = \frac{\Delta U}{220} \times 100\%$.
   - Three-phase ($380\,\text{V}$): $\Delta U = \sqrt{3} \cdot \frac{L \cdot I_b \cdot \rho}{S}$, $\Delta U\% = \frac{\Delta U}{380} \times 100\%$.
   - Both formulas are mathematically exact.
2. **Thermal Resistivity Parameter**:
   - Code uses `COPPER_RESISTIVITY = 0.018` ($\Omega\cdot\text{mm}^2/\text{m}$ at $20^\circ\text{C}$).
   - AEA 771 Annex 771-G recommends using conductor operating temperature ($70^\circ\text{C}$ for PVC), where $\gamma = 44\,\text{m}/(\Omega\cdot\text{mm}^2) \implies \rho_{70} \approx 0.0227\,\Omega\cdot\text{mm}^2/\text{m}$.
   - Using $\rho = 0.018$ underestimates thermal loaded voltage drop by $\approx 26.1\%$.
3. **Discrepancy in `FormulaCard` (`app/page.tsx:3211-3216`)**:
   - In `feederVoltageDrop` (`app/page.tsx:485`), three-phase subpanel feeders use $\sqrt{3} \approx 1.732$.
   - In `FormulaCard`, the formula string condition checks `activePanel.circuits.every(c => c.phase === '3Φ')`. If a 3-phase subpanel has 1-phase branch circuits (the standard case), the formula text displays $2 \times \rho \times L \times I_b / s$ with multiplier `'2'` while the numerical result was calculated using $1.732$.

### 2.5 Grounding (PAT) & Mendoza Ordinance 72/83
1. **Resistance Limit**:
   - Mendoza Ordinance 72/83 Art. III.2.19.3 & III.2.19.6 explicitly establishes:
     *"El valor máximo de la resistencia de puesta a tierra, no debe ser superior a 10 Ohms, preferentemente no mayor de 3 Ohms..."*
   - AEA 90364-7-771 clause 771.18.5 establishes $R_A \le 10\,\Omega$ in TT schemes.
   - Code warning (`app/page.tsx:1249`) checks `groundResistanceOhm > 10`, which strictly complies with both Ordinance 72/83 and AEA 771.
2. **Multi-line Diagram Obligation**:
   - Ordinance 72/83 Art. III.2.2.7 (g):
     *"Los esquemas de conexión serán multifilares. Deberán agruparse los conductores correspondientes a cada canalización de salida del tablero, incluyendo los conductores neutro y tierra; debiendo individualizarse los distintos circuitos y acotar la sección de los conductores."*
   - The dedicated `MultiLineDiagram` component (`app/page.tsx:4480-4646`) specifically renders phase, neutral, and PE conductors grouped per outgoing branch, strictly satisfying this local municipal requirement.

### 2.6 Public Gathering Venue (AEA 90364-7-718)
1. **Scope Trigger**:
   - `isPublicVenue` triggers when `preset === 'hall' || occupancy >= 50 || evacuation !== 'BD1'` (`app/page.tsx:1149-1152`), complying with AEA 718.1.
2. **Emergency Lighting Autonomy & Differential Separation**:
   - AEA 718.5.3 prohibits sharing a single general differential breaker with emergency lighting.
   - The code issues a warning if `isPublicVenue && activePanel.architecture === 'essential'` (`app/page.tsx:1262`).
   - Standard AEA 718.5.5 / IRAM-AADL J 2027 requires minimum autonomy $\ge 2\,\text{h}$ for autonomous emergency luminaires in public venues.

---

## 3. Caveats

1. **Short-Circuit Calculation ($I_k$)**: The application takes prospective short circuit current ($I_k$) as a direct user input (`prospectiveShortCircuitKa`) rather than calculating impedance matrices based on upstream transformer kVA and network distance. This is standard for predimensioning tools.
2. **Reactance ($X$) in Voltage Drop**: For conductors $> 35\,\text{mm}^2$ or high power factors $< 0.8$, inductive reactance ($X_L \approx 0.08\,\Omega/\text{km}$) adds to voltage drop. For internal building circuits $\le 35\,\text{mm}^2$, pure resistance approximation is standard practice.
3. **Single Active Workspace**: Analysis was executed strictly on the source tree of `tablero-aea-san-rafael` without modifying repository files.

---

## 4. Conclusion

### 4.1 Summary of Findings by Severity

| ID | Domain | Severity | Source Location | Summary of Finding & Normative Reference |
|---|---|---|---|---|
| **E-01** | Conductors & Protections | **CRITICAL** | `app/page.tsx:192, 269` | `CONDUCTOR_CAPACITY[1.5]` set to 16 A instead of 15 A (AEA 771 Table 771.16.I). Prevents warning when $1.5\,\text{mm}^2$ wire is protected by 16 A MCB. |
| **E-02** | Calculation Memory / UI | **WARNING** | `app/page.tsx:3211-3216` | Discrepancy in `FormulaCard`: Feeder $\Delta U$ displays single-phase formula ($2 \times$) text for 3-phase TS panels while computing with $\sqrt{3} \approx 1.732$. |
| **E-03** | Thermal Sizing ($\Delta U$) | **WARNING** | `app/page.tsx:173` | `COPPER_RESISTIVITY` set to $0.018$ ($20^\circ\text{C}$) instead of operating temperature $0.0227\,\Omega\cdot\text{mm}^2/\text{m}$ ($70^\circ\text{C}$, $\gamma=44$, AEA 771 Annex 771-G). |
| **E-04** | Warning Logic | **WARNING** | `app/page.tsx:1186-1190` | Terminal voltage drop warning ($> 2\%$) erroneously fires on Tablero Principal (TP) direct circuits, where the direct limit is $\le 3\%$. |
| **E-05** | Load Optimization | **WARNING** | `app/page.tsx:1728` | `optimizeProject()` ignores connected child subpanel phase loads when re-balancing TP branch circuits. |
| **E-06** | Data Model | **OPTIMIZATION** | `app/page.tsx:78, 616` | `powerFactor` property in `Circuit` is stored and normalized but never displayed or used in active power ($P$) calculations. |
| **E-07** | AEA 718 Compliance | **OPTIMIZATION** | `app/page.tsx:1506-1553` | Municipal checklist does not include explicit assertion for $\ge 2\,\text{h}$ emergency lighting autonomy under AEA 718 / IRAM-AADL J 2027. |

---

### 4.2 Detailed Normative Traceability Matrix

| Normative Reference | Clause / Article | Requirement | Code Implementation | Compliance Status |
|---|---|---|---|---|
| **AEA 90364-7-771** | Table 771.16.I | $I_z$ for $1.5\,\text{mm}^2$ Cu/PVC in conduit is $15\,\text{A}$ (2 conductors) or $14\,\text{A}$ (3 conductors). | Code sets `1.5: 16` in `CONDUCTOR_CAPACITY`. | ❌ **Non-compliant (Under-derated)** |
| **AEA 90364-7-771** | Clause 771.19.1 | Coordination $I_b \le I_n \le I_z$. | Implemented in `warnings` and `FormulaCard`. | ⚠️ **Masked by E-01 for $1.5\,\text{mm}^2$** |
| **AEA 90364-7-771** | Clause 771.19.6 | $\Delta U \le 3\%$ for lighting, $\le 5\%$ for motive power. | Implemented in `voltageDrop` & `warnings`. | ✅ **Compliant** |
| **AEA 90364-7-771** | Clause 771.8.2 | Phase balance: unbalance $\le 20\%$. | Calculated in `imbalance` formula; alert at $> 20\%$. | ✅ **Compliant** |
| **AEA 90364-7-771** | Clause 771.18.5 | Earth resistance $R_A \le 10\,\Omega$ (TT scheme). | Checked in `warnings` ($> 10\,\Omega$) and compliance card. | ✅ **Compliant** |
| **AEA 90364-7-771** | Table 771.18.I | PE cross-section $S_{\text{PE}} = S_{\text{phase}}$ for $S \le 16\,\text{mm}^2$. | Matched in `MultiLineDiagram` and notes. | ✅ **Compliant** |
| **AEA 90364-7-718** | Clause 718.5.3 | Emergency lighting separate from general RCD. | Alert triggered on `essential` single-RCD layout. | ✅ **Compliant** |
| **AEA 90364-7-718** | Clause 718.5.5 | Emergency lighting autonomy $\ge 2\,\text{h}$. | Present in guides and descriptions; checklist entry recommended. | ⚠️ **Optimization recommended** |
| **Ord. Gral. 72/83** | Art. III.2.19.3 | Puesta a tierra $\le 10\,\Omega$, preferentemente $\le 3\,\Omega$. | Validated in UI with 10 $\Omega$ threshold and $3\,\Omega$ default. | ✅ **Compliant** |
| **Ord. Gral. 72/83** | Art. III.2.2.7 (g) | Esquema de conexiones multifilar obligatorio. | Dedicated `MultiLineDiagram` rendering Phase, N, PE. | ✅ **Compliant** |

---

### 4.3 Concrete Proposed Code Changes (Patch Proposals)

#### Proposal 1: Fix $1.5\,\text{mm}^2$ Conductor Ampacity & IUG Default Breaker (`E-01`)
```diff
--- a/app/page.tsx
+++ b/app/page.tsx
@@ -191,3 +191,3 @@
 const CONDUCTOR_CAPACITY: Record<number, number> = {
-  1.5: 16,
+  1.5: 15,
   2.5: 20,
@@ -268,3 +268,3 @@
     powerFactor: 0.95,
-    breaker: 16,
+    breaker: 10,
     conductor: 1.5,
@@ -332,3 +332,3 @@
     powerFactor: 0.95,
-    breaker: 16,
+    breaker: 10,
     conductor: 1.5,
```

#### Proposal 2: Fix Feeder Voltage Drop Formula String in Calculation Memory (`E-02`)
```diff
--- a/app/page.tsx
+++ b/app/page.tsx
@@ -3211,5 +3211,5 @@
                 formula={
-                  activePanel.supply === 'tri' && activePanel.circuits.every((circuit) => circuit.phase === '3Φ')
+                  activePanel.supply === 'tri'
                     ? 'ΔVsec = √3 × ρ × L × Ib / s'
                     : 'ΔVsec = 2 × ρ × L × Ib / s'
                 }
-                substitution={`${activePanel.supply === 'tri' && activePanel.circuits.every((circuit) => circuit.phase === '3Φ') ? '1,732' : '2'} × 0,018 × ${activePanel.feederLengthM ?? 15} × ${formatNumber(calculations.mainCurrent, 2)} / ${activePanel.feederConductor ?? 6}`}
+                substitution={`${activePanel.supply === 'tri' ? '1,732' : '2'} × 0,018 × ${activePanel.feederLengthM ?? 15} × ${formatNumber(calculations.mainCurrent, 2)} / ${activePanel.feederConductor ?? 6}`}
                 result={`${formatNumber(calculations.feederDrop.volts, 2)} V · ${formatNumber(calculations.feederDrop.percent, 2)} %`}
```

#### Proposal 3: Fix Terminal Limit Warning on Main Panels (`E-04`)
```diff
--- a/app/page.tsx
+++ b/app/page.tsx
@@ -1185,5 +1185,5 @@
       const totalLimit = circuit.kind === 'FM' ? 5 : 3;
-      if (circuitDropPercent > terminalLimit) {
+      if (activePanel.type === 'TS' && circuitDropPercent > terminalLimit) {
         messages.push(
           `C${circuitNumber}: caída del circuito ${circuitDropPercent.toFixed(1)} %; supera el criterio de ${terminalLimit} % desde el tablero seccional.`,
         );
```

#### Proposal 4: Seed Child Panel Loads in `optimizeProject` (`E-05`)
```diff
--- a/app/page.tsx
+++ b/app/page.tsx
@@ -1727,5 +1727,16 @@
     const phaseTotals: Record<'L1' | 'L2' | 'L3', number> = {
       L1: 0,
       L2: 0,
       L3: 0,
     };
+    if (activePanel.type === 'TP') {
+      childPanels.forEach((child) => {
+        const childDemand = child.circuits.reduce((sum, c) => sum + circuitPower(c), 0) * child.demandFactor;
+        if (child.supply === 'mono') {
+          const phase = child.feederPhase === 'L2' || child.feederPhase === 'L3' ? child.feederPhase : 'L1';
+          phaseTotals[phase] += childDemand;
+        } else {
+          phaseTotals.L1 += childDemand / 3;
+          phaseTotals.L2 += childDemand / 3;
+          phaseTotals.L3 += childDemand / 3;
+        }
+      });
+    }
```

---

## 5. Verification Method

To independently verify all findings and validate mathematical accuracy:

### 5.1 Verification Test Cases & Expected Results

1. **Test Case 1: $1.5\,\text{mm}^2$ Wire with $16\,\text{A}$ Breaker ($I_n > I_z$)**:
   - *Input*: Circuit C1 with $1.5\,\text{mm}^2$ wire and $16\,\text{A}$ breaker.
   - *Expected AEA 771 Result*: Warning triggered: *"C1: la protección de 16 A supera la corriente admisible Iz (15 A) para conductor de 1,5 mm² en cañería (Tabla 771.16.I)"*.
   - *Actual Code Result*: No warning triggered due to `CONDUCTOR_CAPACITY[1.5] = 16`.

2. **Test Case 2: Feeder Voltage Drop Formula in 3-Phase TS**:
   - *Input*: TS1 with `supply = 'tri'`, `feederLengthM = 15`, `feederConductor = 6`, circuits on L1 and L2.
   - *Calculation*: $I_b = 8.52\,\text{A}$. $\Delta U_{\text{volts}} = \sqrt{3} \times 0.018 \times 15 \times 8.52 / 6 = 0.664\,\text{V}$. $\Delta U\% = (0.664 / 380) \times 100 = 0.17\%$.
   - *Actual Memory Display*: Card text displays `'2 × 0,018 × ...'` (showing $0.767\,\text{V}$), but the badge displays `0.66 V · 0.17 %`.

3. **Test Case 3: Voltage Drop on TP Branch Circuit**:
   - *Input*: TP panel with single-phase IUG circuit, `lengthM = 30`, `points = 10`, `unitVA = 100` ($1000\,\text{VA} \implies 4.55\,\text{A}$), conductor $1.5\,\text{mm}^2$.
   - *Calculation*: $\Delta U\% = (2 \times 30 \times 4.55 \times 0.018 / 1.5) / 220 \times 100 = 1.49\%$. If length increased to $50\,\text{m} \implies \Delta U\% = 2.48\%$.
   - *Actual Code Result*: Fires warning *"supera el criterio de 2 % desde el tablero seccional"* even though the circuit is in the TP where the direct limit is $3\%$.

4. **Test Case 4: Ordinance 72/83 Earth Resistance Limit**:
   - *Input*: `groundResistanceOhm = 12`.
   - *Expected Result*: Warning *"La resistencia de puesta a tierra supera 10 Ω, máximo indicado por la Ordenanza 72/83."*
   - *Actual Code Result*: Verified; warning triggers at line 1249.

5. **Test Case 5: Public Venue Emergency Lighting Rule (AEA 718)**:
   - *Input*: `preset = 'hall'`, delete circuit C3 (EMG).
   - *Expected Result*: Warning *"El proyecto de pública concurrencia no tiene ningún circuito de iluminación de emergencia."*
   - *Actual Code Result*: Verified; warning triggers at line 1255.
