# Horario oficial GTFS

Esta carpeta contendrá `schedule-r4.json`, generado exclusivamente desde el GTFS estático de Renfe Cercanías/Rodalies.

La tarea `.github/workflows/horario-renfe.yml` intenta actualizarlo diariamente. Si la descarga falla o el calendario no cubre las estaciones, **no genera información falsa**; se conserva la última descarga y la PWA rechazará fechas fuera de su cobertura o datos obsoletos.

Se puede generar manualmente con `python scripts/build_gtfs.py --zip <fichero.zip>`.

Fuente: Renfe Data, `https://data.renfe.com/es/dataset/horarios-cercanias` · CC BY 4.0.
