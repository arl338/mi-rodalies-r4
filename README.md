# Mi Rodalies Catalunya · V2.0.5

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
