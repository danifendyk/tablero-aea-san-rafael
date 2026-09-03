# Tablero AEA · San Rafael

Herramienta de predimensionado de tableros eléctricos para proyectos en San Rafael, Mendoza.

Incluye definición rápida por tipo de proyecto, memoria de cálculo con fórmulas y reemplazo de valores, circuitos editables, caída de tensión, cortocircuito y poder de corte, puesta a tierra, balance de fases, vista frontal DIN, esquemas unifilar y multifilar, control del expediente, comparación de arquitecturas, optimización y costos de referencia.

El preajuste de salón/iglesia separa el TP del pilar y el TS1 interior. El
diferencial general del TP se decide explícitamente (`sin ID`, `300 mA selectivo
Tipo S` o `30 mA instantáneo`), mientras los diferenciales terminales de 30 mA
se sectorizan en el TS1. También se declara la condición Clase II de cada línea
seccional y la especificación LSOH IRAM 62267 de los cables interiores en pública
concurrencia.

## Marco normativo

- Ordenanza General 72/83 de Mendoza, utilizada por el Código de Edificación de San Rafael: documentación, cuadro de cargas, esquema multifilar, puesta a tierra, inspecciones y firma profesional.
- AEA 90364-7-771 para la instalación normal y AEA 90364-7-718 para lugares y locales de pública concurrencia.
- AEA 90364 Partes 0–3 y Parte 6 vigentes para principios, selección y verificación; IEC 61439 como referencia actual para conjuntos de tableros.

La Ordenanza 72/83 es histórica. Si un criterio antiguo entra en conflicto con la seguridad o reglamentación actual, debe resolverlo el profesional responsable y la autoridad de aplicación. El estado de cumplimiento de la aplicación es preliminar y nunca equivale a una visación.

Los PDF normativos se guardan en `documentos_normativos/` sólo en el equipo local y están excluidos de Git por posibles restricciones de licencia.

> Esta herramienta no reemplaza el proyecto eléctrico, la memoria de cálculo, las mediciones, la firma profesional ni la visación municipal.

## Desarrollo local

```bash
npm install
npm run dev
```

## Publicación estática

```bash
npm run build:pages
```

La rama `master` se publica automáticamente mediante GitHub Pages.
