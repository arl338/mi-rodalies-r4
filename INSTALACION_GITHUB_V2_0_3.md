# Instalación de Mi Rodalies V2.0.3 en tu repositorio

Repositorio existente: `https://github.com/arl338/mi-rodalies-r4`.

**No crees otro repositorio, no borres los horarios generados en `data/v2/` y no modifiques GitHub Pages.**

## 1. Archivos de la interfaz (raíz del repositorio)

En **Code → Add file → Upload files**, sube directamente estos archivos del ZIP (sin carpeta contenedora):

`index.html`, `styles.css`, `app.js`, `engine.js`, `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `README.md`.

Puedes subir también los informes de auditoría y metodología si quieres tenerlos versionados. Pulsa **Commit changes**.

## 2. Generador Python

Entra en la carpeta `scripts/` del repositorio. Sube `scripts/build_network.py` del ZIP, de forma que quede `scripts/build_network.py` y no `scripts/scripts/build_network.py`. Confirma cambios.

## 3. Datos de referencia

En `data/reference/`, actualiza los dos archivos `generalitat_lines.json` y `station_aliases.json` del ZIP (si ya están actualizados puedes conservarlos).

## 4. Pruebas del workflow (OBLIGATORIO)

En la carpeta `tests/` sube los archivos `.py` y `.cjs` incluidos en el ZIP, especialmente `test_engine.cjs` y **`test_feed_schemas.cjs`**. El nuevo workflow los necesita.

## 5. Automatización de horarios

En la ruta existente `.github/workflows/horario-renfe.yml`, sustituye el archivo por el del ZIP. Es una carpeta oculta en Windows; puedes entrar directamente en GitHub a esa carpeta usando el navegador y editar el archivo allí.

## 6. Actualización oficial del catálogo

En **Actions → Actualizar red Rodalies · GTFS + validación Generalitat V2.0.3**, pulsa **Run workflow**, rama `main`.

Comprueba que todos los pasos terminan en verde. En particular:

- `Comprobar sintaxis y motor de datos`
- `Obtener GTFS Renfe y contrastar líneas con Generalitat`
- `Validar JSON generado y servicios`
- `Guardar catálogo y horarios oficiales`

Comprueba que se ha actualizado `data/v2/catalog.json` y que existen horarios para los días de cobertura. El workflow indicará las líneas sin servicios detectados.

## 7. Comprobación en Android

Abre `https://arl338.github.io/mi-rodalies-r4/`. Debe aparecer **2.0.3**. Si Chrome conserva la versión anterior, recarga la página, ciérrala y vuelve a abrirla; el Service Worker tiene caché nueva.

Prueba ambos favoritos R4 con una franja realista. Luego prueba dos estaciones diferentes, el botón Invertir y una franja con un transbordo. Abre «Diagnóstico de fuentes» para ver qué APIs responden.

**La aplicación muestra horarios programados aunque no haya confirmación de circulación.** Comprueba la información de la estación en caso de dudas.
