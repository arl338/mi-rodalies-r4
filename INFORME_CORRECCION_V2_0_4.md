# Mi Rodalies Catalunya V2.0.4 — informe de corrección

Fecha: 11/11/2026

## Incidencias constatadas

- La V2.0.3 requería `data/v2/catalog.json`. Si GitHub Actions no había generado y guardado ese archivo, la interfaz completa se bloqueaba con «Sin catálogo».
- El selector dependía de teclear el nombre correcto de cada estación. No había selector previo de línea ni filtrado fiable de estaciones en el propio formulario.
- Las carpetas `data/v2` no están incluidas como horarios publicados en el ZIP porque deben generarse a partir de la descarga oficial de Renfe; no es adecuado inventar ese catálogo.

## Solución implementada

1. **Línea → estación origen → estación destino.** Selectores nativos para Android; las estaciones se extraen de los registros de línea del GTFS en cuanto están publicados.
2. **Alcance de búsqueda preciso.** Al elegir una línea, el motor solo utiliza trenes identificados con esa línea. La opción «Todas las líneas» conserva la funcionalidad de conexiones entre líneas.
3. **Favoritos e inversión de recorrido.** Los dos favoritos existentes se mantienen; los botones cambian el valor de los tres selectores y los resultados anteriores se invalidan.
4. **Catálogo provisional inequívoco.** Ante la ausencia del GTFS, se muestran las 19 líneas y solo 10 estaciones con código ADIF verificado disponibles en una referencia parcial. No se generan horarios ni se atribuye cobertura completa a esa referencia. La referencia está integrada en `app.js` como último recurso, incluso si falla su JSON complementario.
5. **Carga con alternativas.** Lectura de `catalog.json` y horarios por `raw.githubusercontent.com` y por GitHub Pages, sin asumir que un commit automatizado vuelve a desplegar Pages.
6. **Automatización.** El workflow añade disparador `push` para la actualización del generador, sus referencias o la configuración, además de la ejecución manual y programada. No se dispara por la actualización que el propio workflow hace de `data/v2`, evitando bucles.
7. **Interfaz.** Campos nativos táctiles, estados deshabilitados coherentes, ayuda con recuento de estaciones por línea y visualización móvil corregida.

## Pruebas ejecutadas

- `node --check app.js` y `node --check engine.js`: correctos.
- `python -m py_compile scripts/build_network.py`: correcto.
- `node tests/test_engine.cjs`: 17 grupos de aserciones superados.
- `node tests/test_feed_schemas.cjs`: casos de esquemas, datos obsoletos y contradicciones superados.
- `pytest`: 10 pruebas Python superadas.
- `python tests/test_ui_v204.py`: Chromium en anchos 320, 360, 390 y 768 px, selector de línea, filtrado de origen/destino, favoritos, invertir, franja, ausencia de scroll horizontal, captura visual y escenario en que faltan ambos JSON (catálogo real y fallback) con referencia interna segura.

## Limitaciones no resueltas / evidencia pendiente

- **Cobertura total:** no se ha podido ejecutar en este entorno la descarga completa y actual de ambos GTFS (Cercanías y Media Distancia). La primera ejecución en GitHub Actions indicará las líneas y estaciones reales identificadas, con advertencias para servicios regionales no etiquetados correctamente.
- **Feeds vivos:** el motor de evidencias externas mantiene reglas estrictas, pero no está acreditada su coincidencia con los monitores físicos de estación; se requiere validación operacional.
- **El catálogo de referencia es deliberadamente incompleto:** no representa todas las paradas y no puede sustituir al GTFS.
- **Sin servidor de pago:** infraestructura GitHub Pages y GitHub Actions de repositorio público, sujeto a condiciones de uso del proveedor.

## Validación tras publicar

1. Subir la nueva V2.0.4, incluida `.github/workflows/horario-renfe.yml`, `scripts/build_network.py` y `data/reference/*.json`.
2. Entrar en GitHub Actions y comprobar la ejecución «Actualizar red Rodalies · GTFS + validación Generalitat V2.0.4». Si no arranca, usar `Run workflow`.
3. Comprobar que se genera `data/v2/catalog.json` y al menos un archivo diario `AAAA-MM-DD.json` en la rama `main`.
4. Abrir la PWA en Android, verificar `2.0.4` y que aparecen la línea y sus estaciones. Comprobar R4 y otros corredores con cobertura indicada.
5. Si el teléfono conserva una versión antigua, recargar el sitio y cerrar/reabrir la PWA para actualizar el Service Worker.
