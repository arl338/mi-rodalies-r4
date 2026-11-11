# Mi Rodalies R4 · PWA V1.3

Visor ligero para Android, sin backend propio ni costes obligatorios. Actualmente prioriza:

- Ida: Terrassa Est → Barcelona-Plaça de Catalunya.
- Vuelta: Barcelona-Sants → Terrassa Est.

La arquitectura de consulta está separada de los recorridos, de cara a extenderla a todas las líneas de Rodalies.

## Contenido

- `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `sw.js` e iconos: PWA.
- `scripts/build_gtfs.py`: transforma el **GTFS estático oficial de Cercanías/Rodalies** a JSON ligero para estos dos trayectos.
- `.github/workflows/horario-renfe.yml`: intenta actualizar el JSON oficial una vez al día, gratuitamente con GitHub Actions, y permite ejecución manual.
- `data/README.md`: documentación del horario. `data/schedule-r4.json` aparece solo si se descarga y procesa el GTFS con éxito.

## Publicar o actualizar en tu repositorio GitHub

1. Entra en `https://github.com/arl338/mi-rodalies-r4`.
2. `Add file` → `Upload files`.
3. **Descomprime el ZIP**. Abre la carpeta que contiene `index.html`. Arrastra desde dentro su contenido completo, incluidas las carpetas `.github`, `data` y `scripts`, y los ocho archivos de la PWA. No arrastres la carpeta contenedora.
4. Comprueba que `index.html` quede en la raíz y que el workflow aparezca como `.github/workflows/horario-renfe.yml`.
5. Pulsa `Commit changes`. La web se seguirá abriendo en `https://arl338.github.io/mi-rodalies-r4/`.
6. Si no ves el nuevo diseño, actualiza Chrome y vuelve a abrir la PWA. El service worker utiliza una caché de versión diferente.

## Activar el horario oficial automáticamente

Desde GitHub → **Actions** → **Actualizar horario oficial Renfe GTFS** → **Run workflow** → rama `main` → **Run workflow**. Tras la primera ejecución correcta, el JSON de horarios aparecerá en `data/schedule-r4.json`. La tarea también está programada para ejecutarse diariamente.

Si GitHub solicita activar Actions en el repositorio, hazlo. Si el trabajo falla por permisos de escritura, consulta Settings → Actions → General → Workflow permissions y autoriza Read and write permissions solo para este repositorio, si te parece adecuado.

**Importante:** el ZIP inicial **no contiene un horario inventado**. El primer horario oficial directo debe generarse mediante la tarea. Mientras no esté disponible, la interfaz seguirá consultando horarios GTFS redistribuidos por Valfiguer y Trenalia y mostrará el aviso de que el archivo oficial aún no está disponible. Si el servidor oficial rechaza la descarga (por ejemplo por certificado TLS), el flujo dará error y no se publicará un horario falso.

El JSON se consulta preferentemente desde la rama pública de GitHub (`raw.githubusercontent.com`), con un respaldo servido desde Pages. Esto evita depender de una nueva publicación de Pages para cada actualización de Actions (los commits hechos con `GITHUB_TOKEN` no disparan una reconstrucción de Pages).

## Fuentes y estado

- **Referencia del día normal:** GTFS estático oficial de Renfe, publicado en https://data.renfe.com/es/dataset/horarios-cercanias (licencia CC BY 4.0).
- **Horarios GTFS redistribuidos y recorrido:** https://trenes.valfiguer.com/desarrolladores y https://trenalia.org/api
- **Tableros de estación y posiciones:** https://radardetrenes.com/docs
- **Alertas, cancelaciones y puntualidad publicada:** endpoints citados en la interfaz.

Las fuentes de terceros pueden tener una raíz común: *dos servicios que reutilizan el mismo dato Renfe no equivalen a dos observaciones independientes*. La PWA separa `Horario oficial` de `Posición reciente`, y jamás debe mostrar horario programado como circulación confirmada. Cancelaciones y datos de telemetría se superponen al horario sin modificar los datos originales.

La posición de Cercanías puede ser aproximada. Las predicciones no sustituyen los paneles físicos ni los avisos oficiales en la estación.

## Controles móviles

- Botones de **Ida/Vuelta** con estado persistente, guardado localmente y aviso de pulsación.
- Botones de **2/4/8 horas** con selección persistente; campos manuales `Desde`/`Hasta` y botón de aplicar.
- **Actualizar** indica actividad, se deshabilita durante la consulta y las fuentes se vuelven a consultar cada 60 s mientras está abierta.
- Diseño claro con contraste alto, objetivos táctiles más grandes y adaptación a pantallas estrechas.

## Validación

Pruebas locales: sintaxis JavaScript; generación de una muestra GTFS **ficticia exclusivamente de prueba**, sin incluirla en el ZIP; navegador móvil Chromium con respuestas simuladas (fuente oficial disponible, fuente oficial ausente, cambios de trayecto, botones de franja y un tren observado). No se ha hecho una verificación de extremo a extremo de los endpoints reales desde la red donde se ha generado esta versión. El funcionamiento y cobertura reales deben comprobarse desde el Android.
