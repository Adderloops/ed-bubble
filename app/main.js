'use strict';

/**
 * ED BUBBLE · proceso principal de Electron.
 * Arranca el motor de datos (../core/engine.js) y envía cada actualización a
 * la ventana. La ventana es una ventana normal (no "siempre encima"), pensada
 * para la segunda pantalla; recuerda su posición y tamaño.
 */

const { app, BrowserWindow, ipcMain, screen, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { Engine } = require('../core/engine');
const binds = require('../core/binds');
const actions = require('../core/actions');
const { KeySender } = require('../core/keysender');

const BOUNDS_FILE = () => path.join(app.getPath('userData'), 'window-bounds.json');

function loadBounds() {
  try { return JSON.parse(fs.readFileSync(BOUNDS_FILE(), 'utf8')); } catch (e) { return null; }
}

function saveBounds(win) {
  try { fs.writeFileSync(BOUNDS_FILE(), JSON.stringify({ ...win.getBounds(), maximized: win.isMaximized() })); } catch (e) { /* sin importancia */ }
}

function defaultBounds() {
  // Primera vez: segunda pantalla si existe, si no la principal.
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const target = displays.find((d) => d.id !== primary.id) || primary;
  const { x, y, width, height } = target.workArea;
  const w = Math.min(1920, width); const h = Math.min(1080, height);
  return { x: x + Math.round((width - w) / 2), y: y + Math.round((height - h) / 2), width: w, height: h, maximized: target.id !== primary.id };
}

let win = null;
let engine = null;
let last = null;
let controls = { error: 'Cargando controles…' };
const keys = new KeySender({ simulate: process.env.ED_BUBBLE_SIMULATE === '1' || undefined });

/** Lee el preset de controles activo y avisa a la ventana. */
function loadControls() {
  controls = binds.loadActive(process.env.ED_BINDINGS_FOLDER || undefined);
  if (controls.error) console.warn('[controles]', controls.error);
  else console.log(`[controles] preset ${controls.preset} (${Object.keys(controls.binds).length} acciones de teclado)`);
  if (win && !win.isDestroyed()) win.webContents.send('ed:controls', controlsInfo());
}

function controlsInfo() {
  return { preset: controls.preset || null, error: controls.error || null, simulate: keys.simulate, actions: actions.describe(controls.binds), check: controls.error ? null : actions.checkControls(controls) };
}

/** Recarga los controles cuando el comandante los cambia en el juego. */
function watchControls() {
  const folder = controls.folder || process.env.ED_BINDINGS_FOLDER || binds.defaultBindingsFolder();
  let t = null;
  try {
    fs.watch(folder, () => { clearTimeout(t); t = setTimeout(loadControls, 800); });
  } catch (e) { console.warn('[controles] no puedo vigilar', folder, e.message); }
}

function createWindow() {
  const b = loadBounds() || defaultBounds();
  win = new BrowserWindow({
    x: b.x, y: b.y, width: b.width, height: b.height,
    minWidth: 960, minHeight: 540,
    backgroundColor: '#04080f',
    title: 'ED BUBBLE',
    show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.removeMenu(); // sin barra de menú: Alt no debe hacer nada en esta ventana
  if (b.maximized) win.maximize();
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // No robar el foco al juego al abrir: se muestra sin activarse.
  win.once('ready-to-show', () => win.showInactive());
  for (const ev of ['resize', 'move']) win.on(ev, () => saveBounds(win));
  win.on('close', () => saveBounds(win));
  win.webContents.on('did-finish-load', () => { if (last) win.webContents.send('ed:update', last); });

  // Solo para desarrollo: ED_BUBBLE_SHOT=carpeta guarda capturas de cada
  // pantalla y cierra la app (sirve para revisar el diseño sin el juego).
  if (process.env.ED_BUBBLE_SHOT) {
    win.webContents.once('did-finish-load', async () => {
      const out = process.env.ED_BUBBLE_SHOT;
      await new Promise((r) => setTimeout(r, 2500));
      for (const sec of ['puente', 'vuelo', 'navegacion']) {
        await win.webContents.executeJavaScript(`ui.section='${sec}'; ui.autoJump=false; render();`);
        await new Promise((r) => setTimeout(r, 400));
        const img = await win.webContents.capturePage();
        fs.writeFileSync(path.join(out, `${sec}.png`), img.toPNG());
      }
      app.quit();
    });
  }
}

app.whenReady().then(() => {
  engine = new Engine({ folder: process.env.ED_JOURNAL_FOLDER || undefined });
  engine.on('update', (snap) => {
    last = snap;
    if (win && !win.isDestroyed()) win.webContents.send('ed:update', snap);
  });
  engine.on('warning', (msg) => console.warn('[engine]', msg));
  engine.start();
  ipcMain.handle('ed:snapshot', () => last || engine.snapshot());
  loadControls();
  watchControls();
  keys.on('warning', (m) => console.warn('[teclas]', m));
  keys.start();
  ipcMain.handle('ed:controls', () => controlsInfo());
  ipcMain.handle('ed:run', async (_e, id) => {
    const built = actions.build(String(id), controls.binds);
    if (built.error) return { ok: false, error: built.error, action: built.action };
    const res = await keys.run(built.ops);
    if (!res.ok) console.warn(`[teclas] ${id}: ${res.error}`);
    return res;
  });
  ipcMain.handle('ed:copy', (_e, text) => { clipboard.writeText(String(text || '').slice(0, 200)); return true; });
  // Solo se abren estas webs, construidas aquí: la ventana no puede pedir una URL cualquiera.
  ipcMain.handle('ed:open', (_e, req) => {
    const name = encodeURIComponent(String((req && req.name) || '').slice(0, 120));
    const addr = /^\d{1,20}$/.test(String((req && req.address) || '')) ? String(req.address) : null;
    const urls = {
      inara: `https://inara.cz/elite/starsystem/?search=${name}`,
      spansh: addr ? `https://spansh.co.uk/system/${addr}` : `https://spansh.co.uk/search/${name}`,
      edsm: `https://www.edsm.net/en/system?systemName=${name}`,
    };
    const url = urls[req && req.site];
    if (!url || !name) return false;
    shell.openExternal(url);
    return true;
  });
  ipcMain.handle('ed:info', () => ({ version: require('./package.json').version, journalFolder: engine.folder }));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  if (engine) engine.stop();
  keys.stop();
  app.quit();
});
