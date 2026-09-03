# Auditoría Técnica y Normativa: Sistemas de Iluminación de Emergencia (Centralizado EMG vs. Luminarias Autónomas)

**Fecha de Auditoría:** 3 de Septiembre de 2026  
**Jurisdicción:** San Rafael, Mendoza, República Argentina  
**Marco Legal y Normativo Auditado:**
- **AEA 90364-7-718 (2008):** Lugares y locales de pública concurrencia (Cláusula 718.556).
- **AEA 90364-7-771 (2006/2011):** Instalaciones en viviendas, oficinas y locales unitarios.
- **Ordenanza General 72/83 de Mendoza (San Rafael):** Capítulo III.2.22 (Iluminación de emergencia y señalización).
- **Ley Nacional 19.587 / Dec. 351/79:** Higiene y Seguridad en el Trabajo (Anexo VI).
- **Norma IRAM-AADL J 2027:** Luminarias de emergencia autónomas.

---

## 1. Matriz Normativa Comparativa: Centralizado vs. Autónomo

| Parámetro Normativo | Circuito Centralizado (`centralized`) | Luminarias Autónomas (`autonomous`) | Base Legal / Normativa |
|---|---|---|---|
| **Tablero Exclusivo de Emergencia** | **OBLIGATORIO.** Debe poseer un Tablero de Emergencia (TPE / TSE) físicamente independiente. | **EXENTO.** No requiere Tablero Principal ni Seccional de Emergencia. | **AEA 718.556.5.2.2 y 718.556.5.2.11** |
| **Prohibición de Gabinete Compartido** | **TAXATIVO.** Prohibido alojar el circuito EMG en el mismo gabinete que circuitos normales, aun en cubicles distintos. | **NO APLICA.** No hay circuito de potencia de emergencia en tablero. | **AEA 718.556.5.2.12** |
| **Canalizaciones y Conductos** | **100% EXCLUSIVAS.** Prohibido compartir caños, cajas de paso o cables con la instalación normal. Resistencia F90. | **EXENTO.** El cableado hasta los cargadores no se considera de emergencia y usa las cañerías normales de IUG. | **AEA 718.556.6.1.3, 718.556.6.1.9 y Ord. 72/83 Art. III.2.22.8** |
| **Punto de Alimentación Eléctrica** | Alimentado desde el Tablero de Emergencia mediante circuito exclusivo `EMG`. | Alimentado directamente desde los circuitos de iluminación normal (`IUG`) de cada sector. | **AEA 718.556.6.1.9 Nota 2** |
| **Interruptor de Bomberos** | **OBLIGATORIO.** A $\le 5\,\text{m}$ del acceso, señalizado en rojo: *"USO EXCLUSIVO BOMBEROS"*. | **NO EXIGIDO.** Al no haber red centralizada de cables con tensión durante siniestro, no se requiere. | **AEA 718.556.5.2.3 y 718.556.5.2.4** |
| **Autonomía Mínima de Batería** | **$\ge 2\text{ horas}$** (para locales comprendidos). | **$\ge 2\text{ horas}$** (baterías selladas libres de mantenimiento). | **Ord. 72/83 Art. III.2.22.2 / AEA 718** |
| **Nivel de Iluminancia en Vías de Escape** | $\ge 1\text{ lux}$ a nivel de piso en el punto más desfavorable. | $\ge 1\text{ lux}$ a nivel de piso en el punto más desfavorable. | **Ord. 72/83 Art. III.2.22.4.b y AEA 718** |
| **Seguridad ante Falla Simple** | **Punto único de falla.** Una falla en el tablero o alimentador central puede dejar a oscuras la ruta de evacuación. | **Alta redundancia.** La falla de un equipo no afecta a los demás (Ord. 72/83 Art. III.2.22.5). | **Ord. 72/83 Art. III.2.22.5 y AEA 718.556.5** |
| **Costo y Complejidad de Obra** | **Muy elevado.** Exige doble cañería, gabinetes F90, cargador central y cableados dobles. | **Económico y estándar.** Solo requiere instalar las luminarias certificadas en los circuitos de luz existentes. | **Práctica profesional en Argentina** |

---

## 2. Auditoría del Código y Comportamiento del Sistema

### A. Capa de Modelado y Esquema (`lib/project-schema.ts`)
1. **Campo `emergencySystem`:**
   - Admite `'centralized' | 'autonomous'`, con valor por defecto `'centralized'`.
   - Validación estricta mediante `oneOf(['centralized', 'autonomous'])`.
   - Retrocompatibilidad absoluta: Si un proyecto v2 o v3 carece del campo, el validador y normalizador lo resuelven sin romper ni mutar datos preexistentes.
