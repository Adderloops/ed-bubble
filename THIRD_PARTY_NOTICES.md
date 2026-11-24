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
