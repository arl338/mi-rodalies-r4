# Mi Rodalies V2 · Catálogo oficial generado

Este directorio se rellena automáticamente con `.github/workflows/horario-renfe.yml`.
No contiene horarios inventados ni una lista estática de estaciones precargada.

Tras ejecutar el workflow se crean:

- `catalog.json`: estaciones asociadas a servicios Rodalies identificados, líneas realmente cubiertas, fechas y advertencias.
- `AAAA-MM-DD.json`: viajes y paradas con horas GTFS oficiales (UTC Unix, convertidas de la hora Europe/Madrid), para 14 fechas más el día previo (servicios con hora GTFS 24:xx).

La app obtiene los JSON en `raw.githubusercontent.com` cuando se publica bajo GitHub Pages, ya que los commits de GITHUB_TOKEN pueden no publicar automáticamente Pages.

**Criterio de admisión:** el servicio tiene que identificarse explícitamente como una de las 19 líneas Rodalies de Catalunya en el GTFS original. Aunque pase por una estación compartida, no se importan AVE, Avant ni trenes de larga distancia. Los regionales R11/R13-R17 solo se incluyen si el GTFS Renfe los identifica como esas líneas; no se etiquetan MD genéricos como regionales sin evidencia.

Un servicio programado no implica que esté circulando. Fuente: Renfe Data (CC BY 4.0), https://data.renfe.com/.

### Contraste con Generalitat

`catalog.json` incorpora el objeto `official_reference`, generado a partir
del fichero `data/reference/generalitat_lines.json` (19 líneas y 54 puntos
de control). Se cotejan los puntos seleccionados por nombre normalizado
con las estaciones que Renfe GTFS vincula a cada línea. Los avisos no prueban
que una línea esté cerrada ni que falte físicamente una estación.
