'use strict';

/**
 * ED BUBBLE · lector de controles de Elite Dangerous (.binds).
 *
 * Lee el preset activo (StartPreset.4.start) de la carpeta de controles y
 * extrae, para cada acción del juego, su tecla de TECLADO (Primary o
 * Secondary) con sus modificadores. Los mandos (HOTAS) se ignoran: ED BUBBLE
 * solo puede enviar teclas de teclado.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function defaultBindingsFolder() {
  const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(base, 'Frontier Developments', 'Elite Dangerous', 'Options', 'Bindings');
}

/** Nombre del preset activo. El archivo trae una línea por contexto; vale la primera. */
function activePresetName(folder) {
  try {
    const lines = fs.readFileSync(path.join(folder, 'StartPreset.4.start'), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length) return lines[0];
  } catch (e) { /* sin preset guardado */ }
  try {
    const lines = fs.readFileSync(path.join(folder, 'StartPreset.start'), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length) return lines[0];
  } catch (e) { /* idem */ }
  return null;
}

/** Archivo del preset: el de versión más alta (TitoV5.4.2.binds antes que TitoV5.binds). */
function presetFile(folder, preset) {
  let files = [];
  try { files = fs.readdirSync(folder); } catch (e) { return null; }
  const esc = preset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${esc}(?:\\.(\\d+)\\.(\\d+))?\\.binds$`, 'i');
  const found = files.map((f) => ({ f, m: f.match(re) })).filter((x) => x.m)
    .sort((a, b) => (Number(b.m[1] || 0) - Number(a.m[1] || 0)) || (Number(b.m[2] || 0) - Number(a.m[2] || 0)));
  return found.length ? path.join(folder, found[0].f) : null;
}

// Quita la etiqueta <Root ...> para que el bloque raíz no se trague las acciones.
const stripRoot = (xml) => String(xml).replace(/<\/?Root\b[^>]*>/g, '');

const attr = (s, name) => { const m = s.match(new RegExp(`${name}="([^"]*)"`)); return m ? m[1] : ''; };

/** Convierte el XML del .binds en { Accion: { key, modifiers[], slot } } (solo teclado). */
function parseBinds(rawXml) {
  const xml = stripRoot(rawXml);
  const out = {};
  const blockRe = /<([A-Za-z0-9_]+)>\s*([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = blockRe.exec(xml))) {
    const [, action, body] = m;
    for (const slot of ['Primary', 'Secondary']) {
      const sm = body.match(new RegExp(`<${slot}\\s([^>]*?)(/>|>([\\s\\S]*?)</${slot}>)`));
      if (!sm) continue;
      if (attr(sm[1], 'Device') !== 'Keyboard') continue;
      const key = attr(sm[1], 'Key');
      if (!key) continue;
      const modifiers = [];
      const inner = sm[3] || '';
      const modRe = /<Modifier\s([^>]*?)\/>/g;
      let mm; let onlyKeyboard = true;
      while ((mm = modRe.exec(inner))) {
        if (attr(mm[1], 'Device') !== 'Keyboard') onlyKeyboard = false;
        modifiers.push(attr(mm[1], 'Key'));
      }
      if (!onlyKeyboard) continue; // modificador de mando: no se puede reproducir
      out[action] = { key, modifiers, slot };
      break;
    }
  }
  return out;
}

/** Acciones asignadas a un mando o ratón (no teclado): sirven para avisar "solo HOTAS". */
function parseOtherDevices(rawXml) {
  const xml = stripRoot(rawXml);
  const out = new Set();
  const blockRe = /<([A-Za-z0-9_]+)>\s*([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = blockRe.exec(xml))) {
    const [, action, body] = m;
    const re = /<(?:Primary|Secondary)\s([^>]*?)\/?>/g;
    let sm;
    while ((sm = re.exec(body))) {
      const dev = attr(sm[1], 'Device');
      if (dev && dev !== 'Keyboard' && dev !== '{NoDevice}' && attr(sm[1], 'Key')) { out.add(action); break; }
    }
  }
  return out;
}

