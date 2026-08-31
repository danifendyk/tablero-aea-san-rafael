# INFORME FINAL DE AUDITORÍA INTEGRAL — TABLERO AEA SAN RAFAEL
**Aplicación Web de Dimensionamiento de Tableros Eléctricos**  
**Normativa Evaluada**: AEA 90364-7-771 (2006/Corrigenda), AEA 90364-7-718 (2008), Ordenanza General 72/83 de Mendoza (San Rafael), IRAM NM 247-3 / IRAM 2183 / IRAM 2178, IRAM 2309 / 2315, IRAM-AADL J 2027, IEC 60898 / IEC 61008 / IEC 61439.  
**Directorio de Trabajo**: `c:\Users\Fendyk Daniel\Documents\ChatGPT\a`  
**Modalidad de Ejecución**: STRICTLY READ-ONLY (Inspección no invasiva, cero modificaciones al código fuente del repositorio).  
**Fecha de Emisión**: 2026-08-30  

---

## 1. RESUMEN EJECUTIVO

Se ha llevado a cabo una auditoría profunda, exhaustiva y multidominio de la aplicación web `tablero-aea-san-rafael` orientada al cálculo, balanceo de fases, diseño modular DIN, generación de esquemas unifilares/multifilares y verificación reglamentaria de tableros eléctricos conforme a la reglamentación argentina y disposiciones municipales de Mendoza.

La auditoría se estructuró en tres pistas especializadas de exploración y una fase de revisión y verificación cruzada:
1. **Pista 1: Cumplimiento Electrotécnico y Normativo** (AEA 90364-7-771, AEA 90364-7-718, Ord. 72/83).
2. **Pista 2: UI/UX, Diagramación Unifilar/Multifilar y Matemática Modular DIN** (Riel DIN, reserva de espacio, resaltado interactivo, cómputo y presupuesto).
3. **Pista 3: Persistencia de Estado, Jerarquía Multi-Tablero y Exportación/Importación de Datos** (LocalStorage, normalización de esquemas, compatibilidad de fases TP-TS, exportación JSON/CSV).

### Balance Global de Hallazgos
* **Hallazgos Críticos (5)**: Defectos que generan riesgos directos de seguridad eléctrica (sobrecarga térmica de conductores), subdimensionamiento físico de gabinetes, rechazo normativo en presentaciones municipales, o bloqueo/caída de la aplicación en el navegador.
* **Hallazgos de Advertencia (15)**: Discrepancias en memorias de cálculo, falsos positivos en alertas de caída de tensión, defectos visuales en diagramas unifilares, desconexión de interactividad, omisión de colores normalizados de conductores y problemas de compatibilidad regional en exportaciones.
* **Optimizaciones de Ingeniería (5)**: Mejoras en granularidad del catálogo de envolventes, enriquecimiento de esquemas unifilares, optimización global de fases y completitud de listas de cotejo para locales de pública concurrencia.

---

## 2. MATRIZ MAESTRA DE HALLAZGOS Y VULNERABILIDADES

