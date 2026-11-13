# Auditoría integral de Mi Rodalies · 13/11/2026

**Alcance:** app web, catálogo 19 líneas, correspondencias ADIF, horarios Renfe GTFS + cuadros PDF oficiales, calendarios, validación por estación y correlación de datos operativos.  
**Lote analizado:** `0d34edcd723338d1cd5b`, generado 2026-11-13T12:04:15.854895+01:00.  
**Ventana publicada:** 2026-11-12 — 2026-11-26, 15 fechas GTFS (incluye el día anterior).  
**Volumen:** 15581 instancias de tren para el período, no trenes únicos ni circulaciones verificadas.  
**Criterio:** registro de parada con hora real de publicación ≠ cobertura completa de la línea ≠ confirmación de circulación.

## 1. Dictamen

**No apta aún para afirmar que se muestran todos los trenes y todos los horarios de paso de las 19 líneas.** La PWA resulta utilizable como consulta orientativa de lo que se encuentra estructurado, particularmente la R4 y varias líneas con GTFS. La cobertura y la validez temporal de las tablas PDF son heterogéneas y las fuentes externas no subsanan una base incompleta.

El catálogo distingue líneas y estaciones, pero no acredita que todas las estaciones tengan `stop_times` ni que cada calendario refleje huelgas, festivos y obras. Los feeds de terceros deben enriquecer un tren oficial identificado, no completar horas de paradas intermedias mediante interpolación.

## 2. Cobertura medida: cada línea y sus paradas

| Línea | Estaciones del inventario | Con horarios al menos un día | Sin horarios | Viajes de 2 paradas (15 fechas) | Paradas fuera del inventario |
|---|---:|---:|---:|---:|---:|
| R1 | 31 | 27 | 4 | 0 | 0 |
| R2 | 14 | 14 | 0 | 0 | 18 |
| R2N | 21 | 0 | 21 | 0 | 0 |
| R2S | 17 | 0 | 17 | 0 | 0 |
| R3 | 35 | 28 | 7 | 3240 | 0 |
| R4 | 40 | 40 | 0 | 4 | 1 |
| R7 | 7 | 5 | 2 | 0 | 0 |
| R8 | 9 | 9 | 0 | 0 | 0 |
| RG1 | 44 | 18 | 26 | 0 | 0 |
| RT1 | 6 | 6 | 0 | 0 | 0 |
| RT2 | 7 | 2 | 5 | 240 | 0 |
| RL3 | 9 | 9 | 0 | 0 | 0 |
| RL4 | 18 | 16 | 2 | 0 | 0 |
| R11 | 28 | 28 | 0 | 0 | 0 |
| R13 | 21 | 4 | 17 | 0 | 0 |
| R14 | 23 | 6 | 17 | 0 | 0 |
| R15 | 20 | 19 | 1 | 0 | 0 |
| R16 | 18 | 16 | 2 | 0 | 0 |
| R17 | 9 | 9 | 0 | 0 | 0 |

La auditoría completa de cada combinación línea/estación y cada día se publica automáticamente en [coverage_stations.csv](data/v2/coverage_stations.csv) y [coverage_audit.json](data/v2/coverage_audit.json). El informe [coverage_audit.md](data/v2/coverage_audit.md) indica todos los nombres de estaciones sin horarios.

**No se ha certificado la exhaustividad de trenes de ninguna línea.** Que una fila tenga todas las estaciones cubiertas significa solo que hubo al menos una hora publicada en cada estación durante la ventana; no demuestra todas las circulaciones ni las paradas de cada tren.

## 3. Hallazgos críticos (P0)

### P0.1 · R2 Nord y R2 Sud sin horarios estáticos
Hay 0 recorridos horarios estructurados para ambas líneas: sus estaciones aparecen, pero no existe base oficial por servicio/parada. El GTFS etiqueta algunas circulaciones genéricamente `R2` que atraviesan ramales; no debe reasignarse una circulación a R2 Nord o Sud por proximidad geográfica. La tabla PDF compartida contiene horarios por columna, pero requiere un extractor validado con las dos direcciones, el calendario y el identificador comercial.

