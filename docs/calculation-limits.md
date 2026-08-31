# Modelo de cálculo y límites

Actualizado: 30/08/2026. Esta herramienta sigue siendo de **predimensionamiento**.
Las pruebas de software no certifican AEA ni aprobación municipal.
Ver el contraste de los 25 hallazgos en `audit-2026-08-30.md`.

## Corriente admisible

La referencia es [Prysmian Superastic Jet/Flex, ficha 2020, p. 3](https://latam.prysmian.com/sites/latam.prysmian.com/files/media/documents/PRY2020_Superastic%20Jet.pdf):
cobre flexible, PVC 70 °C, unipolares en cañería, ambiente base 40 °C.
Para 1,5 mm²: 15 A con dos cargados y 14 A con tres. Se aplican los factores
de esa ficha para ambiente 20/30/40 °C y agrupamiento de 1/2/3 circuitos.

**No es una especificación LS0H ni una tabla universal AEA.** Otro cable,
método, más agrupamiento o armónicos necesita Iz corregida declarada y su fuente.
Se exige valor positivo y referencia; la herramienta no verifica su veracidad.
Cambiar sección o fase desde el editor invalida la Iz manual. Importar JSON
normaliza datos, no audita documentos técnicos.

El optimizador conserva una térmica que cumple `Ib ≤ In ≤ Iz` bajo esos supuestos,
o busca otra comercial compatible. El 15 % es un margen opcional: nunca autoriza
superar Iz. Si no hay calibre compatible, conserva el dato y avisa; no cambia cable
ni afirma seguridad. Cabecera y orden de calibres no verifican selectividad, I2,
energía pasante, desconexión ni poder de corte real.

## Caída de tensión

Se usa R20 máxima de la ficha de cobre flexible y
`Rθ = R20 × [1 + 0,00393 × (θ − 20)]`, en Ω/m. Por defecto, θ = 70 °C del
**conductor**, no ambiente. 20 °C es comparación en frío; 90 °C requiere justificar
la aislación. La Iz manual no cambia automáticamente la resistencia de referencia.
No se modelan aluminio, reactancia, armónicos, arranque ni impedancia compleja.
[Prysmian: corrección por temperatura](https://www.prysmianclub.es/n2-calculos-de-caidas-de-tension-valores-oficiales-de-conductividad-para-cu-y-al/).

- Monofásico: `ΔV = 2 × Rθ × L × Ib`, base 220 V.
- Solo cargas trifásicas equilibradas: factor √3, base 380 V.
- TS trifásico mixto: envolvente fase-neutro con factor 2, base 220 V y fase más
  cargada; supone fase/neutro de igual sección, cargas sinusoidales y factores
  de potencia similares. No es una solución fasorial exacta.

Texto, sustitución y resultado usan los mismos datos de la función. Se acumulan
porcentajes de alimentador y circuito; el total en voltios usa la tensión terminal,
sin sumar directamente voltios fase-fase con fase-neutro.

El [corrigendum 2 de AEA 771](https://aea.org.ar/wp-content/uploads/2017/10/aea_90364_7_771_corrigendum_02.pdf)
distingue el total desde TP (3 % sin motores; 5 % motores en régimen) del reparto
recomendado por tramos. El archivo municipal aportado, III.2.9.4, indica además
2 % para cables de circuitos: se conserva como aviso **municipal separado**.
Confirmar criterios vigentes del expediente. El tramo previo al TP no se calcula.

## Potencia y jerarquía

La carga ingresada es aparente (VA). `P = S × FP declarado` es potencia activa
instalada estimada (W/kW), no medida; no reduce Ib. FP no siempre es cos φ con
cargas no lineales. TP suma la potencia propia de cada TS una sola vez.
Cada TS conserva su simultaneidad; el balanceador considera esa demanda antes
de repartir cargas propias del TP. No altera fases de alimentadores ni promete
un óptimo global. Rechaza repartos que empeoren el máximo o la dispersión.

## Tablero y diagramas

El corte local del TS representa un interruptor-seccionador para maniobra, no una
protección automática contra sobrecorrientes. Su calibre no habilita esa corriente
de consumo. La térmica del alimentador se conserva tal como fue elegida: no se
aumenta para igualarla al corte local. El chequeo `Ib ≤ In ≤ Iz` y la caída del
alimentador se muestran tanto en su TS como en el TP, junto a la vista DIN y en
la impresión. Si `Ib > Iz`, se advierte que cambiar solo la térmica no resuelve
la incompatibilidad. No se certifican categoría de empleo ni coordinación real.

Se modelan térmicas 2P/4P de al menos 2/4 módulos; confirmar ancho del producto.
Los ID son equipos separados. Económica: 1 ID normal + 1 ID EMG. Equilibrada:
ID A para IUG, ID B para TUG/TUE/FM e ID EMG. Domiciliaria: 1 ID común, incluida
EMG si se agrega; muestra advertencia en pública concurrencia. Los grupos vacíos
de las opciones de salón se reservan como equipos reales (espacio y precio);
un tablero sin circuitos propios tiene 0 ID terminales. La selección es por
tablero, no un límite de 2/3/1 para todo el proyecto TP/TS.

La configuración antigua por circuito se conserva al cargar proyectos, pero no
se ofrece como nueva opción. Separar grupos no demuestra cumplimiento completo
de AEA 718 ni garantiza que una protección común no corte toda la instalación.

Una lista común de equipos alimenta dimensionado/dibujo; los mismos grupos definen
el presupuesto. Equipos enteros por fila, contando huecos al cambiar de riel.
Política de reserva: ≥20 % del total libre y ≥2 módulos. No se afirma haber
verificado una cláusula AEA completa de reserva no obtenida.

PE de circuito: `máx(2,5 mm²; sección activa)`, sin cálculo adiabático ni reducción.
Conexión tablero–electrodo: otro conductor (mínimo 4 mm² en el texto municipal).
N se representa de igual sección que fase, sujeto a verificación por armónicos.
Colores acompañados de letras; DPS como derivación en paralelo. Respaldo, bornes,
neutros separados y coordinación requieren proyecto definitivo.

Los esquemas son funcionales, no conexiones de ejecución. Cañerías: anotaciones
manuales, sin calcular diámetro, ocupación ni curvas. Impresión incluye tablas,
frontal, unifilar y cuadro multifilar de cada TP/TS. Seleccionar escala no genera
un plano de planta a escala.

## Costos, datos y verificaciones pendientes

Gabinetes 16/18/24/36/54/72 M editables. 18/24 M se estimaron proporcionalmente
desde el precio heredado de 36 M; no son cotizaciones actuales. Verificar filas,
dimensiones, marca, IP y disipación. Más de 72 M es una equivalencia económica,
no diseño de varios gabinetes. No incluye conductores/canalizaciones de campo.
Se retiraron los índices comparativos fijos: no se asigna porcentaje de seguridad
ni se presenta una arquitectura como mínimo reglamentario automáticamente.

CSV: UTF-8 con BOM, punto y coma, coma decimal, CRLF, escape de nombres y
neutralización de fórmulas. Alimentadores muestran demanda aparente; circuitos,
potencia instalada. No sumar filas indiscriminadamente. La columna P es instalada.

Guardado local: lectura/escritura/reset capturan fallos y avisan para exportar JSON.
Lectura corrupta bloquea autosave para preservar los datos originales.
Reset escribe primero v3 y después elimina v2; si falla la escritura, avisa que
solo reinició en memoria.

Emergencia: ≥2 h y referencia para los usos municipales comprendidos es una
**declaración**, no evidencia validada. Faltan encendido automático, iluminancia,
señalización, ensayos y encuadre. Ingresar RA/Ik o marcar tareas no prueba medición.

## Verificación de software

`npm test` cubre unidades, barridos de reserva/encaje y protección, almacenamiento,
CSV e integración del código real de la página: cálculos, costos y contenido
de esquemas/impresión. Componentes renderizados en servidor con primitivas UI
sustituidas; no es un navegador. Paginación y aspecto final no se verificaron
visualmente. Se comprueban además tipos, lint y ambos destinos de compilación.

## Tablas Normativas de Referencia (AEA 90364 / IRAM 2183)

### 1. Capacidad de Corriente Admisible ($I_z$) - Cu/PVC 70 °C en cañería embutida B1 a 40 °C

| Sección ($mm^2$) | Monofásica (2 cond. cargados) | Trifásica (3 cond. cargados) | Térmica ($I_n$) sugerida | Resistencia $R_{20}$ máx. | PE sugerido |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **1,5** | **15 A** | **14 A** | 10 A (máx. 13 A / 15 A) | 13,30 Ω/km | 2,5 mm² |
| **2,5** | **21 A** | **18 A** | 16 A (máx. 20 A monof.) | 7,98 Ω/km | 2,5 mm² |
| **4,0** | **28 A** | **25 A** | 20 A / 25 A | 4,95 Ω/km | 4,0 mm² |
| **6,0** | **36 A** | **32 A** | 32 A | 3,30 Ω/km | 6,0 mm² |
| **10,0** | **50 A** | **44 A** | 40 A / 50 A | 1,91 Ω/km | 10,0 mm² |
| **16,0** | **66 A** | **59 A** | 50 A / 63 A | 1,21 Ω/km | 16,0 mm² |
| **25,0** | **88 A** | **77 A** | 63 A / 80 A | 0,78 Ω/km | 16,0 mm² |
| **35,0** | **109 A** | **96 A** | 80 A / 100 A | 0,554 Ω/km | 16,0 mm² |

* **Fórmula de corrección de corriente:** $I_z = I_{tabla} \times f_t \times f_a$
  * $f_t$ (temperatura): $20^\circ\text{C} \rightarrow 1,29 \cdot 30^\circ\text{C} \rightarrow 1,15 \cdot 40^\circ\text{C} \rightarrow 1,00$.
  * $f_a$ (agrupamiento): $1\text{ cto.} \rightarrow 1,00 \cdot 2\text{ ctos.} \rightarrow 0,80 \cdot 3\text{ ctos.} \rightarrow 0,70$.
* **Regla de coordinación y protección contra sobrecargas:**
  $$I_B \le I_n \le I_z \quad \text{y} \quad I_2 \le 1,45 \times I_z$$

### 2. Secciones Mínimas Normativas por Tipo de Circuito / Conexión (AEA 90364-7-770 / 771)

| Tipo de Circuito / Conexión | Sigla | Sección Mínima | Térmica ($I_n$) Máxima | Criterio y Destino |
| :--- | :---: | :---: | :---: | :--- |
| **Iluminación Uso General** | `IUG` | **1,5 mm²** | 16 A (sugerida 10 A) | Bocas fijas de iluminación (máx. 15 bocas) |
| **Tomacorrientes Uso General** | `TUG` | **2,5 mm²** | 20 A (sugerida 16 A) | Tomas de 10 A estándar (máx. 15 bocas) |
| **Iluminación Uso Especial** | `IUE` | **2,5 mm²** | 20 A (sugerida 16 A) | Iluminación a la intemperie / alta potencia (máx. 12 bocas) |
| **Tomacorrientes Uso Especial** | `TUE` | **2,5 mm²** | 32 A (sugerida 20 A) | Tomas de 20 A para cargas específicas (máx. 12 bocas) |
| **Línea Seccional (TP → TS)** | `L. Sec.` | **2,5 mm² / 4,0 mm²** | Según $I_z$ | Alimentador entre TP y TS (2,5 mm² en 770 / 4 mm² en 771) |
| **Línea Principal (Medidor → TP)** | `L. Princ.` | **4,0 mm²** | Según demanda | Acometida desde medidor hasta IGA del TP |
| **Conductor de Protección (PE)** | `PE` | **2,5 mm² / = Fase** | Sin interruptor | Conductor verde-amarillo a todas las masas metálicas |
| **Conductor a Electrodo (PAT)** | `PAT` | **4,0 mm² / 10 mm²** | Directo a jabalina | Conexión tablero-jabalina ($R_A \le 10\,\Omega$) |
| **Retornos de Interruptor** | `Retorno` | **1,5 mm²** | Según IUG | Cable entre interruptor de efecto y luminaria |

* **Criterio de sección adoptada:**
  $$S_{adoptada} = \max\left(S_{mínima\_normativa},\; S_{(I_z \ge I_n)},\; S_{(\Delta V \le \Delta V_{máx})}\right)$$
* **Fórmula de Caída de Tensión ($\Delta V$):**
  * Monofásica: $\Delta V = 2 \times R_\theta \times L \times I_B \quad \Longrightarrow \quad \Delta V\% = 100 \times \frac{\Delta V}{220}$
  * Trifásica: $\Delta V = \sqrt{3} \times R_\theta \times L \times I_B \quad \Longrightarrow \quad \Delta V\% = 100 \times \frac{\Delta V}{380}$
  * Límites reglamentarios AEA: Iluminación/Tomas $\le 3,0\%$; Fuerza Motriz $\le 5,0\%$; Línea seccional $\le 1,0\%$.