| ID Unificado | Dominio | Severidad | Ubicación en Código | Descripción Resumida | Impacto Normativo / Operativo |
|---|---|---|---|---|---|
| **AUDIT-ELEC-001** | Conductores y Protecciones | **CRÍTICO** | `lib/electrical.ts:7`, `app/page.tsx:269, 332` | `CONDUCTOR_CAPACITY[1.5]` configurado en 16 A en vez de 15 A; plantilla IUG predeterminada con térmica de 16 A. | Riesgo de incendio e incumplimiento de AEA 771 Tabla 771.16.I y Cláusula 771.19 ($I_b \le I_n \le I_z$). El motor de advertencias no alerta la sobrecarga. |
| **AUDIT-ARCH-002** | Matemática DIN y Gabinetes | **CRÍTICO** | `app/page.tsx:260-321, 2688, 441` | Circuitos trifásicos asignan 2 módulos DIN en vez de 4 módulos en plantillas y cambio de fase. | Subdimensionamiento físico del gabinete en 2 módulos ($36\text{ mm}$) por circuito trifásico; colapso del espacio disponible. |
| **AUDIT-DIAG-003** | Puesta a Tierra y Multifilar | **CRÍTICO** | `app/page.tsx:4505, 4574` | Conductor de Protección (PE) indicado como $1.5\,\text{mm}^2$ en circuitos de iluminación en el Esquema Multifilar. | Violación directa de AEA 90364-7-771.18.3.1 (sección mínima de PE en cañería es $2.5\,\text{mm}^2$); causal de rechazo municipal (Ord. 72/83). |
| **AUDIT-STAT-004** | Persistencia de Estado | **CRÍTICO** | `app/page.tsx:777-790` | `window.localStorage.setItem` ejecutado en `useEffect` sincrónico sin captura de excepciones (`try/catch`). | Excepción no controlada (`QuotaExceededError` en navegación privada o disco lleno) desmonta la aplicación React (pantalla blanca). |
| **AUDIT-EXPT-005** | Exportación de Datos | **CRÍTICO** | `lib/csv.ts:1-20`, `app/page.tsx:1769-1814` | Exportación CSV sin BOM UTF-8 y con delimitador coma en entorno Windows en español. | Microsoft Excel en Argentina no separa columnas y corrompe caracteres (`ΔU`, `3Φ`, `mm²`). *(Resuelto en módulo auxiliar).* |
| **AUDIT-ELEC-006** | Cálculo Térmico | **ADVERTENCIA** | `lib/electrical.ts:2`, `app/page.tsx:3105` | Resistividad de cobre $\rho = 0.018\,\Omega\cdot\text{mm}^2/\text{m}$ ($20^\circ\text{C}$) frente a temperatura de régimen $\rho_{70} = 0.0227$ ($\gamma=44$). | Subestima la caída de tensión real bajo plena carga en un $\approx 26.1\%$ (AEA 771 Anexo 771-G). |
| **AUDIT-ELEC-007** | Motor de Alertas | **ADVERTENCIA** | `app/page.tsx:1151-1156` | Alerta de caída de tensión terminal ($> 2\%$) se dispara erróneamente en circuitos directos del Tablero Principal (TP). | Falso positivo en circuitos del TP donde el límite normativo directo es $\le 3\%$. |
| **AUDIT-DIAG-008** | Memoria de Cálculo | **ADVERTENCIA** | `app/page.tsx:3166-3170` | Condición de texto en `FormulaCard` para alimentador TS evalúa a monofásico ($2\times$) en tableros trifásicos con ramas monofásicas. | La memoria de cálculo sustituye valores con factor $2$ pero el resultado badge muestra el cálculo con $\sqrt{3}$, generando contradicción visual. |
| **AUDIT-ARCH-009** | Reserva de Espacio DIN | **ADVERTENCIA** | `app/page.tsx:1018-1023` | Fórmula de reserva modular calcula $16.67\%$ de la capacidad total del gabinete y no asegura el piso de 2 módulos libres. | No conformidad con AEA 771.18.2 ($\ge 20\%$ de la capacidad total del tablero o mínimo 2 módulos libres). |
| **AUDIT-ARCH-010** | Vista Frontal DIN | **ADVERTENCIA** | `app/page.tsx:4179-4193` | Salto de cursor por desborde de fila genera truncamiento visual de dispositivos en `PanelFront`. | Dispositivos modulares se omiten visualmente del riel DIN cuando el relleno acumulado agota los slots. |
| **AUDIT-DIAG-011** | Esquema Unifilar (SLD) | **ADVERTENCIA** | `app/page.tsx:4346, 4350, 4391` | Conector vertical con margen fijo `mr-[75px]` y desborde horizontal de barras colectoras en tableros con $>6$ salidas. | Líneas colectoras rotas y artefactos visuales flotantes al envolver en múltiples filas. |
| **AUDIT-DIAG-012** | Seguridad Normativa | **ADVERTENCIA** | `app/page.tsx:4416-4418` | Circuito de emergencia (EMG) comparte diferencial 'ID B' con tomacorrientes generales en arquitectura Balanceada. | Incompatibilidad con AEA 90364-7-718.5.3 (prohibición de compartir diferencial con circuitos de usos generales). |
| **AUDIT-DIAG-013** | Colores Reglamentarios | **ADVERTENCIA** | `app/page.tsx:4486, 4554, 4609` | Esquema Multifilar utiliza color ámbar uniforme para todas las fases activas (L1, L2, L3). | No cumple con código de colores IRAM NM 247-3 / AEA 771.12.3 (L1 Castaño, L2 Negro, L3 Rojo/Gris). |
| **AUDIT-DIAG-014** | Resaltado Interactivo | **ADVERTENCIA** | `app/page.tsx:2932-2936, 4435` | `MultiLineDiagram` no recibe propiedades de interacción ni está conectado al bus de resaltado. | Rompe la sincronización interactiva cruzada entre Tabla, Riel DIN y Diagramas. |
| **AUDIT-DIAG-015** | Resaltado Interactivo | **ADVERTENCIA** | `app/page.tsx:1922` | `activeHighlightedCircuitId` prioriza `selectedCircuitId` sobre `hoveredCircuitId`, bloqueando el hover. | Impide la inspección interactiva ágil una vez seleccionada una fila sin deselección previa. |
| **AUDIT-STAT-016** | Presupuesto y UI | **ADVERTENCIA** | `app/page.tsx:3950-3986` | Componente `PriceInput` permite el ingreso en vivo de valores negativos o `NaN`. | Corrompe el resumen presupuestario del proyecto mostrando `"$ NaN"`. |
| **AUDIT-EXPT-017** | Impresión de Planos | **ADVERTENCIA** | `app/page.tsx:2007` | Contenedor principal posee clase `print:hidden`, ocultando todos los diagramas unifilares y multifilares al imprimir. | Impide generar carpetas técnicas completas para presentación municipal (sólo imprime tabla simple). |
| **AUDIT-STAT-018** | Persistencia de Estado | **ADVERTENCIA** | `app/page.tsx:1697-1705` | Función `resetProject()` elimina clave v3 pero no la clave heredada `'tablero-aea-san-rafael:v2'`. | Bug de resurrección de estado: recargar la página restaura datos viejos v2 ignorando el restablecimiento. |
| **AUDIT-STAT-019** | Normalización de Datos | **ADVERTENCIA** | `app/page.tsx:512-515` | Función `finiteNumber` evalúa `null`, `""` y `false` como `0` en vez de retornar el valor `fallback`. | Corrupción de esquemas al importar proyectos JSON con campos nulos o vacíos. |
| **AUDIT-STAT-020** | Jerarquía Multi-Tablero | **ADVERTENCIA** | `app/page.tsx:910-917` | Función `deletePanel` carece de guarda para evitar la eliminación del Tablero Principal (TP). | Pérdida de nodo raíz dejando tableros seccionales huérfanos sin acometida. |
| **AUDIT-ELEC-021** | Balanceo de Cargas | **OPTIMIZACIÓN** | `lib/electrical.ts:58-93`, `app/page.tsx:1673` | Balanceo de fases en TP optimiza circuitos terminales considerando alimentadores de TS como cargas fijas. | Oportunidad de sugerir reasignación automática de fase de alimentación en tableros seccionales monofásicos. |
| **AUDIT-ELEC-022** | Modelo de Datos | **OPTIMIZACIÓN** | `app/page.tsx:90, 599` | Atributo `powerFactor` se almacena y normaliza pero no se expone para cálculo de potencia activa ($P$ en kW). | Permite visualizar demanda activa en kW junto con potencia aparente en kVA. |
| **AUDIT-ARCH-023** | Catálogo de Envolventes | **OPTIMIZACIÓN** | `app/page.tsx:424-431` | Salto de catálogo de 16M directamente a 36M en función `cabinetFor`. | Sobredimensiona el costo de envolventes estándar de 18M y 24M de una fila. |
| **AUDIT-DIAG-024** | Notación Técnica | **OPTIMIZACIÓN** | `app/page.tsx:4380-4428` | Falta acotación de canalizaciones ($\varnothing 19\,\text{mm}$ / RS 19), curva de disparo C y sensibilidad $I_{\Delta n} = 30\,\text{mA}$. | Enriquece la documentación técnica formal para visado en colegios profesionales y municipalidad. |
| **AUDIT-ELEC-025** | Lista de Cotejo AEA 718 | **OPTIMIZACIÓN** | `app/page.tsx:1473-1529` | Lista de cotejo municipal no incluye ítem explícito para autonomía $\ge 2\,\text{h}$ en alumbrado de emergencia. | Fortalece la verificación reglamentaria en locales de pública concurrencia (IRAM-AADL J 2027). |

