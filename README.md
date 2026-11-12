# Mi Rodalies Catalunya · V2.1.0

PWA gratuita para consultar horarios **programados** Renfe GTFS y contrastar observaciones operativas a través de Valfiguer y RadarDeTrenes. No confirma que un tren esté circulando.

## Precisión de datos

- Interpretación de `delay_s` en segundos y `delayMinutes` en minutos.
- Correspondencia `C4`/ `R4` y similares únicamente cuando consta el núcleo Catalunya o se consulta un panel de estación catalana.
- Avisos de otros núcleos (p.ej., Madrid) descartados; avisos de la línea elegida mostrados aunque no haya trenes en la franja.
- Transbordos afectados por retrasos etiquetados «Conexión en riesgo»; llegadas sin ETA comprobada siempre «programadas».
- Cambio de día, revalidación de catálogo, descarga del día de servicio anterior para horas GTFS mayores de 24 h, comprobación del mismo `batch_id` para catálogo y días.
- Conversión temporal según la regla oficial GTFS de mediodía menos doce horas, incluyendo cambios de horario.
- Auditoría de paradas GTFS original: `data/v2/source_audit.json`. Validación de salidas: `scripts/validate_generated.py`.

## Limitaciones demostradas de la fuente

El `stop_times.txt` de Renfe aporta **3.024 instancias R3 con solo dos paradas** durante el periodo auditado de 14 días. No se inventan estaciones ni horas intermedias. El GTFS incluye viajes etiquetados R2N/R2S y otras líneas sin sus correspondientes `stop_times` utilizables. La cobertura comercial completa de las 19 líneas no está garantizada; cada línea sin datos queda señalizada.

## Desarrollo y actualización

GitHub Actions ejecuta las pruebas JS y Python, audita el GTFS original, regenera los horarios y valida 15 ficheros diarios con una misma huella de lote.

- App: https://arl338.github.io/mi-rodalies-r4/
- CI: https://github.com/arl338/mi-rodalies-r4/actions/workflows/horario-renfe.yml

Datos: Renfe Data (CC BY 4.0), [Valfiguer](https://trenes.valfiguer.com/desarrolladores), [RadarDeTrenes](https://radardetrenes.com/docs) y referencia de líneas de [Generalitat de Catalunya](https://rodalies.gencat.cat/es/linies_estacions_i_trens/index.html). Información orientativa; consulta Renfe/Rodalies para decisiones de viaje.


## V2.1.0 · Inventario y PDF oficiales

- Se muestran 19 líneas y un inventario de referencia de 200 estaciones, cotejadas por identificador ADIF/GTFS cuando existe una equivalencia inequívoca. El catálogo generado puede contener estaciones adicionales GTFS; algunas entradas son referencia sin código ADIF verificado.
- Cada estación indica si dispone de alguna parada horaria GTFS. La pertenencia a la línea no implica trenes, circulación ni servicio vigente.
- Se enlaza el PDF oficial de cada línea desde el panel de auditoría y desde la búsqueda sin horarios GTFS. Estos documentos tienen calendarios y modificaciones; no se publican automáticamente como servicios estructurados.
- Los tableros operativos marcados `stale` no se consideran evidencia actual de estimación o cancelación.
- No se han generado horas ficticias ni reconstruido las 13 líneas con `stop_times` ausentes.


## V2.2.3 · Servicios R4 faltantes recuperados

La consulta por estación muestra las **horas programadas de paso por la estación de origen seleccionada**, no la hora de salida desde la cabecera ferroviaria. Para la R4 en sentido Manresa → Barcelona → Sant Vicenç se complementa el GTFS con el cuadro horario PDF oficial de Rodalies (laborables y fines de semana), extraído celda a celda y contrastado con horarios GTFS. Los servicios GTFS existentes no se eliminan, y los solapamientos se deduplican. Ejemplo validado para Terrassa Est → Plaça Catalunya, jueves 12/11/2026, 06:00–07:10: **06:03, 06:18, 06:33, 06:48, 06:55, 07:03**. Los tres nuevos servicios se presentan como horario programado hasta contar con observación operativa inequívoca. Para evitar asignaciones erróneas se impide vincular el tren R4 hacia Manresa de las 06:47 al R4 hacia Barcelona de las 06:48.

**Alcance:** la extracción PDF validada cubre el sentido indicado. El sentido contrario y las demás líneas siguen dependiendo de GTFS y de las alternativas ya integradas; no se certifica cobertura universal. Los cuadros publicados son teóricos, pueden variar por huelgas, obras y festivos, y su fuente/versión debe actualizarse cuando Rodalies publique cambios. Fuente: https://rodalies.gencat.cat/web/.content/02_Horaris/horaris/R4.pdf
