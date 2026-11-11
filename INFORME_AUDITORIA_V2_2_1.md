# Auditoría integral V2.2.1 · Mi Rodalies

**Fecha:** 11 de noviembre de 2026  
**Alcance:** lógica de horarios y ETA, sincronización multifuente, cobertura GTFS, presentación móvil Android, rendimiento, caché PWA y regresiones.  
**Cambios:** rama de trabajo aislada `audit/v2-2-1-total-validation`.

## Resultados y mejoras

| Área | Hallazgo | Corrección aplicada |
| --- | --- | --- |
| Franja de búsqueda | Las opciones rápidas 2/4/8 h quedaban ancladas a la hora original, incluso al permanecer la aplicación abierta | Recalcular la ventana durante la actualización, sin modificar franjas establecidas manualmente |
| Inicio de cobertura | Se consultaba obligatoriamente el archivo del día anterior al primer día del catálogo, produciendo HTTP 404 y bloqueando resultados válidos | Solicitar únicamente los días publicados dentro de `coverage_start`/`coverage_end` |
| Estado de ETA | Una hora estimada válida podía verse bajo el distintivo «Solo horario» | Distintivo «Hora estimada», indicación explícita de hora programada y diferencia de retraso/adelanto |
| Visibilidad | Mensaje sobre líneas sin GTFS excesivamente extenso en pantalla pequeña | Resumen compacto con enlace contextual al panel detallado de cobertura |
| Proveniencia | El diagnóstico de fuentes no mencionaba la consulta de horarios complementarios | Añadir resultado de Trenalia y distinción entre horarios programados y observaciones operativas |
| Estado operativo | Una API accesible podía marcar salud positiva pese a no existir una ETA vinculada al trayecto | Usar «Estimación disponible» cuando hay ETA atribuible; «Sin ETA vinculada» o «Datos parciales» en su defecto |
| Latencia | Descargas GTFS, Trenalia y ocho fuentes operativas se encadenaban, pudiendo sumar sus tiempos de espera | Iniciar peticiones independientes en paralelo, conservando cancelación de solicitudes y el control de identidad |
| Ergonomía | Los horarios estimados sin posición podían pasar desapercibidos | Distinción cromática accesible, tamaño táctil y tipografía responsiva sin desbordamiento horizontal |
| Transparencia | La documentación solo describía parcialmente la alternativa al GTFS | Actualización de textos y atribución explícita a Trenalia |
| Caché PWA | El cambio de versión necesita evitar conservar JS/CSS previos | Actualizar a 2.2.1, `?v=221` y nuevo cache de Service Worker |

## Prioridad del algoritmo, sin cambios de seguridad

1. Hora estimada **de la estación**, vinculada a un servicio inequívoco y reciente.
2. Retraso observado de la **posición del tren identificada por `trip_id`**, solo si no hay ETA válida específica de estación y sin contradicción.
3. ETA aplicada a un horario sin número de tren, **solo si hay correspondencia única** por línea, código ADIF de estación y hora programada.
4. En cualquier otro caso, **únicamente horario programado**, indicando si el proveedor es Renfe GTFS o Trenalia.

Dos fuentes que reutilizan Renfe no son necesariamente dos observaciones independientes. Una ETA no confirma el paso real del tren por la estación.

## Comprobaciones automáticas

- `node --check` para `app.js`, `engine.js`, `sw.js`.
- Pruebas JS del motor, esquemas de Valfiguer/RadarDeTrenes, filtrado y correlación de ETA, cancelaciones, datos obsoletos y deduplicación de GTFS.
- Pruebas Python de construcción y calidad del catálogo, referencias y nombres de estaciones.
- Integridad de `data/v2`: fecha, lotes, servicio por línea y cobertura publicada.
- **Chromium móvil y escritorio**: 320, 390 y 768 px, con datos simulados verificables. Se han validado las tarjetas de ETA, el primer día del catálogo, los selectores nativos, ausencia de desbordamiento y el avance automático de la franja rápida.
- **APIs reales**: contratos de Trenalia, cotejo R4 Renfe/Trenalia y cruce de horarios alternativos con paneles Valfiguer/RadarDeTrenes.

**Ejecución final:** https://github.com/arl338/mi-rodalies-r4/actions/runs/43085517963

## Límites que no se deben ocultar

- La verificación de interfaz en Chromium emula tamaños y comportamiento móvil; no sustituye pruebas físicas en el Android del usuario.
- No existe una medida de error respecto al paso real obtenida en una estación; los algoritmos se validan por correspondencias, coherencia, antigüedad y casos conocidos.
- Solo seis de las diecinueve líneas tenían horarios GTFS estructurados en el catálogo inspeccionado; los horarios alternativos dependen de su proveedor, de calendario y de la presencia de códigos ADIF verificados.
- Sin una observación inequívoca, el resultado debe permanecer etiquetado como *solo horario programado*.
- No se afirma que la aplicación tenga cobertura de todas las paradas comerciales de todos los servicios.
- Los cambios de servicio por huelga, obras u otros avisos extraordinarios pueden modificar el horario teórico.

## Criterio de publicación

Publicar solo si las pruebas `correctness`, `android` y `live-contracts` finalizan con éxito. Mantener la capacidad de diagnosticar fuentes, GTFS, tren concreto y antigüedad, sin falsas garantías de puntualidad.