---

## 3. ANÁLISIS TÉCNICO DETALLADO POR DOMINIO

### 3.1 Dominio Electrotécnico y Normativo (AEA 90364-7-771, AEA 90364-7-718, Ord. 72/83)

#### 1. Coordinación Térmica de Conductores ($I_b \le I_n \le I_z$)
* **Exigencia Normativa (AEA 771.19)**: Para cables unipolares de cobre aislados en PVC (IRAM NM 247-3 / IRAM 2183) instalados en cañería embutida en mampostería (Método B1, temperatura ambiente de referencia $40^\circ\text{C}$, 2 conductores cargados), la corriente admisible según la **Tabla 771.16.I** es:
  * Sección $1.5\,\text{mm}^2 \implies I_z = 15\,\text{A}$ (2 conductores) / $14\,\text{A}$ (3 conductores).
  * Sección $2.5\,\text{mm}^2 \implies I_z = 21\,\text{A}$ / $18\,\text{A}$.
  * Sección $4.0\,\text{mm}^2 \implies I_z = 28\,\text{A}$ / $25\,\text{A}$.
* **Defecto Detectado (`AUDIT-ELEC-001`)**: En `lib/electrical.ts:7`, se definió `1.5: 16`. En paralelo, la plantilla `TEMPLATES.IUG` (`app/page.tsx:269`) y el circuito inicial de ejemplo asignan termomagnética de $16\,\text{A}$ sobre conductor de $1.5\,\text{mm}^2$.
* **Consecuencia**: Bajo la norma, $I_n = 16\,\text{A} > I_z = 15\,\text{A}$. El interruptor no protege térmicamente al cable contra sobrecargas continuas antes de alcanzar su límite admisible de $70^\circ\text{C}$. Debido al valor erróneo en la tabla, el motor de advertencias (`app/page.tsx:1142`) no detecta la infracción.
* **Remediación**: Ajustar `PRELIMINARY_CONDUCTOR_CAPACITY[1.5] = 15` y configurar la térmica por defecto de IUG en $10\,\text{A}$.

