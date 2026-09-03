# Arquitecturas de diferenciales

## Opciones del selector

| Opción | Diferenciales por tablero con circuitos propios | Asignación | Disparo diferencial local |
| --- | --- | --- | --- |
| Económica · Salón (`essential`) | 2 | ID normal: IUG/TUG/TUE/FM. ID EMG: emergencia. | ID normal corta luces y tomas juntas; EMG está en otro ID. |
| Equilibrada · Continuidad en salón (`balanced`) | 3 | ID A: IUG. ID B: TUG/TUE/FM. ID EMG: emergencia. | Un disparo exclusivo de ID B no abre ID A. |
| Esencial domiciliaria (`residential`) | 1 | ID general: todos los circuitos, incluida EMG si existe. | Corta todos los circuitos del tablero. Advertida en pública concurrencia. |

La clasificación usa el **tipo de circuito**, no el nombre, la fase ni su posición.
Iluminación de salón y altar deben cargarse como IUG; audio/climatización como
TUG/TUE/FM según corresponda. Cambiar tipo recalcula el grupo inmediatamente.

Grupos sin salidas en las opciones de salón aparecen como **reservados**. Se
cuentan como diferenciales físicos en DIN, unifilar y presupuesto, no como módulos
libres. No prueban que exista un circuito de emergencia. Un TP exclusivamente de
tránsito, sin circuitos terminales propios, tiene 0 de estos diferenciales: las
protecciones necesarias de sus alimentadores requieren verificación específica.
Se muestra el número del tablero y la suma de los TP/TS del proyecto.

## Diferencial general del TP

El diferencial del pilar no se deduce de la arquitectura 2/3/1 de los circuitos
terminales. Se guarda como una decisión independiente:

| Opción TP | Uso modelado | Advertencia |
| --- | --- | --- |
| Sin diferencial (`none`) | Línea seccional con condición Clase II documentada. | Si algún alimentador queda pendiente o no es Clase II, el diagnóstico exige revisar la protección contra contactos indirectos. |
| 300 mA selectivo (`selective300`) | Alternativa cuando la autoridad exige diferencial aguas arriba. | Requiere curvas, tiempos y coordinación documentados con los 30 mA interiores. |
| 30 mA instantáneo (`instant30`) | Sólo se presenta para un eventual tablero único. | Con TS aguas abajo se advierte riesgo de corte total del edificio. |

La termomagnética omnipolar de cabecera permanece en las tres opciones. El
selector no certifica la aceptación de la distribuidora, municipio o inspección.

Cada alimentador a TS registra además si se ejecuta con cable IRAM 2178
subterráneo, con cañería y envolventes aislantes, o si su condición está pendiente.
En pública concurrencia el perfil registra por separado la especificación de
cables interiores LSOH IRAM 62267.

## Sincronización y proyectos guardados

`differentialGroups` en `lib/panel-layout.ts` es la fuente común para la asignación,
el número y ancho de los ID, los esquemas y el presupuesto. `layoutDin` mantiene
las verificaciones de encaje por fila y reserva libre. Los ID de grupo son 2P para
suministro mono y 4P para tri, según el modelo comercial preliminar utilizado.
Las térmicas terminales conservan su ancho individual.

`essential` conserva el significado económico anterior, ahora reserva siempre
normal + EMG si tiene circuitos propios. `balanced` deja de alternar por índice y
asigna por uso; al abrir un proyecto anterior sus grupos se recalculan de esta
forma. `continuity` se conserva como modo legado por circuito, con precio y dibujos
propios, hasta elegir expresamente otra opción. `residential` es nuevo y se
conserva en exportación/importación JSON. No se eliminan circuitos ni se alteran
valores eléctricos al elegir arquitectura.

## Alcance normativo

No se rotula “cumple estrictamente AEA 718” ni “mínimo reglamentario” basándose
solo en la cantidad de ID. Se mantienen los avisos existentes de conductores,
caída de tensión, puesta a tierra, poder de corte, emergencia, etc. La opción
domiciliaria advierte en pantalla y en impresión si el proyecto es público.

Separar grupos no garantiza que la luz **nunca** se apague ante cualquier falla:
también deben coordinarse cabecera, alimentadores y dispositivos de protección.
La [guía de Schneider sobre coordinación de diferenciales](https://www.electrical-installation.org/enwiki/Coordination_of_residual_current_protective_devices)
exige verificar la selectividad en los distintos niveles de distribución.
La aplicación no resuelve esos estudios ni los ensayos de obra.

AEA identifica por separado la reglamentación de pública concurrencia 718 y las
aplicables a viviendas/inmuebles en su [catálogo oficial](https://aea.org.ar/reglamentaciones/impresas/).
El criterio exacto del inmueble y el cumplimiento de la Ordenanza 72/83 requieren
revisión profesional del expediente; la separación propuesta es una opción de
diseño, no una visación automática.

## Regresiones

Pruebas de grupos 2/3/1, clasificación por uso independiente del orden y fase,
grupos reservados, ID único con EMG, compatibilidad JSON y modo legado,
advertencia global/impresa, TP de tránsito, diferencial general configurable,
condición Clase II, cables LSOH, y coincidencia entre presupuesto, dimensiones y
vistas. Se mantienen las pruebas de la auditoría anterior.
