# Informe de validación técnica — Mi Rodalies V2.0.1

**Fecha:** 11 de noviembre de 2026  
**Destino:** PWA en GitHub Pages, Android Chrome  
**Requisito de coste:** 0 € en infraestructura personal  
**Resultado:** **versión de pruebas lista para despliegue; cobertura operativa nacional y precisión de APIs aún por verificar en GitHub y en campo**.

## 1. Alcance

- **19 líneas** definidas según la red oficial: R1, R2, R2N, R2S, R3, R4, R7, R8, RG1, RT1, RT2, RL3, RL4, R11, R13, R14, R15, R16 y R17.
- Estaciones de Rodalies Renfe dentro de Catalunya identificadas por rutas GTFS oficiales (no se incluyen operadores FGC, Metro, trenes AVE, Avant ni larga distancia).
- Origen/destino libres, búsqueda por nombre, favoritos y un transbordo máximo.
- Horarios de salida durante los próximos 14 días (con día de servicio previo para viajes de madrugada >24:00).
- Consulta en vivo solamente para el día actual, no para una fecha futura.

## 2. Fuentes y prioridad de evidencias

**Catálogo de trenes programados:** GTFS estático Renfe Cercanías `fomento_transit.zip`. Además, GTFS Renfe Media Distancia `google_transit.zip` **solo cuando etiqueta explícitamente una línea regional de Rodalies**. El nombre de estación, el tipo de tren o el municipio por sí solos no justifican incluirlo.

**Información operativa:** panel de estación de Valfiguer y tablero de ADIF redistribuido por RadarDeTrenes; posiciones identificadas, cancelaciones y avisos de Renfe redistribuidos. El sistema no cuenta varias redistribuciones del mismo feed como comprobaciones independientes.

**Reglas de precisión:**

- Los candidatos solo aparecen cuando existe un itinerario GTFS del tren que recorre origen y destino en el orden correcto.
- Las estimaciones solo se aplican con número/fecha/línea/hora comprobados, o trip_id exacto, y antigüedad conocida y no superior a 180 segundos.
- Posición reciente = **trip_id exacto**, si la posición no está marcada como caducada y tiene antigüedad máxima de 90 segundos. Un número comercial por sí solo no basta.
- Cancelación = `trip_id` exacto del servicio o cancelación corroborada en un tablero atribuible al servicio; una posición contradictoria origina estado de conflicto.
- Un horario teórico nunca se presenta como evidencia de circulación. Para un transbordo no se ofrece garantía de conexión.
- Ante un error de fuente, se mantiene el horario oficial y se muestra «datos parciales»; nunca se inventa una hora de llegada.

## 3. Pruebas completadas

| Prueba | Resultado | Método |
|---|---|---|
| Filtrado por línea R4 / R2N / R11 | Correcto en fixture | GTFS sintético |
| Exclusión de AVE incluso con trip_id engañoso | Correcto | GTFS sintético |
| Exclusión de estación Cerbère (Francia) | Correcto | GTFS sintético |
| Deduplicación de servicios superpuestos | Correcto | GTFS sintético |
| Compensación de calendario de servicio | Correcto | Tests Python |
| Horarios R4 originales del 11/11 | Correcto | Extracto real aportado: 8 ida, 8 vuelta, salidas de tarde 18:03/19:03/20:03 y 18:28/19:28/20:28 |
| Selección de origen y destino; orden de paradas | Correcto | Motor JavaScript |
| Transbordo único con 8+ min y descarte de transbordos imposibles | Correcto | Motor JavaScript |
| Exclusión de otras líneas en consulta R4 | Correcto | Motor JavaScript |
| Posiciones antiguas o con identificación insuficiente | Descartadas | Motor JavaScript |
| Cancelación de otro tren | Descartada | Motor JavaScript |
| Cancelación y posición contradictoria | Identificado como conflicto | Motor JavaScript |
| Estimación con antigüedad excesiva | Descartada | Motor JavaScript |
| Vista 320, 360, 390 y 768 px | Sin overflow / errores JS | Chromium + Playwright, endpoints simulados |
| Favoritos, invertir estaciones, elección de franjas, búsqueda | Correcto | Chromium + Playwright |
| Resultados anteriores al cambiar selección | Se invalidan | Código y test |
| Generación de todas las 19 líneas en GTFS real publicado hoy | **Pendiente** | Requiere ejecutar workflow de GitHub |
| APIs reales en Android y coincidencia con panel del andén | **Pendiente** | Validación de campo |