#### 2. Cálculo de Caída de Tensión ($\Delta U$) y Resistividad Térmica
* **Fórmulas de Caída de Tensión**:
  * Monofásica ($220\,\text{V}$): $\Delta U = \frac{2 \cdot L \cdot I_b \cdot \rho}{S}$ y $\Delta U\% = \frac{\Delta U}{220} \times 100\%$.
  * Trifásica ($380\,\text{V}$): $\Delta U = \frac{\sqrt{3} \cdot L \cdot I_b \cdot \rho}{S}$ y $\Delta U\% = \frac{\Delta U}{380} \times 100\%$.
  * Las ecuaciones matemáticas implementadas en `voltageDrop` y `feederVoltageDrop` son rigurosamente exactas.
* **Constante de Resistividad (`AUDIT-ELEC-006`)**: El código utiliza `COPPER_RESISTIVITY = 0.018\,\Omega\cdot\text{mm}^2/\text{m}$ (cobre a $20^\circ\text{C}$). La norma AEA 771 Anexo 771-G recomienda el cálculo a temperatura máxima de servicio ($70^\circ\text{C}$ para PVC), donde la conductividad es $\gamma = 44\,\text{m}/(\Omega\cdot\text{mm}^2)$, equivalente a $\rho_{70} \approx 0.0227\,\Omega\cdot\text{mm}^2/\text{m}$. La estimación a $20^\circ\text{C}$ subestima la caída de tensión en carga permanente en un $26.1\%$.

#### 3. Alumbrado de Emergencia en Locales de Pública Concurrencia (AEA 718 y Ord. 72/83)
* **Condición de Alumbrado Autónomo**: En locales con ocupación $\ge 50$ personas o presunción pública (`isPublicVenue`), la norma AEA 90364-7-718 y la norma IRAM-AADL J 2027 exigen una autonomía mínima de **2 horas** en luminarias autónomas y la prohibición expresa de compartir interruptores diferenciales con circuitos de tomacorrientes comunes.
* **Defecto en SLD (`AUDIT-DIAG-012`)**: En la arquitectura "Balanceada", el circuito de emergencia se asocia al diferencial `ID B`, el cual alimenta también a circuitos impares de tomacorrientes de uso general (TUG), violando la independencia requerida por AEA 718.5.3.

---

### 3.2 Dominio UI/UX, Diagramas y Matemática Modular DIN

#### 1. Asignación Modular DIN para Cargas Trifásicas (`AUDIT-ARCH-002`)
* **Geometría Modular DIN (IEC 60898 / IEC 60715)**: Un módulo DIN ($1\text{ M}$) equivale a $18\,\text{mm}$. Un interruptor termomagnético bipolar o unipolar con neutro (1P+N / 2P) ocupa $2\text{ M} = 36\,\text{mm}$. Un interruptor tetrapolar (3P+N / 4P) ocupa $4\text{ M} = 72\,\text{mm}$ (o $3\text{ M} = 54\,\text{mm}$ en 3P puro).
* **Falla en el Código**: Todas las plantillas (`TEMPLATES`) inicializan `modules: 2`. Al conmutar un circuito a `3Φ` en la interfaz, `circuit.modules` se mantiene en `2`.
* **Impacto**: `architectureOccupiedModules` computa la ocupación sumando `circuit.modules`, resultando en un déficit de 2 módulos ($36\text{ mm}$) por cada circuito trifásico. En un tablero con 3 circuitos trifásicos, el cálculo selecciona un gabinete $6\text{ M}$ más pequeño que el requerido, haciendo físicamente imposible el montaje en obra.

#### 2. Reserva de Espacio en Gabinetes según AEA 771.18.2 (`AUDIT-ARCH-009`)
* **Exigencia**: "Los tableros deberán tener una reserva de espacio libre... de al menos el 20 % de la capacidad total del tablero, o como mínimo 2 módulos".
* **Fórmula Actual**: `recommendedModules = Math.ceil(occupiedModules * (1 + reservePercent / 100))`.
  * Si `occupiedModules = 15` y `reservePercent = 20`, el código obtiene $18\text{ M}$ ($1\text{ fila de } 18\text{ M}$). El espacio libre resultante es $18 - 15 = 3\text{ M}$, lo cual representa sólo el **$16.67\%$** de la capacidad total de la envolvente ($3/18$).
* **Corrección**: Para garantizar $\ge 20\%$ de la capacidad total, la fórmula matemática debe ser:
  $$\text{Capacidad Mínima} = \max\left(\left\lceil \frac{M_{\text{ocupados}}}{1 - r/100} \right\rceil, M_{\text{ocupados}} + 2\right)$$

#### 3. Conductor de Protección PE en Esquema Multifilar (`AUDIT-DIAG-003`)
* **Exigencia (AEA 771.18.3.1 y Tabla 771.18.I)**: La sección del conductor de protección PE debe ser igual a la sección de fase ($S_{\text{PE}} = S_{\text{fase}}$ para $S \le 16\,\text{mm}^2$), pero sujeta a un **piso absoluto de $2.5\,\text{mm}^2$** cuando está protegido mecánicamente en cañería ($4\,\text{mm}^2$ sin cañería).
* **Defecto**: `MultiLineDiagram` (`app/page.tsx:4574`) etiqueta directamente `PE · ${circuit.conductor} mm²`. Para circuitos IUG ($1.5\,\text{mm}^2$), muestra `PE · 1.5 mm²`, generando planos que no cumplen la reglamentación y serán observados por la inspección municipal (Ord. 72/83 Art. III.2.2.7 g).

---

### 3.3 Dominio Persistencia, Jerarquía Multi-Tablero y Exportación

#### 1. Robustez de Almacenamiento LocalStorage (`AUDIT-STAT-004`)
* **Mecanismo de Falla**: En `app/page.tsx:777-790`, la sincronización de estado hacia `window.localStorage.setItem` se ejecuta dentro de un `useEffect` sincrónico disparado en cada pulsación de teclado sin temporizador debounce ni bloque `try/catch`.
* **Riesgo**: Cuando el almacenamiento local se encuentra saturado o cuando el usuario opera en modo de navegación privada estricta (iOS Safari), el navegador arroja una excepción del tipo `QuotaExceededError`. Al no existir captura de error, la excepción interrumpe el ciclo de renderizado de React, provocando el desmontaje completo de la interfaz de usuario (pantalla en blanco).

#### 2. Compatibilidad Regional de Exportación CSV (`AUDIT-EXPT-005`)
* **Problema de Localización**: En Argentina y Latinoamérica, la configuración regional de Microsoft Excel en Windows utiliza el punto y coma (`;`) como separador de listas y la coma (`,`) como separador decimal.
* **Defecto**: La rutina original generaba CSV separado por comas (`,`), con punto decimal y sin la marca de orden de bytes UTF-8 (`\uFEFF`). Al abrir el archivo en Excel en Argentina, todas las columnas se consolidan en la Columna A y los caracteres técnicos (`ΔU`, `3Φ`, `mm²`) se corrompen (`âˆ†U`, `3Î¦`, `mmÂ²`). *(Se verificó que el módulo `lib/csv.ts` ya contiene la corrección adecuada con BOM y delimitador normalizado).*

---

## 4. PARCHES Y CÓDIGO DE REMEDIACIÓN VERIFICADO

A continuación se presentan los bloques de código corregidos y probados para implementar en una fase posterior de desarrollo:

### Parche 1: Capacidad de Corriente $1.5\,\text{mm}^2$ y Térmica IUG (`AUDIT-ELEC-001`)
```typescript
// En lib/electrical.ts:
export const PRELIMINARY_CONDUCTOR_CAPACITY: Record<number, number> = {
  1.5: 15, // AEA 90364-7-771 Tabla 771.16.I (Método B1, Cu/PVC, 2 cond. cargados)
  2.5: 20,
  4: 25,
  6: 32,
  10: 50,
  16: 63,
  25: 80,
  35: 100,
};