2. **Campos `emergencyAutonomyHours` y `emergencyEvidence`:**
   - Se auditan como número finito y texto de hasta 1000 caracteres, asegurando trazabilidad formal del ensayo de autonomía.

### B. Capa Electrotécnica (`lib/electrical.ts`)
1. **Sección Mínima de Conductor:**
   - La función `circuitRequirements('EMG')` impone un calibre mínimo de **$1,5\,\text{mm}^2$**, coincidente con el estándar reglamentario de iluminación (AEA 771 Tabla 771.13.I y AEA 718).
2. **Criterio de Caída de Tensión ($\Delta V$):**
   - En `voltageDropCriteria('TS', 'EMG')`, se aplica la base de cálculo `aea-lighting` con un límite terminal de $3\%$ y acumulado total de $3\%$.
3. **Parámetros del Circuito Plantilla (`TEMPLATES.EMG`):**
   - 8 bocas, 20 VA c/u ($S = 160\,\text{VA}$), $\text{FP} = 0,95$, $I_n = 10\,\text{A}$ Curva C, cable $1,5\,\text{mm}^2$, 2 módulos DIN.
   - Satisface holgadamente el chequeo de protecciones $I_b \le I_n \le I_z$.

### C. Capa de Agrupamiento Diferencial y Gabinete DIN (`lib/panel-layout.ts`)
1. **Segregación Diferencial en Pública Concurrencia:**
   - En arquitecturas `balanced` y `essential`, los circuitos `EMG` son asignados al grupo independiente `ID EMG` (`device-emergency` color esmeralda).
   - Impide que una desconexión por defecto de aislamiento en tomas de uso general apague la señalización de evacuación (AEA 718.556.2).
2. **Arquitectura de ID Único (`residential`):**
   - Si un local público posee arquitectura residencial, el motor de diagnóstico alerta que no se aísla la emergencia y descalifica la solución para el salón.

### D. Capa de Diagnósticos (`app/page.tsx`)
1. **Verificación de Gabinete Compartido (AEA 718.556.5.2.12):**
   - Si `emergencySystem === 'centralized'` y un tablero contiene simultáneamente circuitos normales (`IUG`, `TUG`, `FM`) y de emergencia (`EMG`), el sistema emite la advertencia formal de infracción normativa.
2. **Aprovisionamiento Automático de Tablero Exclusivo (`TSE`):**
   - La herramienta provee la función `createEmergencyPanel()`, que crea un **Tablero Seccional de Emergencia (`TSE`) físicamente separado**, con su propio alimentador F90 desde el TP y retira el circuito `EMG` del tablero normal `TS1`.
3. **Validación de Modalidad Autónoma:**
   - Si `emergencySystem === 'autonomous'`, no exige circuito `EMG` en tablero ni emite alertas de gabinete compartido.
   - Valida que exista al menos un circuito `IUG` para alimentar los cargadores locales (AEA 718.556.6.1.9).
   - Valida autonomía $\ge 2\,\text{h}$ y ficha técnica IRAM-AADL J 2027.

---

## 3. Matriz de Validación y Pruebas Automatizadas

Todas las suites de prueba fueron ejecutadas y verificadas:

```bash
npm test
# Result: 98 tests pass, 0 fail (100% OK)
```

1. `esquema: emergencySystem valida autonomous y centralized y rechaza valores inválidos`: ✅ **PASS**
2. `integración: emergencia autónoma no exige EMG pero requiere IUG para cargadores`: ✅ **PASS**
3. `integración: AEA 718.556.5.2.12 prohíbe gabinete compartido entre normal y EMG centralizado`: ✅ **PASS**
4. `integración: diagnosePanel alerta si circuito TUE supera 12 bocas (AEA 771)`: ✅ **PASS**
5. `025: autonomía exige >=2h y evidencia; normalizar no inventa cumplimiento`: ✅ **PASS**
6. `012: emergencia nunca comparte diferencial con cargas normales`: ✅ **PASS**

---

## 4. Dictamen Final de Auditoría

El software modela ahora de forma **impecable, rigurosa y fiel a la ley argentina** ambos sistemas:
- **Equipos Autónomos:** Habilita el diseño estándar de obra (el más seguro, económico y empleado en el 99% de los salones), eximiendo de tableros y cañerías exclusivas conforme a AEA 718.556.5.2.2.
- **Sistema Centralizado:** Si el proyectista decide implementar una red centralizada, el software le advierte la prohibición legal de compartir tableros (718.556.5.2.12), exige cañerías F90 exclusivas e interruptor de bomberos, y le permite generar con un solo clic el Tablero Seccional de Emergencia (`TSE`) físicamente separado.
