# Mi Rodalies Catalunya · V2.0.4

## Correcciones

- Selección **línea → origen → destino** mediante tres listas nativas, sin texto libre.
- Los dos favoritos de Terrassa conservan la R4 y permiten invertir las estaciones.
- Con una línea concreta solo se listan servicios oficiales de esa línea. «Todas las líneas» permite combinaciones con un transbordo.
- El catálogo completo y los horarios proceden de Renfe GTFS. Un catálogo de referencia **parcial** permite mostrar controles mientras no se haya ejecutado GitHub Actions; **no incluye horarios** y está rotulado como provisional.
- El workflow se ejecuta al subir la nueva configuración a `main`, además de poder ejecutarse manualmente y cada día.
- Si los archivos no se han publicado en GitHub Pages, se intenta la lectura desde `raw.githubusercontent.com`, y viceversa.
- Las fuentes externas mantienen únicamente función de contraste: no crean itinerarios ajenos al GTFS.

## Instalación

Subir a la raíz los archivos estáticos, `data/reference/fallback_catalog.json`, los dos ficheros de referencia restantes, `scripts/build_network.py` y `.github/workflows/horario-renfe.yml`.
Ejecutar **Actions → Actualizar red Rodalies → Run workflow** si no empieza automáticamente. Confirmar que existe `data/v2/catalog.json` y ficheros `AAAA-MM-DD.json`.
En móvil recargar y comprobar `2.0.4`.

## Limitaciones

Sin ejecución del workflow no hay catálogo completo ni horarios; el catálogo de referencia solo contiene estaciones con códigos ADIF comprobados. La cobertura por líneas regionales dependerá del etiquetado del GTFS real; no se inventa. No se han verificado todas las respuestas en vivo contra monitores físicos.
