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


## V2.3.1 — revisió de la R1 (12/11/2026)

La línia R1 s'ha contrastat amb les quatre taules del [quadre PDF oficial de Rodalies](https://rodalies.gencat.cat/web/.content/02_Horaris/horaris/R1.pdf): laborables i caps de setmana, en tots dos sentits. Les 328 circulacions de referència contenen **només hores de parada realment impreses**, sense interpolació. La quadrícula inclou **27 parades entre l'Hospitalet i Maçanet-Massanes**, no pas el tram Molins de Rei–l'Hospitalet, que figura a la descripció general de la R1 però no al quadre actual.

Les 123 circulacions GTFS de la instantània anterior van coincidir totes amb dues parades i hores del PDF. El GTFS renovat ja va aportar **190 circulacions laborables**, les mateixes 95 per sentit del PDF. El generador ara afegeix només els serveis PDF que faltin, i **mai elimina els trens GTFS existents**. Quan el GTFS torna a ser complet, n'afegeix zero i conserva els identificadors de tren, més útils per a les ETA.

L'usuari veu un avís específic si busca una de les quatre estacions sense horari R1 verificat en aquest quadre: Molins de Rei, Sant Feliu de Llobregat, Sant Joan Despí i Cornellà. L'absència de resultats no s'equipara a una cancel·lació.

**Validacions:** extracció de 95+95 serveis laborables i 69+69 de cap de setmana; 123/123 viatges GTFS verificats amb dues parades del PDF; reconstrucció de 190 serveis laborables sense duplicats; Chromium Android amb 42 sortides L'Hospitalet → Mataró entre les 06:00 i les 14:00 i identificació exacta dels 12 primers resultats. La informació és programada, no acredita la circulació real ni l'exactitud de les ETA. Els festius i les alteracions puntuals requereixen verificació addicional.


## V2.3.2 · RL3: Anglesola → Lleida i les nou parades oficials

La consulta **RL3, Anglesola → Lleida-Pirineus, 12/11/2026, 13:15–21:15** no mostrava cap tren tot i que les fonts publicades en confirmen dos de directes: **15:58→16:35 (15609)** i **19:31→20:08 (33541)**. Trenalia sí retornava dos horaris correctes, però l'aplicació depenia d'una resposta puntual de l'API per disposar de serveis RL3, perquè el GTFS Renfe actual no conté `stop_times` identificats com a RL3.

Aquesta versió incorpora al catàleg els **16 serveis RL3** del [PDF oficial de Rodalies vigent des del 6 de juliol de 2026](https://rodalies.gencat.cat/web/.content/02_Horaris/horaris/RL3RL4.pdf): 12 laborables (sis per sentit) i quatre de cap de setmana (dos per sentit). Es conserven els nou horaris de parada impresos, el número comercial de tren i el sentit. No s'afegeix cap recorregut RL4 a partir de les files RL3.

Les ETA continuen sent conservadores: per vincular una observació a un servei PDF, cal número, estació, línia i sentit coherent. Quan falta aquesta evidència, la sortida es manté com a **«Solo horario»**. Les alteracions, els dies festius i les vagues poden modificar els serveis efectius.

**Prova:** reconstrucció real amb GTFS auditat i Chromium Android amb les dues API externes simulades fora de servei: la consulta exacta d'Anglesola mostra **15:58 i 19:31** com a horari programat. La cobertura de la RL4 continua pendent de revisió específica, sense extreure conclusions de la RL3.