**Modificación vigente:** la R2 Granollers–Castelldefels tiene terminal temporal en Gavà desde 12/11/2026 hasta 14/12/2026. El PDF general de julio es insuficiente como base temporal. Confirmar cualquier fila contra la publicación fechada 10/11/2026 antes de incorporarla.
Referencias: [modificaciones oficiales](https://rodalies.gencat.cat/es/alteracions_del_servei/), [cuadro R2 actualizado fines de semana](https://rodalies.gencat.cat/web/.content/01_Actualitat/2026/11_09_Gava_Castelldefels/R2_2026-A-partir-del12.11.26-Castelldefels-acaben-en-Gava-1.pdf).

### P0.2 · R13 y R14: ruptura de continuidad ferroviaria
La Generalitat indica actualmente circulación ferroviaria en segmentos separados, con autobús alternativo entre ellos. Los registros añadidos inicialmente como un trayecto continuo fueron truncados el 13/11/2026 para **no representar un autobús como tren**: R13 termina su segmento ferroviario en Les Borges Blanques; el tramo R14 Tarragona→Lleida se limita a Tarragona→La Plana-Picamoixons. Faltan las restantes circulaciones de los segmentos ferroviarios y el servicio alternativo no está modelado.
Referencia: [estado del servicio](https://rodalies.gencat.cat/es/inici), [cuadro publicado R13/R14](https://rodalies.gencat.cat/web/.content/02_Horaris/horaris/R13R14.pdf).

### P0.3 · R3: GTFS limitado y alteración del servicio
Hay siete estaciones del inventario sin horarios estructurados en el período. 3240 instancias registradas con solo dos paradas no proporcionan tiempos intermedios. La Generalitat describe un esquema con tramos ferroviarios y autobuses alternativos, incompatible con dar por completo un corredor histórico continuo.
Referencia: [alteraciones del servicio](https://rodalies.gencat.cat/es/alteracions_del_servei/).

### P0.4 · Vigencia de calendarios PDF
Los importadores manejan las plantillas `weekday`, `weekend` y `daily`, pero no todas las tablas disponen de excepciones para festivos, huelgas, horarios temporales u obras. Una plantilla `daily` no demuestra que el servicio circule todos los días. Es obligatorio validar días efectivos y fecha de vigencia por servicio; cuando no haya evidencia, indicar “horario teórico no confirmado”.

## 4. Hallazgos altos (P1), línea por línea

- **R1:** 27/31 estaciones con horario; faltan Molins de Rei, Sant Feliu de Llobregat, Sant Joan Despí y Cornellà. No extender automáticamente los trenes GTFS o el PDF hasta estas cuatro estaciones.
- **R2:** 14 estaciones de referencia pero aparecen horas GTFS en 32. Las 18 adicionales se asocian a servicios de ramales ajenos a la R2 comercial. El selector ya se basa en el inventario comercial; falta clasificación comprobada de los trenes.
- **R4:** se verificaron mediante códigos ADIF 78605 y 78610 dos nombres de estaciones que habían quedado duplicados como referencias. Cinco fragmentos GTFS Manresa–Rajadell etiquetados R4 coincidían exactamente con servicios RL4 y fueron retirados de R4. Un fragmento de fin de semana mantiene discrepancia temporal que debe investigarse antes de reconciliarlo.
- **R7:** los servicios estructurados empiezan en Montcada-Bifurcació; Fabra i Puig y Torre Baró-Vallbona no poseen horas R7 del catálogo. La referencia histórica no equivale al servicio ferroviario actual.
- **R8:** nueve estaciones del inventario con horas. El recuento oficial de referencia debe distinguir itinerario y variantes, no forzarse a ocho.
- **RG1:** solo 18/44 estaciones con horas: la fuente usada cubre el corredor Maçanet–Portbou. Falta el tramo hacia Barcelona/Maresme en el inventario histórico; según alteraciones actuales, no ha de asumirse como servicio ferroviario RG1 operativo.
- **RT1:** seis estaciones con horas en la ventana; falta certificar excepciones de calendario y exhaustividad de ambos sentidos.
- **RT2:** siete estaciones del corredor de referencia, pero solo Tarragona y Salou-Port Aventura tienen tiempos publicados para los servicios importados. No representar las otras cinco como paradas efectivas del tren.
- **RL3:** nueve estaciones, cobertura por estación de las filas PDF importadas; comprobar cambios de calendario y de vigencia.
- **RL4:** 16/18 estaciones con horas porque el servicio RL4 llega ferroviariamente a Manresa y el tramo restante utiliza R4. No etiquetar los trenes R4 como RL4.
- **R11:** 28/28 estaciones tienen al menos una hora, pero solo se importó una selección limitada de filas y sentidos; no es un horario completo.
- **R13/R14:** tras la corrección ferroviario/carretera, gran parte del inventario queda sin horas; hay que reconstruir ambos segmentos operativos por separado.
- **R15:** 19/20 estaciones con horas; Riba-roja d'Ebre carece de llamadas en el importador. Cobertura parcial por sentido y calendario.
- **R16:** 16/18 estaciones con horas; no consta cobertura de Ulldecona ni Vilanova en la selección actual.
- **R17:** nueve estaciones con horarios en las filas importadas; exhaustividad y excepciones por verificar.

## 5. Cadena de fiabilidad: arquitectura objetivo

1. **Inventario físico ADIF**: estación y código únicos, alias y pertenencia a cada línea con soporte documental; no coincidencias difusas automáticas.
2. **Servicio oficial**: identificador `trip_id` o número comercial, línea validada, origen, destino, sentido, secuencia exacta y horario por parada.
3. **Calendario**: servicio efectivo por fecha, excepciones festivas y versiones temporales/obras; los segmentos por autobús deben tener un modo distinto de `train`.
4. **Enriquecimiento**: panel ADIF/RadarDeTrenes, Valfiguer, posiciones Renfe, cancelaciones, alertas y Trenalia como contraste, asociados por identidad de tren, línea, estación, fecha, sentido y hora programada.
5. **Calidad**: conservar `scheduled`, `estimated`, `observed`, `cancelled`, `conflict` separados; prioridad a la observación fechada de la estación y no al acuerdo de dos redistribuidores del mismo feed.

**Regla principal:** si falta el servicio oficial verificable, los horarios de terceros no deben elevarse a “horario oficial”. Si faltan horas intermedias oficiales, no interpolarlas. Nunca presentar una ETA calculada a partir de retraso general como paso de estación confirmado.

## 6. Revisión del código de correlación actual

`engine.js` mantiene normalizadores separados para paneles, posiciones, cancelaciones y avisos. Existen límites de frescura orientativos (panel hasta 180 s, posición hasta 90 s), filtros para otros núcleos, coincidencia por `trip_id`/número y detección de contradicciones de ETA. Este diseño es conservador, pero:

- **Corregido en esta auditoría:** antes la comprobación obligatoria del número comercial para una ETA de PDF se limitaba a RL3. Se ha extendido a todos los PDF que publican número comercial, con prueba de regresión de coincidencia negativa y positiva. Los PDF sin número requieren aún correlación inequívoca por estación, línea, minuto y sentido.
- La aplicación mezcla resultados oficiales con horarios directos de Trenalia etiquetados como `schedule-only`. Deben separarse visiblemente de la base oficial y no contarse como cumplimiento de cobertura.
- Valfiguer y RadarDeTrenes pueden redistribuir el mismo origen Renfe/ADIF: el acuerdo entre ambos no acredita independencia estadística.
- La comprobación de disponibilidad HTTP 200 de un proveedor externo puede fallar con servicios caídos o límites de acceso; no equivale automáticamente a error del motor.
- No hay métricas verificadas de error ETA real por estación ni identidad de tren medida contra pasos reales.

## 7. Correcciones realizadas en esta auditoría

- Auditoría automática de las 19 líneas, de **cada estación y cada día**, con `coverage_audit.json`, `coverage_stations.csv` y `coverage_audit.md`, en cada regeneración.
- Truncamiento preventivo de R13/R14 a segmentos ferroviarios documentados.
- Corrección de identidades de estaciones R4 usando códigos ADIF y fuentes oficiales.
- Exclusión estricta de fragmentos RL4 que Renfe GTFS marcaba erróneamente como R4 cuando coincidían número, dos estaciones y minutos oficiales.
- Registro de vigencia/alteración de R2 y enlace al cuadro especial de noviembre.
- Mejoras de información de procedencia y advertencias en la interfaz.
- Control generalizado de número comercial al enlazar la ETA de un panel con cualquier horario PDF numerado; comprobado con prueba de regresión.

## 8. Orden de resolución propuesto

| Prioridad | Acción | Criterio de aceptación |
|---|---|---|
| P0 | Completar R2 Nord y R2 Sud desde PDF oficial vigente | Cada servicio y todas sus paradas publicadas, dos sentidos, calendarios, sin etiquetas genéricas R2 |
| P0 | Reconciliar R13 y R14 con servicios efectivos y transporte alternativo | Ningún autobús como tren; horarios de ambos segmentos |
| P0 | Formalizar vigencia y excepciones por tren | Ningún servicio marcado como diario sin justificación |
| P1 | Auditar en profundidad R1/R3/R4/R7/RG1 y otros faltantes | Cada estación del servicio operativo con horarios o motivo documentado |
| P1 | Completar regionales y retornos | Comparación fila a fila contra PDF oficial |
| P1 | Separar alternativos Trenalia del conjunto oficial | UI y cobertura contabilizan oficial y terceros por separado |
| P2 | Validar matching feeds y medir precisión | Métricas ETA MAE/P90, cobertura por estación, conflictos, falsos positivos y caducidad |

## 9. Limitaciones expresas

No se ha realizado una captura de pasos reales presencial ni una comprobación independiente de **cada celda de todos los PDF**; por ello esta auditoría verifica integridad y cobertura de lo publicado en el sistema, no certifica exactitud externa absoluta ni exhaustividad. Cualquier fuente vencida o discrepancia entre GTFS y PDF queda pendiente de contraste específico. Las URL oficiales deben volver a verificarse al actualizar las tablas.

**Dictamen:** apta como visor orientativo de horarios etiquetados por fuente; **no apta aún para el objetivo declarado de todos los trenes, todas las estaciones y fiabilidad máxima**.
