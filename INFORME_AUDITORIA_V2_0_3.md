# Mi Rodalies Catalunya · Auditoría del código V2.0.3

**Fecha:** 11/11/2026  
**Base:** paquete V2.0.2 (normalización Generalitat/ADIF/BOE).  
**Alcance:** HTML, CSS, JS, motor, generador Python GTFS, automatización GitHub Actions, navegación Android simulada.

## Resultado

**Apto para desplegar en fase de pruebas**: corregidos los errores reproducibles que se detallan abajo y superadas las pruebas locales. **No certificado como información ferroviaria exacta**: falta validar las respuestas en vivo de las APIs desde un Android real y comprobar la cobertura de los GTFS completos tras ejecutar el workflow en GitHub.

## Defectos corregidos

| Ref. | Defecto V2.0.2 | Corrección V2.0.3 | Impacto |
| --- | --- | --- | --- |
| F01 | RadarDeTrenes usa `trainCode`, `plannedTime`, `delayMinutes`, `timeType`, `timestamp` y `updatedAt` (milisegundos) que no estaban íntegramente normalizados | Soporte del esquema real documentado con marcas temporales en segundos y milisegundos | Permite obtener estimaciones/estado con garantías de atribución |
| F02 | Posiciones Radar usan `tripId` y `trainCode`; `type=long_distance` no se excluía expresamente | Parser de posiciones y exclusión explícita de larga distancia | Evita falsos emparejamientos y conserva posiciones con ID exacto |
| F03 | Se aceptaban fuentes con identificadores de viaje contradictorios por coincidencia del número | Coincidencia explícita de `trip_id`; si no existe, número + línea + horario de origen (±3 min) | Reduce falsos positivos |
| F04 | Marcas horarias futuras podían degradarse a «reciente» al usar el timestamp general del tablero | Rechazo de marcas futuras anómalas; un timestamp inválido del registro no se corrige con el global | Mejora la integridad temporal |
| F05 | Se elegía una estimación reciente aun habiendo otra incompatible | Si hay diferencia superior a cinco minutos, estado «Datos contradictorios» y no se presenta una única estimación | No se oculta la incertidumbre |
| F06 | Al cambiar trayecto/franja permanecían las incidencias y diagnósticos anteriores | Invalida resultados, incidencias y diagnóstico, cancela consulta anterior | Evita confusión de información de otros trayectos |
| F07 | Una franja nocturna podía solicitar un día fuera de la cobertura oficial | Comprobación de último día de GTFS | Error comprensible en vez de datos incompletos |
| F08 | Hora inexistente o duplicada en cambio horario de verano/invierno | Validación de hora local Europe/Madrid; rechazo explícito de una hora inexistente/ambigua | Evita desplazamientos temporales silenciosos |
| F09 | `data/v2/AAAA-MM-DD.json` quedaba indefinidamente en memoria | Caducidad de caché de horarios diaria tras cinco minutos | Reduce desfases en sesiones prolongadas |
| F10 | Campos de hora estrechos en Android al renderizar AM/PM | Dos columnas para horas y fecha a ancho completo hasta 500 px | Mejor legibilidad |
| F11 | Puntos táctiles de 38–43 px | Ajustes a 44–49 px y estados de selección | Ergonomía |
| F12 | Respuestas malformadas con registros `null` podían interrumpir toda la consulta | Parsers tolerantes a elementos inválidos | Degradación segura |
| F13 | Mensaje «1 opciones» | Singular y plural correctos | Presentación |

## Reglas preservadas

1. **Universo de servicios:** GTFS Renfe, únicamente rutas explícitamente identificadas como Rodalies. Sin inclusión automática de AVE, Avant o larga distancia.
2. **Recorrido:** origen y destino presentes y en orden, con servicios directos o como máximo un transbordo y margen mínimo de ocho minutos.
3. **Fuentes auxiliares:** Valfiguer y RadarDeTrenes enriquecen horarios confirmados por GTFS; no pueden agregar trenes arbitrarios del panel de estación.
4. **Estimación:** tablero fresco (máximo 180 s), atribución inequívoca y coherencia temporal; discrepancia superior a 5 min implica estado contradictorio.
5. **Posición reciente:** viaje exacto, línea compatible, fecha y número compatibles cuando existan; antigüedad máxima 90 s. Un número aislado no confirma posición.
6. **Cancelaciones:** coincidencia del viaje concreto; nunca por número aislado. Si hay una posición reciente y cancelación para el mismo viaje, estado contradictorio.
7. **Independencia:** la información renfe/ADIF redistribuida por terceros no se contabiliza como observaciones independientes.

## Pruebas ejecutadas

- `python -m pytest -q tests` → **10 pruebas Python superadas**.
- `node tests/test_engine.cjs` → **batería original de 17 grupos superada**.
- `node tests/test_feed_schemas.cjs` → parser Valfiguer/Radar, marcas temporales, conflictos, cancelaciones y JSON parcialmente malformado **superados**.
- `python tests/test_ui.py` → navegadores Chromium simulados a **320, 360, 390 y 768 px**, sin errores JS ni scroll horizontal; favoritos, búsqueda y franja correctos.
- `python tests/test_ui_regression.py` → estado de selección, invalidación de información anterior, aviso de fin de cobertura, cambio horario e interacción táctil **superados**.
- `node --check app.js`, `node --check engine.js`, `python -m py_compile scripts/build_network.py` → **sin errores de parseo/sintaxis**.
- Inspección de captura de 390 px y corrección del ancho de los controles nativos de hora.

## Limitaciones no resueltas por pruebas locales

- **Feeds reales:** la inspección de documentación confirma el formato esperado, pero este entorno no ha podido recuperar el JSON en vivo de los dos endpoints de estación. La compatibilidad real debe verificarse en Chrome Android tras la publicación.
- **Cobertura de red:** el GTFS de Cercanías y el de Media Distancia pueden no identificar todas las líneas o estaciones. El catálogo conserva avisos de cobertura y no rellena huecos con servicios de otra categoría.
- **Predicción estadística:** no existe aún modelo calibrado con llegadas observadas. El motor contrasta fuentes y presenta evidencias, pero no predice de forma probabilística.
- **Exactitud ferroviaria:** no se han comparado las llegadas y supresiones con los monitores de los andenes. La aplicación sigue siendo un apoyo orientativo.
- **Coordinación de fuentes:** al tratarse de dos distribuidores de origen compartido, no equivale a evidencia independiente de circulación.
- **GitHub Actions:** se añade una comprobación de sintaxis y parser a la automatización. La descarga real de ambos GTFS y la ejecución en GitHub deben probarse tras desplegar el archivo actualizado.

## Publicación

Subir los archivos de la raíz, `scripts/build_network.py`, las dos referencias JSON, `tests/` y `.github/workflows/horario-renfe.yml` conservando las rutas. Ejecutar **Actions → Actualizar red Rodalies GTFS** y verificar `data/v2/catalog.json` antes de utilizar la V2.0.3. El `sw.js` incrementa la versión de caché para evitar cargar código antiguo.