Las pruebas locales no prueban la disponibilidad, cobertura o exactitud de proveedores externos. La descarga de GTFS Renfe completo está bloqueada desde el entorno de generación; el proceso está diseñado para ejecutarse con acceso de GitHub Actions.

## 4. Riesgos y tareas posteriores

1. **Cobertura real por línea:** verificar `catalog.json` tras primera ejecución; se muestra cuántas líneas y estaciones aparecen y se notifican las ausencias. No afirmar cobertura universal hasta esa comprobación.
2. **Rutas de Media Distancia:** los GTFS regionales pueden identificar algunos servicios únicamente como MD, sin código de línea; se omiten en vez de etiquetarlos incorrectamente.
3. **Límite geográfico:** filtro geográfico aproximado + exclusiones de estaciones fronterizas francesas; no se ha realizado una prueba topológica oficial contra el polígono administrativo de Catalunya.
4. **Integridad histórica:** no hay calibración de error absoluto real por línea. Las estadísticas publicadas por terceros no equivalen a predicciones verificadas por estación.
5. **Transbordos complejos:** la V2 busca una conexión como máximo. No hace rutas de dos o más transbordos ni incorpora alternativas por FGC/Metro.
6. **GTFS con cambios de último momento:** el horario del día puede diferir del servicio prestado, y las incidencias deben consultarse al margen.
7. **Caché y límites externos:** GitHub Pages / Actions y APIs gratuitas dependen de sus condiciones, disponibilidad y cuotas. Sin promesa de gratuidad indefinida.

## 5. Cómo reproducir la validación

En la raíz del proyecto:

```bash
python -m unittest discover -s tests -v
node tests/test_engine.cjs
python tests/test_ui.py
```

La última prueba necesita `playwright` Python y Chromium instalado en `/usr/bin/chromium`. Utiliza fixtures sintetizados para no depender de Internet. Para la actualización real, GitHub Actions ejecuta `python scripts/build_network.py --days 14` y valida el catálogo resultante antes de publicarlo.

## 6. Referencias

- Renfe Data GTFS Cercanías: https://data.renfe.com/dataset/horarios-cercanias
- Renfe Data GTFS AV/LD/MD: https://data.renfe.com/dataset/horarios-de-alta-velocidad-larga-distancia-y-media-distancia
- Red oficial: https://rodalies.gencat.cat/es/sobre-rodalies/que-son-rodalies-de-catalunya/
- Valfiguer API: https://trenes.valfiguer.com/desarrolladores
- RadarDeTrenes API: https://radardetrenes.com/docs


## 7. Integración de referencia Generalitat (revisión V2.0.1)

- Referencia de líneas: [Rodalies Generalitat — Líneas](https://rodalies.gencat.cat/es/linies_estacions_i_trens/index.html), [Barcelona](https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_rodalia_barcelona/) y [Regionales y demás ámbitos](https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_regionals/).
- **19 líneas** cotejadas y **54 puntos de control** de estaciones/terminales con denominaciones y alias explícitos. No se representa esto como el listado completo de paradas.
- El programa comprueba la identidad de las 19 líneas, coteja puntos seleccionados con estaciones GTFS de la línea, publica estado por línea y registra discrepancias; no fabrica horarios ni excluye servicios legítimos por la ausencia de un punto de control.
- Tests adicionales: `tests/test_official_reference.py` (catálogo íntegro, enlaces, alias por línea y exclusión de AVE).
- Pruebas de interfaz a 320, 360, 390 y 768 px (panel desplegable de cobertura, sin overflow, sin errores JS).
- **Validación pendiente antes de confirmar cobertura total:** ejecutar los GTFS actuales de Renfe en GitHub Actions y revisar `official_reference.lines`; la Generalitat no proporciona en la página de referencia un JSON tabular exhaustivo de todas las estaciones.
