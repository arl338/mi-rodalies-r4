# Mi Rodalies R4 · V1.5 auditada

## Ámbito

- Ida: Terrassa Est (78710) → Barcelona-Plaça de Catalunya (78805).
- Vuelta: Barcelona-Sants (71801) → Terrassa Est (78710).
- Solo servicios con ambas paradas acreditadas en el GTFS de Renfe; los paneles generales no añaden trenes ajenos.
- Consultas de hoy, intervalo «Desde/Hasta» (mismo día), botones 2/4/8 h.

## Fuentes y criterio de evidencia

1. **Renfe GTFS estático (principal):** catálogo de salidas *programadas* del día. Lo procesa `scripts/build_gtfs.py`; el archivo resultante `data/schedule-r4.json` NO se incluye en esta actualización para conservar la descarga automática de GitHub.
2. **Valfiguer (complementaria):** tablero de la estación de origen, posiciones, cancelaciones, incidencias, estado de feeds y puntualidad agregada.
3. **RadarDeTrenes (complementaria):** tablero ADIF/Renfe de origen y posiciones distribuidas.

**Reglas:** ningún tren entra en la lista solo por aparecer en Sants u otro tablero; se exige itinerario GTFS origen → destino. Los tableros solo se correlacionan si línea R4, mismo número de tren y salida programada de origen con diferencia ≤2 min. Las posiciones recientes requieren R4, identificación y ventana temporal plausible. Las estimaciones sin sello temporal reciente no reemplazan la hora programada. No se suman proveedores que redistribuyen la misma fuente como confirmaciones independientes.

La lista puede estar incompleta si el GTFS no incorpora servicios extraordinarios; no se inventan recorridos. Una cancelación publicada por Renfe puede carecer de identificadores compatibles con GTFS y, por prudencia, no se atribuye a otro tren.

## Publicación en GitHub (sin cambiar Pages ni la automatización)

El ZIP contiene los 8 archivos de la raíz y `scripts/build_gtfs.py`. **No borres las carpetas** `.github` ni `data`, ni el archivo `data/schedule-r4.json` generado por la automatización.

1. Descomprime el ZIP en el ordenador.
2. En tu repositorio `arl338/mi-rodalies-r4` pulsa **Add file → Upload files**; sube a la raíz `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png` y `README.md`. Confirma el reemplazo.
3. En GitHub entra en la carpeta **scripts** → **Add file → Upload files** y sube `scripts/build_gtfs.py` desde la carpeta descomprimida (sin duplicar la carpeta `scripts`).
4. Ejecuta una vez **Actions → Actualizar horario oficial Renfe GTFS → Run workflow**. Comprueba que crea `data/schedule-r4.json` y no falla.
5. Comprueba que la web muestra **v1.5**; si persiste una versión anterior, actualiza Chrome y vuelve a abrir la PWA.

La PWA continúa disponible en https://arl338.github.io/mi-rodalies-r4/

## Auditoría y límites

Las pruebas reproducibles están documentadas en el informe `Informe_auditoria_Mi_Rodalies_V1_5.md` entregado por separado. Se han ejecutado pruebas de interfaz móvil simulada (390, 360, 320 y 768 px), nueve escenarios de integración con respuestas ficticias, procesador GTFS con fichero de prueba y lectura del JSON aportado por el usuario.

**No se ha validado aún la exactitud del paso real de trenes en estaciones ni el acceso real de todos los endpoints desde Android.** Es necesario comparar varias jornadas con monitores físicos. Las fuentes externas pueden fallar, cambiar su estructura o publicar datos incompletos.
