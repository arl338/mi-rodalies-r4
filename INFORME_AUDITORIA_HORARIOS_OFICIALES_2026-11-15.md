# Revisión de horarios oficiales de Mi Rodalies · 15 de noviembre de 2026

## Criterio de calidad y alcance

La fuente principal es la web de [Rodalies de Catalunya – todos los horarios](https://rodalies.gencat.cat/es/horaris/tots-els-horaris/) y sus cuadros horarios oficiales en PDF. El GTFS de Renfe es una fuente oficial adicional de programación base. Los servicios de terceros no se utilizan para inventar trenes, paradas ni tiempos de paso.

Una estación con al menos una hora en el catálogo no implica que **todos** sus servicios, sentidos o excepciones estén cubiertos. Los servicios por carretera no se convierten en trenes. La información de huelgas y obras puede invalidar la circulación efectiva del horario programado.

## Hallazgo y corrección principal: R2 Nord y R2 Sud

El ZIP de cercanías descargado actualmente en el workflow **no publica las rutas comerciales R2N/R2S como identificadores diferenciados**, aunque existen en otros conjuntos de datos Renfe. El clasificador se ha ampliado para reconocer solo los IDs oficiales `51TddddR2N` / `51TddddR2S` cuando estén presentes; un identificador genérico `C2` no se atribuye automáticamente a ningún ramal.

Se ha verificado y extraído el [PDF oficial R2 vigente, publicado en noviembre de 2026](https://rodalies.gencat.cat/web/.content/01_Actualitat/2026/11_09_Gava_Castelldefels/R2_2026-A-partir-del12.11.26-Castelldefels-acaben-en-Gava-1.pdf), con cuatro páginas y código SHA-256 `ba84f110be8c6c3b1ce09c04bf2758066a8287a46904f49617143f85faf5d7ac`.

La extracción lee las posiciones geométricas de **34 columnas oficiales de estaciones**, reconstruyendo cada fila con la hora realmente impresa, en ambos sentidos. No hace OCR ni interpola paradas. Se han incorporado las filas cuya adscripción R2 Nord o Sud es inequívoca:

| Línea comercial | Sentido | Días laborables | Sábados/domingos |
|---|---|---:|---:|
| R2 Nord | Hacia Aeroport | 37 | 37 |
| R2 Nord | Desde Aeroport | 37 | 37 |
| R2 Sud | Hacia Sant Vicenç de Calders | 69 | 68 |
| R2 Sud | Hacia Barcelona | 72 | 66 |
| **Total** | | **215** | **208** |

**423 plantillas oficiales** en total (no 423 trenes al día). La aplicación publica 3.190 instancias en la ventana de 15 ficheros examinada: **1.110 R2 Nord y 2.080 R2 Sud**, incluidas repeticiones por fecha.

**Cobertura de paradas de los recorridos publicados:** R2 Nord tiene 21 estaciones habituales más un servicio documentado con inicio en Barcelona-Estació de França; R2 Sud tiene 17 estaciones, todas con alguna hora documentada.

**Limitaciones y exclusiones expresas:** cuatro filas del PDF tienen indicaciones especiales de sábado/domingo/festivo que el importador deja fuera hasta validar su calendario exacto. Otras filas ambiguas no se clasifican artificialmente como R2 Nord/Sud. El PDF es válido del 12 de noviembre al 14 de diciembre de 2026. El 17 de noviembre hay convocatoria de huelga y los tiempos programados no demuestran circulación efectiva. Para fechas posteriores a la vigencia, este PDF no se usa.

No se han alterado las 554 instancias programadas R2 genéricas del GTFS: algunas tienen recorrido más largo que la línea comercial, y reclasificarlas exige matching inequívoco por servicio. Este problema de ramales y duplicidades visuales sigue pendiente.

## Auditoría de estaciones con horarios publicados (ventana 14–28 de noviembre)

| Línea | Estaciones referencia | Estaciones con alguna hora | Situación pendiente |
|---|---:|---:|---|
| R1 | 31 | 27 | Molins de Rei, Sant Feliu de Llobregat, Sant Joan Despí y Cornellà no figuran en el PDF R1 utilizado |
| R2 | 14 | 14 | GTFS genérico abarca 18 estaciones externas al recorrido comercial R2; revisar antes de reasignar |
| R2 Nord | 22 incluyendo variante oficial | 22 | Cuatro filas de calendario especial excluidas del cuadro conjunto; revisar excepciones |
| R2 Sud | 17 | 17 | Revisar excepciones por huelgas/obras y concordancia con R2 genérica |
| R3 | 35 | 28 | 7 paradas sin horarios; muchos servicios de dos paradas, afectaciones ferroviarias |
| R4 | 40 | 40 | Un fragmento de Rajadell en GTFS etiquetado R4, posible conflicto de adscripción RL4 |
| R7 | 7 | 6 | Barcelona-Torre Baró/Vallbona; cambios operativos de tramo |
| R8 | 9 | 9 | Comprobar exhaustividad de servicios y calendarios |
| RG1 | 44 | 18 | Gran parte del corredor del Maresme sin trenes RG1 del PDF vigente |
| RT1 | 6 | 6 | Calendarios y número total de servicios por validar |
| RT2 | 7 | 2 | El PDF verificado solo asigna tiempos a Tarragona y Salou-Port Aventura; no inventar paradas de paso |
| RL3 | 9 | 9 | Horarios publicados; validar festivos excepcionales |
| RL4 | 18 | 16 | Hasta Manresa, después conexión R4; no etiquetar el transbordo como tren RL4 |
| R11 | 28 | 28 | Solo una selección de horarios PDF, no cobertura completa de ambos sentidos |
| R13 | 21 | 4 | Segmentos afectados por bus de sustitución; no ofrecer tren continuo |
| R14 | 23 | 6 | Segmentos afectados por bus de sustitución; no ofrecer tren continuo |
| R15 | 20 | 19 | Falta horario verificado de Riba-roja d'Ebre; importación parcial por sentidos |
| R16 | 18 | 16 | No aparecen horarios de Vilanova i la Geltrú / Ulldecona en registros importados |
| R17 | 9 | 9 | Revisar exhaustividad de servicios y excepciones |

## Control técnico implantado

- `data/reference/r2_official_timetable.json`: 423 servicios PDF verificados con página, posición y parada.
- `scripts/extract_official_r2.py`: descarga oficial, extracción geométrica y exclusión de filas no verificadas.
- `scripts/official_r2.py`: calendario, vigencia, identidad, deduplicación y reconstrucción exacta por parada.
- `scripts/build_network.py`: suma R2N/R2S sin modificar la base del resto de líneas; el catálogo identifica su procedencia.
- `engine.js`: los horarios PDF no se presentan como posición de tren confirmada.
- `app.js`: enlace al PDF oficial, procedencia y advertencia de huelga.
- `tests/test_official_r2.py`: comprobación de ambos sentidos, 423 filas, hora impresa, vigencia y duplicados.
- `.github/workflows/audit-r2-official.yml`: revisión periódica del PDF, que vuelve a validar los datos antes de cambiarlos.

### Auditoría siguiente

1. Revisar las filas R2 con calendario específico, y cruzar R2 genérica con los nuevos ramales por identidad/horas y trayecto.
2. Completar regionales R11/R13/R14/R15/R16 por PDF actual, distinguiendo tren y transporte alternativo.
3. Revisar R3, R7 y RG1 según sus tramos efectivos y las obras.
4. Evaluar la actualización de vigencia cuando el PDF temporal R2 expire el **14/12/2026**.
5. Solo cuando el horario oficial esté completo, contrastar con Valfiguer, RadarDeTrenes y demás feeds para enriquecer ETA y cancelaciones por tren identificado.

**Límite de certificación:** todos los datos ahora mostrados para R2 Nord y R2 Sud proceden de filas y horas del PDF oficial identificado, pero no se ha contrastado de forma independiente la totalidad de calendarios especiales ni las circulaciones reales.
