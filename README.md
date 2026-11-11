# Mi Rodalies · Versión 2.0.3 (auditada)

PWA HTML5 de coste cero para consultar **trenes de Rodalies Renfe en Catalunya** por estación de origen/destino y fecha. No incluye AVE, Avant ni larga distancia. Mantiene dos favoritos: Terrassa Est → Barcelona-Plaça de Catalunya y Barcelona-Sants → Terrassa Est.

## Alcance y precisión

- Incluye las 19 líneas publicadas en el catálogo de Rodalies de Catalunya: R1, R2, R2 Nord, R2 Sud, R3, R4, R7, R8, RG1, RT1, RT2, RL3, RL4, R11, R13, R14, R15, R16 y R17.
- Las **líneas visibles con horarios** dependen de que las fuentes oficiales GTFS las identifiquen explícitamente. `catalog.json` declara `present:false` para las no cubiertas: nunca se inventan trenes ni se incluyen LD/AVE como sustitución.
- Se buscan servicios directos o con **un único transbordo**. Los transbordos disponen de al menos ocho minutos de margen teórico; no se confirma que la conexión vaya a realizarse.
- Datos base: Renfe GTFS Cercanías y, únicamente para líneas explícitamente identificadas, GTFS de Media Distancia; programación actualizada a diario mediante GitHub Actions.
- Contraste: posición del tren, tablero del origen, cancelaciones y avisos publicados mediante Valfiguer y RadarDeTrenes. Las fuentes dependientes de Renfe no son observaciones independientes. Si se identifican solo por el mismo número sin itinerario/trip_id no se presentan como confirmación de circulación.
- Para fechas futuras se muestran **solo horarios programados**. El servicio no se garantiza hasta que haya evidencia operativa; la información oficial del andén prevalece.
- El catálogo se construye con las estaciones de los GTFS que pertenecen a rutas Rodalies identificables; algunas estaciones pueden aparecer sin servicios programados para una fecha concreta. El catálogo y los servicios se validan por separado.
- La cobertura estrictamente catalana se basa en coordenadas del GTFS (ámbito geográfico aproximado) y exclusión explícita de estaciones fronterizas francesas identificadas. No sustituye a un censo geográfico oficial de límites administrativos.

## Instalación desde el repositorio existente

1. Descarga el ZIP y descomprímelo. Sube a la raíz de `arl338/mi-rodalies-r4`: `index.html`, `app.js`, `engine.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, los dos iconos y `README.md`.
2. Sube a `scripts/` el archivo nuevo `build_network.py` (mantener `build_gtfs.py` si quieres conservar el histórico).
3. Sustituye el contenido de `.github/workflows/horario-renfe.yml` por el archivo del ZIP. **No subas la carpeta como `.github` a otra subcarpeta.**
4. En GitHub → **Actions** → **Actualizar red Rodalies · GTFS + validación Generalitat V2.0.3** → **Run workflow** (rama `main`). Comprueba que aparezcan los archivos `data/v2/catalog.json` y `data/v2/AAAA-MM-DD.json`. El trabajo publica un catálogo nuevo cada día.
5. GitHub Pages sigue apuntando a `main` / `(root)` y conserva la dirección `https://arl338.github.io/mi-rodalies-r4/`. Abre la aplicación y verifica la etiqueta **2.0**. Actualiza Chrome si sigue apareciendo la caché de la V1.5.

## Limitaciones

Sin hardware ni servicios de pago; GitHub Pages y Actions sujetos a sus límites gratuitos. No se han probado desde esta máquina los endpoints reales con Chrome Android ni la descarga completa de ambos ZIP oficiales (entorno sin salida de red); se aportan pruebas sintéticas y registro de cobertura, **no garantía de compatibilidad con las 19 líneas hasta ejecutar el workflow en GitHub**. Las estaciones y los horarios están disponibles en el catálogo solo cuando el GTFS oficial los suministra. Las incidencias graves pueden no quedar reflejadas a tiempo en las fuentes.

## Pruebas locales

`python -m unittest discover -s tests -v` y `node tests/test_engine.cjs` desde la raíz. Las pruebas de interfaz requieren Playwright y un servidor HTTP local. El historial de pruebas se documenta en `INFORME_VALIDACION_V2.md`.

Datos: Renfe Data, CC BY 4.0; información redistribuida por Valfiguer y RadarDeTrenes. Proyecto no afiliado a Renfe ni Generalitat.


## Validación adicional con Rodalies de la Generalitat (V2.0.1)

El archivo `data/reference/generalitat_lines.json` contiene las **19 líneas**
referenciadas por Rodalies de Catalunya, sus enlaces oficiales y **54 puntos
de control** de estaciones principales o terminales. Esta lista de control
**no constituye un censo exhaustivo de paradas**.

`build_network.py` verifica que las 19 etiquetas están definidas, contrasta
los puntos de control de cada línea con los códigos y nombres GTFS de Renfe
y guarda en `data/v2/catalog.json` la sección `official_reference`:

- `controles_localizados`: puntos seleccionados presentes; no prueba la totalidad
  de estaciones ni el servicio real de cada tren.
- `pendiente_contraste`: hay controles sin coincidencia de nombre o cobertura;
  puede deberse a variantes de denominación, obras o servicios parciales.
- `sin_horarios_publicados`: el GTFS procesado no contiene servicios etiquetados
  explícitamente con la línea para el periodo. No implica que la línea haya
  dejado de existir ni que esté suspendida.

Las referencias de la Generalitat no crean trenes nuevos ni eliminan paradas
GTFS: **solo auditan** lo declarado por Renfe. El recorrido real de cada
servicio sigue exigiendo coincidencia de origen y destino dentro de sus
`stop_times` GTFS y aplicación posterior de evidencias operativas.

Ejecución: `python scripts/build_network.py --days 14 --out data/v2`,
o mediante el workflow de GitHub Actions incluido.

## 2.0.2 — normalización de nombres y metodología visible

Se incorpora data/reference/station_aliases.json (códigos verificados ADIF/BOE), validación por código y sugerencias no automáticas. Panel «Cómo calculamos tus horarios» en la PWA. La fuente principal de horarios sigue siendo Renfe GTFS y los feeds operativos solo corroboran servicios identificados.

## 2.0.3 — auditoría de código y usabilidad

- Normalización completa de tableros y posiciones documentados por Valfiguer/RadarDeTrenes, incluidas marcas Unix en milisegundos.
- Coincidencia estricta con el tren GTFS y control de estimaciones contradictorias o desactualizadas.
- Estado de consultas invalidado cuando cambia la selección; no se arrastran avisos del trayecto anterior.
- Validación de franjas de madrugada y cambio horario en Europe/Madrid; caché de horarios renovada cada cinco minutos.
- Fecha a ancho completo y horas más legibles en Android; controles táctiles ampliados.
- La automatización comprueba el JavaScript y sus tests antes de descargar el GTFS. **Es imprescindible subir también `tests/` para que el workflow funcione.**
- Informe reproducible: `INFORME_AUDITORIA_V2_0_3.md`.
