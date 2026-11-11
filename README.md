# Mi Rodalies · V1.1 (contraste transparente)

PWA estática para dos trayectos R4: Terrassa Est → Barcelona-Plaça de Catalunya y Barcelona-Sants → Terrassa Est.

## Cambios
- Franja horaria configurable de **hoy**, con accesos rápidos para las próximas 2, 4 u 8 horas. Se filtra por **hora programada de salida** y se ordena cronológicamente.
- Consulta principal del trayecto completo en Valfiguer; consultas complementarias del panel de estación de Valfiguer y de las salidas de Mobilitat Penedès (si existe acceso CORS, cobertura y formato compatible).
- Contraste de número de tren/hora y detección de discrepancias de cancelaciones o horarios entre fuentes. No suma coincidencias como si fueran evidencia independiente: todas estas plataformas reutilizan información de Renfe.
- Estado de **posición reciente** solo si un proveedor facilita explícitamente un tren en movimiento o una posición no obsoleta; «solo horario» no confirma circulación.
- Panel con fuentes consultadas, errores y avisos etiquetados por procedencia.
- Si una fuente falla, se explica sin inventar horarios ni cancelar trenes.

## Limitaciones importantes
- **Integración aún no validada con respuestas reales desde un móvil.** Se ha comprobado la sintaxis JavaScript y la estructura de archivos, no la compatibilidad completa de los esquemas de las APIs.
- La API de trayectos puede no cubrir franjas largas ni todas las circulaciones. La ausencia de un tren no demuestra supresión.
- El panel de estación de Valfiguer solo cubre las próximas 2 horas. Mobilitat Penedès puede no ofrecer datos o impedir acceso directo por CORS.
- La coincidencia entre Valfiguer y Mobilitat Penedès NO acredita dos observaciones independientes: ambos pueden apoyarse en el mismo GTFS/GTFS-RT de Renfe.
- Se consultan los datos mientras la PWA está abierta; no hay monitorización en segundo plano.
- Los horarios se muestran en zona Europe/Madrid. Franjas que atraviesen medianoche no están incluidas en esta versión.
- Hay que contrastar empíricamente la precisión con los monitores de las estaciones antes de confiar en las estimaciones.

## Actualizar el repositorio
En GitHub, abre `mi-rodalies-r4` → `Add file` → `Upload files`. Sube **el contenido** de esta carpeta, no la carpeta ni el ZIP. Confirma sustitución de los archivos existentes y pulsa `Commit changes`. Pages publicará la actualización de la rama `main`.

## Fuentes documentadas
- https://trenes.valfiguer.com/desarrolladores
- https://mobilitatpenedes.cat/dades
- https://mobilitatpenedes.cat/dades/fonts
- https://trenes.valfiguer.com/datos

Datos: Renfe Data y otras fuentes originales (CC BY 4.0), normalizados por Valfiguer y Mobilitat Penedès.
