# Mi Rodalies V2.0.2 — Auditoría de nombres y algoritmo

## Normalización de estaciones

Los nombres públicos se resuelven por código ADIF exacto, no por distancia ni
similitud. Se ha incluido el BOE-A-2023-4789 y fichas de ADIF para 11 códigos.
El nombre GTFS anterior se conserva como `gtfs_name` y alias de búsqueda.

La coincidencia en el contraste Generalitat se realiza por código verificado si
existe, y por nombre/alias exacto solo cuando no existe código. Los nombres
parecidos se informan como sugerencias SIN validar. Se compara únicamente entre
estaciones asociadas a la misma línea.

## Actual algoritmo de salidas (sin predicción estadística)

1. Renfe GTFS determina líneas válidas, calendario, estaciones y paradas.
2. Solo viajes cuyo origen precede al destino; 1 transbordo máximo (8 min mínimo).
3. Observaciones de tablero: Valfiguer y RadarDeTrenes/ADIF, con ID exacto o
   número de tren + misma línea + hora de salida ±3 min y antigüedad <=180 s.
4. Posición: identidad de viaje exacta, antigüedad <=90 s. Nunca número aislado.
5. Cancelación: ID de viaje exacto o tablero del mismo servicio y origen.
6. Avisos: contexto por línea, nunca evidencia para cancelar un tren concreto.
7. Prioridad del horario: Renfe GTFS. Estimación de tablero más reciente entre
   coincidencias válidas. No existe calibración histórica por línea todavía.

## Propuestas para aumentar precisión

- Comparar la hora estimada de ADIF y Valfiguer y marcar discrepancias, sin
  elegir arbitrariamente la más reciente si existe conflicto.
- Evaluar por línea cobertura real, error absoluto de llegada y falsas
  cancelaciones tras 7-14 días de observaciones.
- Incluir información sobre desviaciones temporales y obsolescencia por tren.
- No asumir que múltiples distribuidores de Renfe son fuentes independientes.
- Mantener fuera de la lista circulaciones sin trayecto oficial identificado.

## Fuentes

- https://boe.es/diario_boe/txt.php?id=BOE-A-2023-4789
- https://rodalies.gencat.cat/es/linies_estacions_i_trens/index.html
- https://data.renfe.com/dataset/horarios-cercanias
- https://trenes.valfiguer.com/desarrolladores
- https://radardetrenes.com/docs

Pendiente: ejecutar GitHub Actions con los GTFS íntegros y revisar las
`unverified_name_suggestions` del catálogo generado. El diccionario de once
estaciones NO acredita por sí solo la conciliación de todas las estaciones.


## Nota de auditoría V2.0.3

RadarDeTrenes publica tableros con `plannedTime` y `timestamp` en milisegundos, `trainCode`, `delayMinutes` y `timeType`; el adaptador ya traduce estos campos. Si las estimaciones recientes del mismo tren difieren más de cinco minutos no se elige ninguna como estimación única. El catálogo de trenes lo sigue determinando exclusivamente el GTFS oficial. Véase `INFORME_AUDITORIA_V2_0_3.md`.