const KEY_LABELS = {
  Key_LeftControl: 'Ctrl', Key_RightControl: 'Ctrl D', Key_LeftShift: 'Mayús', Key_RightShift: 'Mayús D',
  Key_LeftAlt: 'Alt', Key_RightAlt: 'AltGr', Key_Space: 'Espacio', Key_Enter: 'Intro', Key_Backspace: 'Retroceso',
  Key_Escape: 'Esc', Key_Tab: 'Tab', Key_PageUp: 'RePág', Key_PageDown: 'AvPág', Key_Insert: 'Insert',
  Key_Delete: 'Supr', Key_Home: 'Inicio', Key_End: 'Fin', Key_UpArrow: '↑', Key_DownArrow: '↓',
  Key_LeftArrow: '←', Key_RightArrow: '→',
  Key_SemiColon: ';', Key_Comma: ',', Key_Period: '.', Key_Slash: '/', Key_BackSlash: '\\', Key_Minus: '-', Key_Equals: '=', Key_Apostrophe: "'", Key_Grave: 'º',
  Key_LeftBracket: '[', Key_RightBracket: ']', Key_CapsLock: 'Bloq Mayús',
};

function keyLabel(k) {
  if (KEY_LABELS[k]) return KEY_LABELS[k];
  if (/^Key_Numpad_/.test(k)) return `Num ${k.slice(11)}`;
  return k.replace(/^Key_/, '');
}

function bindLabel(b) {
  if (!b) return null;
  return [...b.modifiers.map(keyLabel), keyLabel(b.key)].join('+');
}

/** Nombre del preset a partir del archivo: TitoV5.4.2.binds -> TitoV5. */
function presetFromFile(file) {
  return path.basename(String(file)).replace(/\.binds$/i, '').replace(/\.\d+\.\d+$/, '');
}

/** ¿Parece un archivo de controles de Elite Dangerous? */
function looksLikeBinds(xml) {
  return /<Root\b[^>]*PresetName=/i.test(xml) || /<(?:Primary|Secondary)\s[^>]*Device=/i.test(xml);
}

/** Lee un archivo .binds concreto. Devuelve { preset, file, folder, binds } o { error, code }. */
function loadFile(file) {
  const folder = path.dirname(file);
  let xml;
  try { xml = fs.readFileSync(file, 'utf8'); } catch (e) {
    return { error: `No puedo leer ${path.basename(file)}: ${e.code === 'ENOENT' ? 'el archivo ya no está' : e.message}`, code: 'read', folder, file };
  }
  if (!looksLikeBinds(xml)) return { error: `${path.basename(file)} no parece un archivo de controles de Elite Dangerous.`, code: 'format', folder, file };
  const m = xml.match(/PresetName="([^"]*)"/);
  return { preset: (m && m[1]) || presetFromFile(file), file, folder, binds: parseBinds(xml), otherDevices: parseOtherDevices(xml) };
}

/**
 * Carga el preset activo de la carpeta de controles. Devuelve { preset, file, binds } o
 * { error, code }: 'nofolder' (no hay carpeta: el juego no ha guardado controles en este
 * PC), 'nopreset' (sin StartPreset) o 'builtin' (preset del juego, sin archivo propio).
 */
function loadActive(folder = defaultBindingsFolder()) {
  if (!fs.existsSync(folder)) return { error: 'No encuentro la carpeta de controles del juego.', code: 'nofolder', folder };
  const preset = activePresetName(folder);
  if (!preset) return { error: 'No encuentro el preset de controles activo (StartPreset.4.start).', code: 'nopreset', folder };
  const file = presetFile(folder, preset);
  if (!file) return { error: `Usas el esquema "${preset}", que viene con el juego y no tiene archivo propio.`, code: 'builtin', folder, preset };
  const r = loadFile(file);
  return r.error ? { ...r, preset } : r;
}

module.exports = { defaultBindingsFolder, activePresetName, presetFile, presetFromFile, looksLikeBinds, loadFile, parseBinds, parseOtherDevices, loadActive, bindLabel, keyLabel };
