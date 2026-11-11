# Mi Rodalies V2.0.1 — Validación Generalitat / Renfe

## Conclusión
La clasificación de **19 líneas** coincide con la información oficial de la Generalitat.
Se ha agregado una referencia reproducible de líneas, corredores y 54 puntos
seleccionados de estación para comprobar la integridad del GTFS Renfe.

## Alcance comprobado

- Barcelona: R1, R2, R2 Nord, R2 Sud, R3, R4, R7, R8.
- Girona: RG1.
- Camp de Tarragona: RT1, RT2.
- Lleida: RL3, RL4.
- Regionales: R11, R13, R14, R15, R16, R17.

La Generalitat documenta líneas y estaciones principales, pero el portal
consultado no proporciona una API exhaustiva de paradas y horarios. Por eso
**no se puede certificar aquí la totalidad de las estaciones**. Se comprueban
54 puntos seleccionados y se informa claramente de coincidencias o huecos;
la lista operativa íntegra se obtiene de los GTFS de Renfe.

## Algoritmo

1. Importación del GTFS de Cercanías y, cuando es posible, Media Distancia.
2. Aceptación estricta de líneas etiquetadas como Rodalies (no AVE/Avant/LD).
3. Identificación de códigos y nombres de paradas por línea; horarios por viaje.
4. Validación secundaria contra la referencia Generalitat, sin inventar ni
   filtrar servicios a partir del catálogo parcial de puntos de control.
5. Catalogación: `controles_localizados`, `pendiente_contraste` y
   `sin_horarios_publicados`. Los estados no prueban el estado de circulación.
6. Actualización diaria en GitHub Actions y lectura desde la PWA.

## Pruebas

- Python: generador de red, deduplicación, filtro de largas distancias,
  referencia oficial, variantes de nombres y regresión R4 histórica.
- JavaScript: motor de planificación y correlación.
- Playwright Chromium: 320/360/390/768 px y controles, 19 líneas en el panel.
- **Pendiente:** ejecutar con los archivos GTFS completos actuales en GitHub
  y contrastar contra salidas físicas/feeds reales antes de atribuir cobertura
  universal o fiabilidad operativa garantizada.

## Fuentes

- https://rodalies.gencat.cat/es/linies_estacions_i_trens/index.html
- https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_rodalia_barcelona/
- https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_regionals/
- https://data.renfe.com/dataset/horarios-cercanias
- https://data.renfe.com/dataset/horarios-de-alta-velocidad-larga-distancia-y-media-distancia

No se ha realizado ninguna modificación en el repositorio del usuario.
