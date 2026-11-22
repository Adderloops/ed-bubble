# ED BUBBLE

Companion app for **Elite Dangerous** on Windows. It reads the game's live data (Journal, `Status.json`, `NavRoute.json`, `Cargo.json`, `Market.json`…), generates information and images that Touch Portal can't produce on its own, and shows them on a second PC screen and on Touch Portal pages on a tablet.

> Status: **0.1.0-alpha — phase F0.** The code currently is the Touch Portal plugin from [ed-touchportal](https://github.com/Adderloops/ed-touchportal), copied as a starting point and renamed so both can be installed side by side. The Electron app, second-screen window and generated images come in later phases.

ED BUBBLE is a separate project. `ed-touchportal` stays as it is and is not changed from here.

## Identity

| | ed-touchportal | ED BUBBLE |
|---|---|---|
| Plugin ID | `com.adder.edtouchportal` | `com.adder.edbubble` |
| State / event / action prefix | `ed.*` | `edb.*` |
| Touch Portal pages | `ED - …` / `ED ES - …` | `EDB - …` / `EDB ES - …` (to be generated) |

## Layout

```
plugin.js                  Entry point: connects to Touch Portal and starts everything
definitions/               Single source of truth for categories, states, events, actions
  entry-source.js          Combines all categories into the entry.tp structure
  features.js              Feature flags (audio mixer needs tools/svcl.exe)
src/
  services/                Journal tailer, Status/Cargo readers, state store, Powerplay control…
  handlers/<category>.js   One file per category, reacting to Journal events
  event-router.js          Sends each Journal event to its handlers
  actions.js               Utility actions (open Inara/EDSM, copy system, export stats, audio)
scripts/build-entry.js     Generates entry.tp from definitions/ (never edit entry.tp by hand)
test/run-tests.js          Tests that run without the game or Touch Portal
node_modules/              Vendored touchportal-api (the npm 4.0.0 build is broken) — do not npm install
```

## Commands

```bash
npm test                              # 28 tests
ED_TP_AUDIO=1 npm run build-entry     # regenerate entry.tp including the audio category
```

After changing `entry.tp` or the code, exit Touch Portal completely (tray → Exit) and reopen it.

## Environment variables

| Variable | Purpose |
|---|---|
| `ED_JOURNAL_FOLDER` | Overrides the Journal folder (default `%USERPROFILE%\Saved Games\Frontier Developments\Elite Dangerous`) |
| `ED_TP_AUDIO` | `1` forces the audio category on, `0` off. By default it's on only when `tools/svcl.exe` exists. |

## Roadmap

F0 setup → F1 data core as its own module → F2 Electron app with tray → F3 first generated image (Powerplay progress bar) → F4 control from Touch Portal → F5 second-screen views → F6 installer and v1.0.0-beta → F7 web client (PWA), external data.

## License

MIT. See `LICENSE` and `THIRD_PARTY_NOTICES.md`. Unofficial fan project, not affiliated with Frontier Developments or Touch Portal.
