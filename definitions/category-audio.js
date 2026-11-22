'use strict';

const path = require('path');

const CATEGORY_ID = 'edb.audio';

// Iconos del botón MUTE (estilo PCB, ver claude/pagina-audio-2026-09-22.md):
// se copian junto al resto de imágenes del plugin (images/icon-24.png etc.)
// para poder referenciarlos con una ruta absoluta resuelta en el propio PC
// del usuario -- la acción nativa de Touch Portal "Change the Icon with the
// value from plugin state" usa el VALOR LITERAL del state como icono (no es
// una condición 'si vale X entonces...', es un bind directo), así que el
// state tiene que contener la ruta al fichero, no un texto como 'muted'.
const IMAGES_DIR = path.join(__dirname, '..', 'images');
const MUTE_ICON_OFF = path.join(IMAGES_DIR, 'mute-off.png');
const MUTE_ICON_ON = path.join(IMAGES_DIR, 'mute-on.png');

// Microphone toggle (default Windows recording device). The tile carries its
// own text, so there is one icon per language: mic-on-<lang>.png (active)
// and mic-off-<lang>.png (muted).
const MIC_DEVICE = 'DefaultCaptureDevice'; // svcl.exe special name
function micIcon(muted, lang) {
  const l = lang === 'es' ? 'es' : 'en';
  return path.join(IMAGES_DIR, `mic-${muted ? 'off' : 'on'}-${l}.png`);
}

// Apps controlables desde el mezclador. La clave es la etiqueta visible en
// Touch Portal; el valor es el identificador de proceso que entiende
// svcl.exe (SoundVolumeCommandLine de NirSoft, ver tools/svcl.exe).
const APP_PROCESS_MAP = {
  'Elite Dangerous': 'EliteDangerous64.exe',
  Chrome: 'chrome.exe',
  Discord: 'Discord.exe',
};

// Apps that only get a volume slider on the page (no MUTE tile / action).
// The slider's app list is APP_PROCESS_MAP + these; the per-app mute
// actions below keep using APP_PROCESS_MAP only.
const VOLUME_ONLY_PROCESS_MAP = {
  AIMP: 'AIMP.exe',
};
const APP_VOLUME_MAP = { ...APP_PROCESS_MAP, ...VOLUME_ONLY_PROCESS_MAP };

const APP_CHOICES = Object.keys(APP_VOLUME_MAP);

// Un state por app cuyo VALOR es la ruta al icono que le toca ahora mismo
// (MUTE_ICON_OFF o MUTE_ICON_ON), no un simple 'muted'/'unmuted'. Se
// actualiza de forma optimista en actions.js cada vez que se pulsa el botón
// (mismo patrón ya usado en shipDefs.states.shipRecallLabel: no hay forma
// barata de leer el mute real de Windows en cada pulsación, así que se
// asume que el toggle ha funcionado). Arranca siempre apuntando al icono
// "OFF" (sin mutear).
// En entry.tp el default de los states de icono va vacío: una ruta absoluta
// calculada al generar el manifiesto solo vale en la máquina donde se generó.
// plugin.js empuja la ruta real (con __dirname) al conectar.
const states = {
  status: { id: 'edb.audio.status', desc: 'Audio mixer status', default: 'OK' },
  mutedEliteDangerous: {
    id: 'edb.audio.state.muted.eliteDangerous',
    desc: 'Elite Dangerous muted?',
    default: '',
  },
  mutedChrome: { id: 'edb.audio.state.muted.chrome', desc: 'Chrome muted?', default: '' },
  mutedDiscord: { id: 'edb.audio.state.muted.discord', desc: 'Discord muted?', default: '' },
  micMuted: { id: 'edb.audio.state.micMuted', desc: 'Microphone muted? (icon)', default: '' },
  // Plain true/false version, used by the page through an event (the
  // "icon from state" binding doesn't reach the tablet).
  micIsMuted: { id: 'edb.audio.micIsMuted', desc: 'Microphone muted?', default: 'false' },
  eliteDangerousIsMuted: { id: 'edb.audio.eliteDangerousIsMuted', desc: 'Elite Dangerous muted? (true/false)', default: 'false' },
  chromeIsMuted: { id: 'edb.audio.chromeIsMuted', desc: 'Chrome muted? (true/false)', default: 'false' },
  discordIsMuted: { id: 'edb.audio.discordIsMuted', desc: 'Discord muted? (true/false)', default: 'false' },
};

