# Publicación de Mi Rodalies Catalunya V2.0.4 en GitHub

Repositorio: https://github.com/arl338/mi-rodalies-r4

1. Descomprime el ZIP en tu ordenador. No subas el ZIP ni la carpeta contenedora al repositorio.
2. En GitHub, abre **Code → Add file → Upload files** y arrastra todo el **contenido** descomprimido a la raíz. Es importante conservar la estructura de las carpetas `.github`, `data/reference`, `scripts` y `tests`.
3. Comprueba que aparecen `index.html`, `app.js`, `engine.js`, `styles.css` y `sw.js` en la raíz. `data/reference/fallback_catalog.json` debe estar en su subcarpeta. `.github/workflows/horario-renfe.yml` también debe conservar su ruta.
4. Pulsa **Commit changes** en la rama `main`.
5. En **Actions** busca «Actualizar red Rodalies · GTFS + validación Generalitat V2.0.4». Normalmente se ejecutará al detectar la subida. Si no, abre su ficha y pulsa **Run workflow → main → Run workflow**.
6. Comprueba que la ejecución termina en verde y que en la carpeta `data/v2` aparecen `catalog.json` y los JSON de cada día. Si el workflow termina en rojo, abre el paso «Obtener GTFS» y copia el error: no inventes horarios manualmente.
7. Abre https://arl338.github.io/mi-rodalies-r4/ en Chrome. Debe mostrar **2.0.4**. Selecciona línea → origen → destino. Si sigue diciendo «catálogo provisional», actualiza la página: el workflow aún no habrá publicado un GTFS completo o el navegador mantiene datos antiguos.

**Nota:** No necesitas pagar por un servidor ni crear otro repositorio. No borres los JSON anteriores de `data/v2` manualmente.