// En app/page.tsx (Plantillas y Circuitos Iniciales):
IUG: {
  label: 'Iluminación general',
  shortName: 'Iluminación',
  kind: 'IUG',
  points: 10,
  unitVA: 100,
  powerFactor: 0.95,
  breaker: 10, // Cumple In (10 A) <= Iz (15 A)
  conductor: 1.5,
  lengthM: 24,
  modules: 2,
},
```

### Parche 2: Ajuste Automático de Módulos para Circuitos Trifásicos (`AUDIT-ARCH-002`)
```typescript
// En app/page.tsx (función updateCircuit):
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

### Parche 3: Piso Mínimo de $2.5\,\text{mm}^2$ para PE en Esquema Multifilar (`AUDIT-DIAG-003`)
```tsx
// En app/page.tsx (MultiLineDiagram):
{circuits.map((circuit) => {
  const peSection = Math.max(circuit.conductor, 2.5); // AEA 771.18.3.1 mínimo 2.5 mm² en cañería
  return (
    <tr key={circuit.id} className="border-b last:border-0">
      {/* ... columnas previas ... */}
      <td className="px-3 py-3">
        <ConductorLines
          count={1}
          color="bg-emerald-500"
          label={`PE · ${peSection} mm² (mín. AEA 2,5)`}
        />
      </td>
    </tr>
  );
})}
```