// icon-state id -> true/false state id (for the page events)
const BOOL_STATE_OF = {
  'edb.audio.state.muted.eliteDangerous': 'edb.audio.eliteDangerousIsMuted',
  'edb.audio.state.muted.chrome': 'edb.audio.chromeIsMuted',
  'edb.audio.state.muted.discord': 'edb.audio.discordIsMuted',
};

const events = [
  ...[['eliteDangerous', 'Elite Dangerous'], ['chrome', 'Chrome'], ['discord', 'Discord']].map(([k, label]) => ({
    id: `edb.audio.event.${k}Muted`, name: `When ${label} mute changes`, format: `When "${label} muted" becomes $val`,
    valueStateId: `edb.audio.${k}IsMuted`, valueType: 'choice', valueChoices: ['true', 'false'],
  })),
  { id: 'edb.audio.event.micMuted', name: 'When the microphone mute changes', format: 'When "Microphone muted" becomes $val', valueStateId: 'edb.audio.micIsMuted', valueType: 'choice', valueChoices: ['true', 'false'] },
];

// Una acción fija por app (sin data field) en vez de una única acción
// parametrizada: evita depender de la forma, no verificada en vivo, que
// tendría un botón PLUGIN_ACTION con "data" -- los botones sin data ya
// están confirmados byte a byte (ver RESET SESSION/RELOAD JOURNAL, etc.
// en ED - Utilidades). La key va sin espacios/tildes para que el id quede
// limpio; el nombre visible sí lleva el nombre real de la app.
const AUDIO_APP_KEYS = {
  'Elite Dangerous': 'eliteDangerous',
  Chrome: 'chrome',
  Discord: 'discord',
};

// Mapa appKey -> id del state de mute correspondiente (ver `states` arriba),
// para que actions.js no tenga que reconstruir el id a mano.
const MUTED_STATE_IDS = {
  eliteDangerous: states.mutedEliteDangerous.id,
  chrome: states.mutedChrome.id,
  discord: states.mutedDiscord.id,
};

const actions = Object.keys(APP_PROCESS_MAP).map((appLabel) => ({
  id: `edb.audio.action.toggleMute.${AUDIO_APP_KEYS[appLabel]}`,
  name: `Toggle mute: ${appLabel}`,
  format: `Toggle mute for ${appLabel}`,
  app: appLabel, // metadato interno (no viaja a entry.tp), usado por actions.js
  stateId: MUTED_STATE_IDS[AUDIO_APP_KEYS[appLabel]],
}));

// Appended after the per-app actions: actions.js relies on actions[0..2]
// being Elite Dangerous / Chrome / Discord.
const MIC_ACTION_ID = 'edb.audio.action.toggleMic';
actions.push({
  id: MIC_ACTION_ID,
  name: 'Toggle microphone mute',
  format: 'Mute / unmute the default microphone (Windows recording device)',
});

// Los "connectors" son los sliders nativos de Touch Portal. Usamos un único
// connector con un data field de tipo choice para elegir la app: cada botón
// slider de la página fija un valor distinto de ese data field (ver
// hallazgos-editor-test-claude-2026-09-11.md sobre el formato real de "C").
const connectors = [
  {
    id: 'edb.audio.connector.appVolume',
    name: 'App volume slider',
    format: 'Set volume for {$edb.audio.connector.appVolume.data.app$}',
    data: [
      {
        id: 'edb.audio.connector.appVolume.data.app',
        type: 'choice',
        label: 'App',
        default: APP_CHOICES[0],
        valueChoices: APP_CHOICES,
      },
    ],
  },
];

module.exports = {
  categoryId: CATEGORY_ID,
  categoryName: 'Audio Mixer',
  states,
  events,
  actions,
  connectors,
  APP_PROCESS_MAP,
  APP_VOLUME_MAP,
  APP_CHOICES,
  MUTED_STATE_IDS,
  MUTE_ICON_OFF,
  MUTE_ICON_ON,
  MIC_DEVICE,
  BOOL_STATE_OF,
  MIC_ACTION_ID,
  micIcon,
};
