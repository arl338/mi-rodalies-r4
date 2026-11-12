# Validació de fonts i precisió de les 19 línies · V2.3.0

**Data del contrast:** 12 de novembre de 2026. **Abast:** totes les línies disponibles al selector de Mi Rodalies. Les dades són una fotografia d'una jornada i d'un corredor representatiu, **no** una certificació de tots els serveis ni de cada estació.

## Regles d'utilització

- **GTFS Renfe i PDF R4 ja verificat:** es mantenen íntegres els serveis existents. Només es deduplica l'horari de Trenalia quan la línia, el recorregut, la sortida i l'arribada són pràcticament idèntics; dos trens separats per un minut no es fusionen.
- **Trenalia:** pot afegir serveis directes amb hores programades d'origen i destinació quan el GTFS no en disposa. Es comproven data, codi ADIF, operador, producte, línia i ordre horari. No s'inventen parades ni hores intermèdies.
- **ETA de serveis sense número:** requereix una observació recent, estació i línia coincidents, sortida programada dins de 60 segons, número de tren únic i **destinació/sentit verificat** per a *totes* les línies. Si el terminal del panell coincideix exactament amb l'estació escollida, es pot validar. Si és més lluny, cal un recorregut complet GTFS verificat de la mateixa línia que demostri l'ordre de les parades. Per als serveis del PDF R4 es fa servir la seqüència real de parades extreta del PDF.
- **Sense identificació suficient, sense ETA:** es preserva l'horari programat amb indicació de la font. Una posició sense `trip_id` atribuïble no es converteix en una posició confirmada del servei anònim.
- **Mode «Totes les línies»:** també consulta i combina Trenalia amb el GTFS, sense eliminar la línia comercial original de cada servei.

## Mostreig de la font alternativa Trenalia

Totes les respostes van ser HTTP 200 i es van processar segons les regles estrictes del normalitzador. Els valors indiquen els serveis directes *acceptats per a la línia concreta* en el corredor provat el 12/11/2026. La mateixa API pot retornar altres productes (Regionals, AVE, Avant) que **no s'atribueixen a una línia Rodalies sense evidència**.

| Línia | Horaris GTFS estructurats al catàleg | Corredor de mostra (ADIF) | Horaris alternatius de la línia vàlids |
|---|---|---|---:|
| R1 | Sí | Barcelona-Plaça Catalunya → Arenys de Mar | 43 |
| R2 | Sí | Barcelona-Sants → Granollers Centre | 13 |
| R2 Nord | No | Barcelona-Sants → Granollers Centre | 28 |
| R2 Sud | No | Barcelona-Sants → Vilanova i la Geltrú | 42 |
| R3 | Sí | Vic → Puigcerdà | 13 |
| R4 | Sí + PDF oficial (un sentit) | Terrassa Est → Barcelona-Plaça Catalunya | 46 |
| R7 | Sí | Montcada-Bifurcació → Cerdanyola Universitat | 22 |
| R8 | Sí | Martorell Central → Granollers Centre | 11 |
| RG1 | No | Maçanet-Massanes → Girona | 5 |
| RT1 | No | Tarragona → Reus | 3 |
| RT2 | No | Tarragona → Salou-Port Aventura | 5 |
| RL3 | No | Lleida-Pirineus → Cervera | 3 |
| RL4 | No | Lleida-Pirineus → Cervera | 4 |
| R11 | No | Barcelona-Sants → Girona | 15 |
| R13 | No | Sant Vicenç de Calders → Valls | 3 |
| R14 | No | Tarragona → Reus | 1 |
| R15 | No | Barcelona-Sants → Riba-roja d'Ebre | 2 |
| R16 | No | Barcelona-Sants → Tortosa | 7 |
| R17 | No | Barcelona-Sants → Salou-Port Aventura | 3 |

**Precaució:** els horaris alternatius vàlids en una mostra no acrediten la cobertura de tota la línia, i una ruta sense resultats en una mostra tampoc no n'acredita l'absència de servei. Per aquesta raó, es van repetir consultes en corredors alternatius per a R3, R7, RG1, RL4, R13 i R14.

## Proves

- Unitats i regressions del motor per a les 19 línies: línia, sentit, terminus, recorregut més enllà del destí, dades obsoletes, servei equivocat i candidats sense identificació. 
- Prioritat del GTFS, horaris alternatius addicionals sense supressió de trens separats per un minut, i mode «Totes les línies».
- Contractes reals dels proveïdors, reconstrucció GTFS i catalogació de les 19 línies.
- Chromium mòbil amb alternatives RL3/RL4 sobre un GTFS que no conté aquests serveis, i comprovacions de pantalla de 320, 390 i 768 px.

**Evidència pública de mostra:** [GitHub Actions — fonts alternatives de 19 línies](https://github.com/arl338/mi-rodalies-r4/actions/runs/43189692971).

## Limitacions pendents

La informació **no permet afirmar cobertura completa de tots els trens i parades**. Per a 13 línies el catàleg actual no té `stop_times` estructurats del GTFS. Les API complementàries només incorporen serveis directes quan retornen un horari complet i atribuïble a la línia. Les altres taules PDF oficials tenen formats diferents i encara no s'han verificat cel·la a cel·la com la R4: no s'importen automàticament.

Tampoc no es pot certificar l'error real de l'ETA fins que hi hagi observacions de pas en estacions. No es fan inferències de puntualitat a partir de l'acord entre fonts que poden reutilitzar la mateixa dada Renfe.
