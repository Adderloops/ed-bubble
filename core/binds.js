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

const attr = (s, name) => { const m = s.match(new RegExp(`${name}="([^"]*)"`)); return m ? m[1] : ''; };

/** Convierte el XML del .binds en { Accion: { key, modifiers[], slot } } (solo teclado). */
function parseBinds(xml) {
  const out = {};
  const blockRe = /<([A-Za-z0-9_]+)>\s*([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = blockRe.exec(xml))) {
    const [, action, body] = m;
    if (action === 'Root') continue;
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

const KEY_LABELS = {
  Key_LeftControl: 'Ctrl', Key_RightControl: 'Ctrl D', Key_LeftShift: 'Mayús', Key_RightShift: 'Mayús D',
  Key_LeftAlt: 'Alt', Key_RightAlt: 'AltGr', Key_Space: 'Espacio', Key_Enter: 'Intro', Key_Backspace: 'Retroceso',
  Key_Escape: 'Esc', Key_Tab: 'Tab', Key_PageUp: 'RePág', Key_PageDown: 'AvPág', Key_Insert: 'Insert',
  Key_Delete: 'Supr', Key_Home: 'Inicio', Key_End: 'Fin', Key_UpArrow: '↑', Key_DownArrow: '↓',
  Key_LeftArrow: '←', Key_RightArrow: '→',
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

/** Carga el preset activo. Devuelve { preset, file, binds } o { error }. */
function loadActive(folder = defaultBindingsFolder()) {
  const preset = activePresetName(folder);
  if (!preset) return { error: 'No encuentro el preset de controles activo (StartPreset.4.start).', folder };
  const file = presetFile(folder, preset);
  if (!file) return { error: `No encuentro el archivo del preset "${preset}".`, folder, preset };
  try {
    return { preset, file, folder, binds: parseBinds(fs.readFileSync(file, 'utf8')) };
  } catch (e) {
    return { error: `No puedo leer ${path.basename(file)}: ${e.message}`, folder, preset };
  }
}

module.exports = { defaultBindingsFolder, activePresetName, presetFile, parseBinds, loadActive, bindLabel, keyLabel };
