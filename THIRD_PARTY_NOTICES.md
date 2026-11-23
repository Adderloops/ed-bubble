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
