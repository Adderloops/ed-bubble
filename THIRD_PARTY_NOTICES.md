# Third-party notices

## Bundled software

| Component | Where | License |
|---|---|---|
| [touchportal-api](https://www.npmjs.com/package/touchportal-api) and its dependencies (`app-root-dir`, `compare-versions`, `require-from-app-root`) | `node_modules/` | MIT (see each package's `LICENSE` / `package.json`) |

## Not bundled

- **SoundVolumeCommandLine (`svcl.exe`)** by NirSoft. It's used only by the experimental audio mixer, which isn't part of this release. If you enable that feature yourself, download it from <https://www.nirsoft.net/utils/sound_volume_command_line.html> and put it in the plugin's `tools/` folder.

## Fonts

- The HUD backgrounds contain text rendered with the **Starduster** typeface. The font file itself isn't distributed.
- Native button text uses **Electrolize**, which Touch Portal provides.

## Logos and trademarks (excluded from the MIT license)

If pages are added, launcher icons in `pages/icons/` (files named `17861…png`) show the logos of the applications and websites they open. Examples include Elite Dangerous (Frontier Developments), Discord, Inara, Spansh and ED CoPilot. These logos are trademarks of their respective owners. They're included only to identify the linked apps and **aren't covered by this project's MIT license**.

Elite Dangerous is © 1984–2026 Frontier Developments plc. All rights reserved. "Elite", the Elite logo, the Elite Dangerous logo and the Frontier logo are trademarks of Frontier Developments plc. This is an unofficial fan project, not affiliated with or endorsed by Frontier Developments or Touch Portal.

## ed-landing-pads (mapa de plataformas de los puertos estelares)

`core/pads.js` usa la tabla de plataformas (línea, profundidad y tamaño de las 45 plataformas de Coriolis, Orbis y Ocellus) de **ed-landing-pads**: https://github.com/rdnt/ed-landing-pads

MIT License — Copyright (c) 2018 Tasos Papalyras

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## EDCD FDevIDs (nombres de mercancías)

`core/commodities.js` contiene la tabla de símbolos internos y nombres en inglés de las mercancías del juego, tomada de `commodity.csv` de **EDCD/FDevIDs**: https://github.com/EDCD/FDevIDs. Es la referencia común de la comunidad de herramientas de Elite Dangerous; el repositorio no indica licencia. Los nombres son de Frontier Developments.

## Costes de mejora de trajes y armas (Odyssey)

`core/odyssey.js` recoge los materiales y créditos para subir de grado los trajes y las armas de Odyssey, consultados en Elite Dangerous Wiki (https://elite-dangerous.fandom.com: Dominator Suit, Artemis Suit, TK Aphelion, Karma AR-50; contenido bajo CC BY-SA) y en una tabla publicada por un jugador en el foro de Frontier (https://forums.frontier.co.uk). Los materiales y las cantidades totales de G1 a G5 de los tres trajes (Dominator, Maverick, Artemis) y de las once armas (Kinematic, Manticore y Takada) se han comprobado a mano en la pantalla de Odyssey Materials Helper del usuario (sin copiar su código). Son datos del juego, de Frontier Developments.

`core/odymods.js` recoge los materiales de las mejoras de ingeniero de trajes y armas de Odyssey y los ingenieros que las montan, con su sitio y sus requisitos de desbloqueo. Se transcribieron a mano de las pantallas de Odyssey Materials Helper del usuario y de la ficha de ingenieros del juego; no se ha copiado código ni archivos de ese programa. Son datos del juego, de Frontier Developments.

## Ingenieros de nave y retratos

`core/shipengineers.js` recoge los ingenieros de nave, su sitio, los módulos que mejoran con su grado máximo y, de los que estaban bloqueados, cómo se desbloquean. Se transcribió a mano de la ficha de ingenieros de Odyssey Materials Helper del usuario. Son datos del juego, de Frontier Developments.

Los retratos de `app/renderer/engineers/` son imágenes del juego Elite Dangerous (© Frontier Developments plc), recortadas de capturas de pantalla del usuario para identificar a cada ingeniero. ED BUBBLE es un proyecto de aficionado sin ánimo de lucro y no está afiliado a Frontier.

## Recetas de ingeniería de nave (coriolis-data)

`core/shipblueprints.js` recoge las recetas de ingeniería de nave (materiales de cada grado) y los efectos experimentales de cada módulo, tomados de coriolis-data (EDCD, https://github.com/EDCD/coriolis-data). Según su licencia, los datos y sus archivos JSON son propiedad intelectual de Frontier Developments plc y están sujetos a sus términos (https://www.frontierstore.net/terms-and-conditions/); el código de Coriolis está bajo licencia MIT y no se usa aquí. Los nombres internos de los materiales vienen de EDCD FDevIDs (material.csv).

Las recetas que coriolis-data no trae (anti-guardián de Ram Tah para los módulos guardianes y las recetas nuevas de nave, muchas solo para módulos «Merc») se transcribieron a mano de Inara (https://inara.cz/elite/blueprints/) el 24-11-2026, leyendo sus páginas desde el navegador del usuario. Inara es una base de datos no oficial de Elite Dangerous; los datos son del juego, de Frontier Developments.

## Costes de construcción de colonización (SrvSurvey / Raven Colonial)

`core/data/colonization-costs.json` es una copia sin cambios de `SrvSurvey/colonization-costs2.json` del proyecto SrvSurvey (https://github.com/njthomson/SrvSurvey), del autor de Raven Colonial (https://ravencolonial.com), publicado bajo la GNU General Public License v3.0. Se usa en `core/colcosts.js` para planificar construcciones. Las cantidades son datos del juego, de Frontier Developments.

## Naves y módulos

`core/data/shipdata.json` combina la lista de naves y módulos de EDCD FDevIDs (shipyard.csv y outfitting.csv, https://github.com/EDCD/FDevIDs) con las características de naves y módulos de coriolis-data (https://github.com/EDCD/coriolis-data). Según la licencia de coriolis-data, sus datos son propiedad de Frontier Developments plc y están sujetos a sus términos; no se usa código de Coriolis.

## Builds: SLEF, Coriolis y EDSY

ED BUBBLE lee y escribe builds en SLEF (Ship Loadout Exchange Format, formato público de Inara: https://inara.cz/elite/inara-impexp-slef/) y crea los enlaces de importación de Coriolis (`https://coriolis.io/import?data=`) y EDSY (`https://edsy.org/#/I=`), que llevan el evento `Loadout` del diario en JSON comprimido con gzip y en base64. Es el mismo formato que usa EDMarketConnector para esos enlaces; no se usa código de Coriolis, EDSY ni EDMC. Las tiendas que venden cada módulo y sus precios salen de la búsqueda de estaciones de Spansh (https://spansh.co.uk).

## Materiales de ingeniería (español y máximos)

`core/data/materials.json`: los 146 materiales de ingeniería de nave (en bruto, fabricados y codificados, también guardianes y thargoides) con su nombre en español del juego, categoría, grado y cuánto se puede llevar como máximo. Nombres en español y máximos transcritos a mano de capturas del juego de Specter A.G. (enviadas por Adder, 25-11-2026); símbolos y nombres en inglés de EDCD FDevIDs (material.csv). Nueve materiales thargoides recientes no están todavía en FDevIDs y van marcados para verificar su símbolo.

## Exobiología: predicción de especies

- **Reglas de predicción** (`core/data/bio-criteria/*.json`): copiadas sin cambios de SrvSurvey (njthomson, https://github.com/njthomson/SrvSurvey, carpeta `SrvSurvey/bio-criteria`, commit d7e87ef, 18-11-2026), con licencia GPLv3. El intérprete de las reglas (`core/biopredict.js`) es una implementación propia en JavaScript que sigue el formato y el comportamiento de SrvSurvey (`BioCriteria.cs`, `BioPredictor.cs`).
- **Nebulosas** (`core/data/nebulae.json`): lista de SrvSurvey (`game/Data.cs`, GPLv3), usada si no se puede descargar la lista completa de EDAstro (https://edastro.com/mapcharts/files/nebulae-coordinates.csv), que la app descarga una vez por semana, como hace SrvSurvey. Las posiciones de las burbujas guardianas también siguen a SrvSurvey.
- **Regiones de la galaxia** (`core/data/regionmap.json`): `RegionMapData.json` de EliteDangerousRegionMap (Ben Peddell / klightspeed, https://github.com/klightspeed/EliteDangerousRegionMap), con licencia MIT:

```
MIT License

Copyright (c) 2020 Ben Peddell

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Exploración

Los cuerpos de un sistema que aún no has escaneado salen del volcado de sistemas de Spansh (https://spansh.co.uk/api/dump/) y la ruta de neutrones, del Neutron Plotter de Spansh (https://spansh.co.uk/plotter); ED BUBBLE solo los consulta y muestra el resultado. El valor estimado de los datos de exploración usa la fórmula publicada por la comunidad de jugadores (constantes por tipo de cuerpo, masa y multiplicadores de descubrimiento y cartografía de Odyssey), reescrita en `core/exploration.js`; son datos del juego (Frontier Developments).

En Exobiología, el valor de cada especie y las ubicaciones de plantas que han subido otros comandantes salen de Spansh (búsqueda de cuerpos y ficha de cada cuerpo); la distancia mínima entre muestras de cada género es un dato del juego (Códice).

## Comercio

Los precios de otras estaciones (Dónde vender) salen de la búsqueda de estaciones de Spansh y la ruta de comercio, de su planificador de comercio (https://spansh.co.uk/trade); ED BUBBLE solo los consulta. Las reglas de méritos de Powerplay por comercio (40 % de margen en refuerzo, menos de 500 CR/t al socavar, minerales minados en el mismo sistema, ética Finanzas) están resumidas, con palabras propias, de la guía de Powerplay 2.0 publicada en Inara (https://inara.cz/elite/logbook/84502/); no se copia texto ni datos de Inara.
