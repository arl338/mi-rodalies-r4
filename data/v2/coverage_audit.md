# Auditoría automática de horarios, líneas y estaciones

**Generado:** 2026-11-13T12:10:01.339594+01:00  
**Lote:** \`d7979f735be4d55cd7e7\`  
**Días publicados:** 15; 2026-11-12 a 2026-11-26  
**Instancias de tren:** 15581

La presencia de una parada no acredita servicio comercial ni cobertura íntegra.
Las horas son programadas; no se usan feeds de terceros en este informe.

| Línea | Estaciones inventario | Con horarios | Sin horarios | Servicios con 2 paradas |
|---|---:|---:|---:|---:|
| R1 | 31 | 27 | 4 | 0 |
| R2 | 14 | 14 | 0 | 0 |
| R2N | 21 | 0 | 21 | 0 |
| R2S | 17 | 0 | 17 | 0 |
| R3 | 35 | 28 | 7 | 3240 |
| R4 | 40 | 40 | 0 | 4 |
| R7 | 7 | 5 | 2 | 0 |
| R8 | 9 | 9 | 0 | 0 |
| RG1 | 44 | 18 | 26 | 0 |
| RT1 | 6 | 6 | 0 | 0 |
| RT2 | 7 | 2 | 5 | 240 |
| RL3 | 9 | 9 | 0 | 0 |
| RL4 | 18 | 16 | 2 | 0 |
| R11 | 28 | 28 | 0 | 0 |
| R13 | 21 | 4 | 17 | 0 |
| R14 | 23 | 6 | 17 | 0 |
| R15 | 20 | 19 | 1 | 0 |
| R16 | 18 | 16 | 2 | 0 |
| R17 | 9 | 9 | 0 | 0 |

## Estaciones sin horarios estructurados

**R1**: Cornellà, Molins de Rei, Sant Feliu de Llobregat, Sant Joan Despí

**R2N**: Aeroport, Barcelona El Clot, Barcelona Sant Andreu, Barcelona-Passeig de Gràcia, Barcelona-Sants, Bellvitge - Gornal, Cardedeu, El Prat de Llobregat, Granollers Centre, Gualba, Hostalric, La Llagosta, Les Franqueses-Granollers Nord, Llinars del Vallès, Maçanet-Massanes, Mollet-Sant Fost, Montcada i Reixac, Montmeló, Palautordera, Riells i Viabrea-Breda, Sant Celoni

**R2S**: Barcelona-Estació de França, Barcelona-Passeig de Gràcia, Barcelona-Sants, Bellvitge - Gornal, Calafell, Castelldefels, Cubelles, Cunit, El Prat de Llobregat, Garraf, Gavà, Platja de Castelldefels, Sant Vicenç de Calders, Segur de Calafell, Sitges, Viladecans, Vilanova i la Geltrú

**R3**: Barcelona Arc de Triomf, Barcelona La Sagrera-Meridiana, Barcelona Torre Baró-Vallbona, Barcelona-Plaça de Catalunya, Barcelona-Sants, L'Hospitalet de Llobregat, La Tor de Querol-Enveig

**R7**: Barcelona Torre Baró-Vallbona, Barcelona-Fabra i Puig

**RG1**: Arenys de Mar, Badalona, Barcelona Arc de Triomf, Barcelona El Clot, Barcelona-Plaça de Catalunya, Barcelona-Sants, Blanes, Cabrera de Mar-Vilassar de Mar, Caldes d'Estrac, Calella, Canet de Mar, El Masnou, L'Hospitalet de Llobregat, Malgrat de Mar, Mataró, Montgat, Montgat-Nord, Ocata, Pineda de Mar, Premià de Mar, Sant Adrià de Besòs, Sant Andreu de Llavaneres, Sant Pol de Mar, Santa Susanna, Tordera, Vilassar de Mar

**RT2**: Altafulla-Tamarit, El Vendrell, L'Arboç, Sant Vicenç de Calders, Torredembarra

**RL4**: Sant Vicenç de Castellet, Terrassa Estació del Nord

**R13**: Barcelona-Estació de França, Barcelona-Passeig de Gràcia, Barcelona-Sants, L'Espluga de Francolí, La Floresta, La Plana-Picamoixons, La Riba, Montblanc, Nulles-Bràfim, Roda de Mar, Salomó, Sant Vicenç de Calders, Valls, Vilabella, Vilaverd, Vimbodí i Poblet, Vinaixa

**R14**: Altafulla-Tamarit, Barcelona-Estació de França, Barcelona-Passeig de Gràcia, Barcelona-Sants, Juneda, L'Espluga de Francolí, La Floresta, La Riba, Les Borges Blanques, Lleida-Pirineus, Montblanc, Puigverd de Lleida-Artesa de Lleida, Sant Vicenç de Calders, Torredembarra, Vilaverd, Vimbodí i Poblet, Vinaixa

**R15**: Riba-roja d'Ebre

**R16**: Ulldecona-Alcanar-La Sénia, Vilanova i la Geltrú

## Horarios fuera del inventario comercial

**R2**: Sant Vicenç de Calders (71600), Calafell (71601), Segur de Calafell (71602), Cunit (71603), Cubelles (71604), Vilanova i la Geltrú (71700), Sitges (71701), Garraf (71703), Platja de Castelldefels (71704), Cardedeu (79101), Llinars del Vallès (79102), Palautordera (79103), Sant Celoni (79104), Gualba (79105), Riells i Viabrea-Breda (79106), Hostalric (79107), Les Franqueses-Granollers Nord (79109), Maçanet-Massanes (79200)

**R4**: Rajadell (78506)

## Interpretación

El CSV incluye cada combinación línea-estación y sus recuentos, incluso cuando son cero.
El JSON incluye el detalle por fecha, fuente y estación.
No deducir horario, cancelación ni retraso a partir de una estación sin datos.