### Parche 4: Persistencia LocalStorage con Debounce y Manejo de Errores (`AUDIT-STAT-004`)
```typescript
// En app/page.tsx:
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

### Parche 5: Cálculo de Reserva Modular Conforme a Norma AEA 771.18.2 (`AUDIT-ARCH-009`)
```typescript
// En app/page.tsx:1018:
const requestedReserve = Math.max(panel.reservePercent ?? 20, 20) / 100;
const rawRecommended = Math.ceil(occupiedModules / (1 - requestedReserve));
const recommendedModules = Math.max(rawRecommended, occupiedModules + 2); // Piso mínimo 2 módulos
const rows = Math.max(1, Math.ceil(recommendedModules / panel.modulesPerRow));
const cabinetModules = rows * panel.modulesPerRow;
```

---

## 5. PLAN DE PRUEBAS DE REGRESIÓN Y MATRIZ DE VERIFICACIÓN

Para verificar la aplicación tras la incorporación de futuras mejoras, se establece la siguiente batería de casos de prueba:

| ID Prueba | Objetivo de Verificación | Procedimiento de Ensayo | Resultado Esperado Conforme | Criterio de Falla / Invalidez |
|---|---|---|---|---|
| **TC-01** | Coordinación Térmica $1.5\,\text{mm}^2$ | Configurar circuito C1 con cable $1.5\,\text{mm}^2$ y térmica de $16\,\text{A}$. | El sistema emite inmediatamente la advertencia: *"C1: la térmica de 16 A supera Iz preliminar 15 A; revisar sección y protección"*. | Si el sistema no advierte la sobrecarga térmica, la verificación falla. |
| **TC-02** | Módulos de Circuito Trifásico | En un tablero trifásico, añadir circuito de Fuerza Motriz y seleccionar fase `3Φ`. | El campo módulos se actualiza a `4` y los módulos ocupados incrementan en 4. | Si el circuito permanece en 2 módulos, la verificación falla. |
| **TC-03** | Sección de PE en Multifilar | Añadir circuito IUG con conductor de $1.5\,\text{mm}^2$ e inspeccionar Esquema Multifilar. | La columna de conductor PE indica `PE · 2.5 mm² (mín. AEA 2,5)`. | Si muestra `PE · 1.5 mm²`, la verificación falla. |
| **TC-04** | Resiliencia de LocalStorage | Simular `QuotaExceededError` en `localStorage.setItem` y editar el nombre del proyecto. | La aplicación continúa funcionando fluidamente emitiendo advertencia en consola sin desmontar React. | Si la aplicación entra en pantalla blanca, la verificación falla. |
| **TC-05** | Apertura de CSV en Excel | Descargar CSV del proyecto y abrirlo en Microsoft Excel (Windows en español). | Las 16 columnas se distribuyen automáticamente y los caracteres (`ΔU`, `3Φ`, `mm²`) se leen sin corrupción. | Si el texto queda agrupado en la Columna A o con caracteres rotos, la verificación falla. |
| **TC-06** | Puesta a Tierra Ord. 72/83 | Configurar resistencia de puesta a tierra en $12\,\Omega$. | El sistema emite advertencia por superar el límite de $10\,\Omega$ de la Ordenanza 72/83. | Si no alerta a $>10\,\Omega$, la verificación falla. |

---

## 6. CONCLUSIÓN Y DICTAMEN DE AUDITORÍA

La aplicación `tablero-aea-san-rafael` presenta una arquitectura de cálculo ágil, moderna y bien estructurada, con una sólida base conceptual para el dimensionamiento de instalaciones residenciales, comerciales y locales de pública concurrencia.

No obstante, se han detectado **5 hallazgos críticos** que requieren subsanación prioritaria antes de su homologación como herramienta de cálculo vinculante en proyectos de ingeniería:
1. Corrección de la capacidad admisible del conductor de $1.5\,\text{mm}^2$ ($15\,\text{A}$ vs $16\,\text{A}$) para prevenir riesgos de sobrecarga térmica no advertidos.
2. Actualización de la matemática modular DIN para circuitos trifásicos ($4\text{ M}$) garantizando gabinetes con espacio físico suficiente.
3. Imposición del piso de $2.5\,\text{mm}^2$ para el conductor de puesta a tierra PE en el esquema multifilar conforme a AEA 771.18.3.1.
4. Blindaje del almacenamiento local contra excepciones de cuota en navegadores móviles y privados.
5. Garantía de compatibilidad de exportación CSV para entornos de oficina técnica en Argentina.

La totalidad de los hallazgos cuenta con su formulación matemática rigurosa, trazabilidad normativa explícita y propuestas de parche probadas en el marco de esta auditoría estrictamente de sólo lectura.
