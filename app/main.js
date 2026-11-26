'use strict';

/**
 * ED BUBBLE · proceso principal de Electron.
 * Arranca el motor de datos (../core/engine.js) y envía cada actualización a
 * la ventana. La ventana es una ventana normal (no "siempre encima"), pensada
 * para la segunda pantalla; recuerda su posición y tamaño.
 */

const { app, BrowserWindow, ipcMain, screen, clipboard, shell, net, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { Engine } = require('../core/engine');
const binds = require('../core/binds');
const actions = require('../core/actions');
const { KeySender } = require('../core/keysender');
const spansh = require('../core/spansh');
const biopredict = require('../core/biopredict');
const { plotRoute } = require('../core/plot');
const geo = require('../core/geo');
const commodities = require('../core/commodities');
const mining = require('../core/mining');

// Registro de incidencias: %APPDATA%\\ed-bubble-app\\ed-bubble.log (máx. ~1 MB)
const LOG_FILE = () => path.join(app.getPath('userData'), 'ed-bubble.log');
function logLine(msg) {
  try {
    const f = LOG_FILE();
    try { if (fs.statSync(f).size > 1024 * 1024) fs.renameSync(f, `${f}.old`); } catch (e) { /* no existe aún */ }
    fs.appendFileSync(f, `${new Date().toISOString()} ${msg}\n`);
  } catch (e) { /* sin registro */ }
}

const BOUNDS_FILE = () => path.join(app.getPath('userData'), 'window-bounds.json');

function loadBounds() {
  try { return JSON.parse(fs.readFileSync(BOUNDS_FILE(), 'utf8')); } catch (e) { return null; }
}

function saveBounds(win) {
  if (win.isFullScreen()) return; // en pantalla completa se guarda el tamaño normal
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

// Ajustes del comandante (settings.json en la carpeta de datos de la app)
const DEFAULT_PREFS = {
  autoJump: true,
  jump: { vuelo: true, approach: true, docked: true, depot: true, orbita: true, mineria: true, combate: true, exploracion: true }, // a qué secciones salta solo
  startSection: 'puente', lastSection: 'puente', // al abrir: Puente o la última sección vista
  alerts: { dock: true, fuelRoute: true }, // avisos opcionales en la cabecera
  fullscreen: false,
  rigMin: 75, // guía de taladros: distancia mínima entre taladros (m)
};
let settings = {};
function prefs() {
  const p = { ...DEFAULT_PREFS, ...settings };
  p.jump = { ...DEFAULT_PREFS.jump, ...(settings.jump || {}) };
  p.alerts = { ...DEFAULT_PREFS.alerts, ...(settings.alerts || {}) };
  delete p.ppTracked; delete p.skull; delete p.bindsFile; // datos internos, no son ajustes de la ventana
  return p;
}
const SECTION_IDS = ['puente', 'vuelo', 'orbita', 'combate', 'exploracion', 'equipo', 'mineria', 'apie', 'ingenieros', 'navegacion', 'colonizacion', 'estacion', 'powerplay', 'ajustes', 'controles'];
/** Valida un ajuste que llega de la ventana; devuelve el valor limpio o undefined. */
function cleanPref(key, value) {
  const bool = (x) => (typeof x === 'boolean' ? x : undefined);
  if (key === 'autoJump' || key === 'fullscreen') return bool(value);
  if (key === 'startSection') return ['puente', 'ultima'].includes(value) ? value : undefined;
  if (key === 'lastSection') return SECTION_IDS.includes(value) ? value : undefined;
  if (key === 'rigMin') return Number.isFinite(value) && value >= 30 && value <= 200 ? Math.round(value) : undefined;
  const [group, sub] = String(key).split('.');
  if (group === 'jump' && sub in DEFAULT_PREFS.jump) return bool(value);
  if (group === 'alerts' && sub in DEFAULT_PREFS.alerts) return bool(value);
  return undefined;
}

let win = null;
let engine = null;
let last = null;
let plotting = null; // { cancelled } mientras se traza una ruta
// Repostaje en ruta: estaciones con "Refuel" en los sistemas a los que llegas (Spansh)
const fuelStops = { key: null, busy: false, systems: {} };

/* ---------- Minería: plugin Skull Mining de EDMC ---------- */
// Carpeta del plugin: la que tenga skull_tracker.py dentro de los plugins de EDMC
function findSkullDir() {
  if (process.env.ED_BUBBLE_SKULL_DIR) return process.env.ED_BUBBLE_SKULL_DIR;
  const base = path.join(process.env.LOCALAPPDATA || path.join(require('os').homedir(), 'AppData', 'Local'), 'EDMarketConnector', 'plugins');
  try {
    for (const d of fs.readdirSync(base)) {
      if (fs.existsSync(path.join(base, d, 'skull_tracker.py'))) return path.join(base, d);
    }
  } catch (e) { /* EDMC no instalado */ }
  return null;
}
let skull = { dir: null, live: null, zones: null, sites: null, sitesKey: null, sitesAt: 0, sitesBusy: false, sitesStatus: '' };
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; } }
function skullRead() {
  skull.dir = findSkullDir();
  if (!skull.dir) { skull.live = null; skull.zones = null; return; }
  skull.live = readJson(path.join(skull.dir, 'live_session.json'));
  skull.zones = readJson(path.join(skull.dir, 'zone_state.json'));
}
function skullInfo() {
  return {
    found: !!skull.dir, dir: skull.dir,
    live: mining.liveView(skull.live),
    zoneTarget: skull.zones && skull.zones.zone_target ? skull.zones.zone_target : null,
    anchors: skull.zones && skull.zones.zone_anchors ? skull.zones.zone_anchors : {},
    web: { configured: !!(settings.skull && settings.skull.url && settings.skull.token), status: skull.sitesStatus },
    sites: skull.sites, sitesKey: skull.sitesKey, sitesAt: skull.sitesAt,
  };
}
function sendSkull() { if (win && !win.isDestroyed()) win.webContents.send('ed:skull', skullInfo()); }

/** Sitios de la flota del cuerpo actual, de la web Skullmining (la misma consulta que hace el plugin). */
async function skullSites(snap, force) {
  const st = snap.state; const body = clean(st.status.bodyName) || (st.location.approach && st.location.approach.body);
  const sys = st.location.system; const cmdr = st.cmdr.name;
  const conf = settings.skull || {};
  if (!body || !sys || !conf.url || !conf.token || !cmdr) return;
  const key = `${sys}|${body}`;
  const due = force || key !== skull.sitesKey || Date.now() - skull.sitesAt > 2 * 60 * 1000;
  if (!due || skull.sitesBusy) return;
  if (key !== skull.sitesKey) { skull.sites = null; skull.sitesKey = key; }
  skull.sitesBusy = true;
  try {
    const u = new URL(conf.url);
    for (const [k, v] of Object.entries({ view: 'body', system: sys, body, cmdr, key: conf.token })) u.searchParams.set(k, v);
    const r = await net.fetch(u.toString());
    const txt = await r.text();
    let d = null; try { d = JSON.parse(txt); } catch (e) { /* HTML */ }
    if (!d) skull.sitesStatus = `La URL de la flota no devuelve datos (respuesta ${r.status})`;
    else if (!d.ok) skull.sitesStatus = { auth: 'Clave incorrecta', member: 'Tu CMDR no está en la lista de la flota', token: 'La URL de la flota es antigua' }[d.error] || `La web respondió ${d.error}`;
    else { skull.sites = d.sites || []; skull.sitesStatus = ''; }
  } catch (e) { skull.sitesStatus = `Sin conexión con la web (${e.message})`; logLine(`[skull] sitios: ${e.message}`); }
  skull.sitesAt = Date.now(); skull.sitesBusy = false;
  sendSkull();
}
const clean = (x) => (x ? String(x).trim() : null);

// Guía de taladros: taladros marcados en la app (se borran al cambiar de cuerpo)
let rigs = { body: null, list: [] };
function minePos(st) {
  const s = st.status;
  if (!s.flags || !s.flags.hasLatLong || s.latitude == null || !s.planetRadius) return null;
  return { lat: s.latitude, lon: s.longitude, heading: s.heading, body: clean(s.bodyName), radius: s.planetRadius };
}
/** Lo que la pantalla de Minería necesita en cada actualización (posición, guía, zona, sitios). */
function mineView(snap) {
  const pos = minePos(snap.state);
  if (pos && rigs.body !== pos.body) rigs = { body: pos.body, list: [] };
  const live = mining.liveView(skull.live);
  const known = live && pos && live.body === pos.body ? live.rigList : [];
  const sameBody = pos && skull.sitesKey && skull.sitesKey.endsWith(`|${pos.body}`);
  return {
    pos: pos ? { lat: pos.lat, lon: pos.lon, body: pos.body } : null,
    marked: rigs.list.length, known: known.length,
    guide: pos ? mining.rigGuide([...rigs.list, ...known], pos, pos.radius, settings.rigMin || 75) : null,
    zone: pos && live ? mining.zoneAt(skull.zones && skull.zones.zone_anchors, pos.body, pos.lat, pos.lon, pos.radius) : null,
    sites: sameBody && skull.sites ? mining.sitesView(skull.sites, pos, pos.radius) : null,
  };
}

/**
 * Lee un ajuste de texto de [settings] en el config.toml de EDMC (EDMC 6 guarda ahí la
 * configuración; antes iba en el registro de Windows).
 */
function tomlSetting(text, name) {
  const sec = String(text).split(/^\s*\[/m).find((b) => /^settings\]/.test(b));
  if (!sec) return '';
  const m = sec.match(new RegExp(`^\\s*${name}\\s*=\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|'([^']*)')`, 'm'));
  if (!m) return '';
  if (m[2] != null) return m[2];
  try { return JSON.parse(`"${m[1]}"`); } catch (e) { return m[1]; }
}

/** Copia la URL y la clave de la flota desde la configuración de EDMC (config.toml o, en versiones antiguas, el registro). */
function readEdmcSkull() {
  if (process.platform !== 'win32' && !process.env.ED_BUBBLE_EDMC_CONFIG) return { ok: false, error: 'Solo en Windows' };
  // EDMC 6 y posteriores: %LOCALAPPDATA%\EDMarketConnector\config.toml
  const tomlFile = process.env.ED_BUBBLE_EDMC_CONFIG || path.join(process.env.LOCALAPPDATA || path.join(require('os').homedir(), 'AppData', 'Local'), 'EDMarketConnector', 'config.toml');
  try {
    const text = fs.readFileSync(tomlFile, 'utf8');
    const url = tomlSetting(text, 'skullmining_url').trim(); const token = tomlSetting(text, 'skullmining_token').trim();
    if (url && token) return { ok: true, url, token };
  } catch (e) { /* sin config.toml: EDMC antiguo */ }
  if (process.platform !== 'win32') return { ok: false, error: 'No encuentro la URL o la clave en los ajustes de Skull Mining en EDMC.' };
  // EDMC 5: registro de Windows
  const { execFileSync } = require('child_process');
  const get = (name) => {
    try {
      const out = execFileSync('reg', ['query', 'HKCU\\Software\\Marginal\\EDMarketConnector', '/v', name], { encoding: 'utf8', windowsHide: true });
      const m = out.match(new RegExp(`${name}\\s+REG_\\w+\\s+(.+)`, 'i'));
      return m ? m[1].trim() : '';
    } catch (e) { return ''; }
  };
  const url = get('skullmining_url'); const token = get('skullmining_token');
  if (!url || !token) return { ok: false, error: 'No encuentro la URL o la clave en los ajustes de Skull Mining en EDMC.' };
  return { ok: true, url, token };
}

/** Estaciones y portanaves del sistema actual (Spansh), para la tarjeta de Vuelo. */
let hereInfo = null; let hereName = null;
async function lookHere(snap) {
  const name = snap.state.location.system;
  if (!name || name === hereName) return;
  hereName = name; hereInfo = null;
  try {
    const y = await spansh.system(name);
    if (hereName !== name) return;
    hereInfo = y ? { system: y.name, stations: y.stations, at: Date.now() } : { system: name, stations: [], at: Date.now() };
  } catch (e) { hereInfo = { system: name, error: e.message }; hereName = null; logLine(`[spansh] sistema ${name}: ${e.message}`); }
  if (win && !win.isDestroyed()) win.webContents.send('ed:here', hereInfo);
}

/** Exploración: cuerpos del sistema actual según Spansh (los que aún no has escaneado y si alguien lo ha subido). */
let exploreLooked = null;
let saveExplore = () => {};
async function lookExplore(snap) {
  const addr = snap.state.exploration && snap.state.exploration.system.address;
  if (addr == null || addr === exploreLooked) return;
  exploreLooked = addr;
  try {
    const d = await spansh.dump(addr);
    if (exploreLooked !== addr) return;
    engine.setSpanshSystem(addr, d && Array.isArray(d.bodies) ? d.bodies : null);
  } catch (e) {
    if (/ 404/.test(e.message)) engine.setSpanshSystem(addr, null);
    else { engine.setSpanshSystem(addr, null, e.message); exploreLooked = null; logLine(`[spansh] volcado para Exploración: ${e.message}`); }
  }
}

/** Gravedad del cuerpo al que te acercas, desde Spansh (Status.json solo la da a pie). */
let bodyLooked = null;
const bodyInfo = {}; // por nombre, para la ventana aunque se abra después de la consulta
async function lookBody(snap) {
  let a = snap.state.location.approach;
  // sin ApproachBody (p. ej. la app se abrió ya en la superficie): el cuerpo de Status.json y su BodyID del escaneo
  if (!a || a.bodyId == null) {
    const name = snap.state.status && snap.state.status.bodyName;
    const jb = name && snap.state.bodies && snap.state.bodies[name];
    if (jb && jb.id != null && snap.state.location.systemAddress != null) a = { body: name, bodyId: jb.id, systemAddress: snap.state.location.systemAddress };
  }
  const id = a && a.bodyId != null && a.systemAddress != null ? spansh.bodyId64(a.systemAddress, a.bodyId) : null;
  if (!id) return;
  // se vuelve a calcular si llegan escaneos nuevos del sistema (FSS, sondas) o géneros del DSS
  const bodies = snap.state.bodies || {};
  const jb = bodies[a.body] || {};
  const key = `${id}|${Object.values(bodies).filter((x) => x.scan).length}|${(jb.genuses || []).length}|${Object.keys((snap.state.bio || {})[a.bodyId] || {}).length}`;
  if (key === bodyLooked) return;
  bodyLooked = key;
  let info = { body: a.body };
  try { const b = await spansh.body(id); if (b) info = { ...b, body: a.body }; } catch (e) { logLine(`[spansh] cuerpo ${a.body}: ${e.message}`); }
  if (info.species) engine.learnBioValues(Object.fromEntries(info.species.filter((x) => x.species && x.value).map((x) => [require('../core/exploration').nameKey(x.species), x.value])));
  // predicción de exobiología con los datos del diario y, para lo que falte, el volcado de Spansh
  try {
    let dumpSys = null;
    try { dumpSys = await spansh.dump(a.systemAddress); } catch (e) { logLine(`[spansh] volcado del sistema: ${e.message}`); }
    const all = new Map();
    for (const x of (dumpSys && dumpSys.bodies) || []) all.set(x.bodyId, biopredict.normBody(x, 'spansh'));
    for (const x of Object.values(bodies)) if (x.scan && x.scan.BodyID != null && (x.scan.SystemAddress == null || x.scan.SystemAddress === a.systemAddress)) all.set(x.scan.BodyID, biopredict.normBody(x.scan, 'journal'));
    const list = [...all.values()];
    const me = all.get(a.bodyId);
    if (me && !me.star) {
      // si Spansh no tenía la ficha del cuerpo, sus datos físicos salen del volcado
      if (info.gravity == null && me.gravity != null) info.gravity = me.gravity * 10 / 9.80665;
      if (info.temperature == null && me.temp != null) info.temperature = me.temp;
      if (info.radius == null && me.radius != null) info.radius = me.radius / 1000;
      if (!info.subtype && me.planetClass) info.subtype = me.planetClass;
      const pos = snap.state.location.starPos || (dumpSys && dumpSys.coords ? [dumpSys.coords.x, dumpSys.coords.y, dumpSys.coords.z] : null);
      // géneros ya conocidos: los de tu DSS o, si no, los que otros subieron a Spansh
      const rawDump = ((dumpSys && dumpSys.bodies) || []).find((x) => x.bodyId === a.bodyId);
      const genusKeys = (jb.genuses || []).length ? jb.genuses.map((g) => g.key) : ((rawDump && rawDump.signals && rawDump.signals.genuses) || []);
      const known = {
        genus: genusKeys.map((g) => GENUS_KEYS[String(g || '').replace(/^\$Codex_Ent_|_Genus_Name;$/g, '')]).filter(Boolean),
        species: Object.fromEntries(Object.values((snap.state.bio || {})[a.bodyId] || {}).filter((x) => x.species).map((x) => [String(x.species).split(' ')[0], x.species])),
      };
      const bioCount = ((jb.signals || []).find((x) => x.key === 'biological') || {}).count || 0;
      const spBio = rawDump && rawDump.signals && rawDump.signals.signals ? rawDump.signals.signals['$SAA_SignalType_Biological;'] || 0 : 0;
      known.allGenusKnown = known.genus.length > 0 && known.genus.length >= (bioCount || spBio);
      info.knownGenus = known.genus;
      info.predictions = me.landable === false ? [] : biopredict.predict(biopredict.bodyProps(me, list, pos), known);
      info.predictionSource = jb.scan ? 'journal' : 'spansh';
      info.region = biopredict.regionName(biopredict.regionAt(pos));
    }
  } catch (e) { logLine(`[bio] predicción: ${e.message}`); }
  bodyInfo[a.body] = info;
  if (win && !win.isDestroyed()) win.webContents.send('ed:body', bodyInfo[a.body]);
}
// claves de género del juego (SAASignalsFound) → nombre de género de las reglas
const GENUS_KEYS = { Bacterial: 'Bacterium', Fonticulus: 'Fonticulua', Shrubs: 'Frutexa', Tussocks: 'Tussock', Cactoid: 'Cactoida', Clypeus: 'Clypeus', Conchas: 'Concha',
  Electricae: 'Electricae', Fumerolas: 'Fumerola', Fungoids: 'Fungoida', Osseus: 'Osseus', Recepta: 'Recepta', Stratum: 'Stratum', Tubus: 'Tubus', Aleoids: 'Aleoida',
  Vents: 'Amphora Plant', Sphere: 'Luteolum Anemone', Cone: 'Bark Mounds', Brancae: 'Brain Trees', Ground_Struct_Ice: 'Crystalline Shards', Tubers: 'Roseum Sinuous Tubers' };

async function lookFuelStops(snap) {
  const p = snap.view.fuelPlan;
  if (!p || p.ok || process.env.ED_BUBBLE_OFFLINE === '1') return;
  const route = snap.state.route;
  const cands = route.slice(0, p.reachable + 1).map((x) => x.system).reverse().slice(0, 25); // los más lejanos primero
  const key = cands.join('|');
  if (fuelStops.key === key || fuelStops.busy) return;
  fuelStops.key = key; fuelStops.busy = true;
  for (const name of cands) {
    if (fuelStops.systems[name] !== undefined) continue;
    try {
      const y = await spansh.system(name);
      const st = y ? y.stations.filter((x) => x.services && x.services.refuel && !/carrier/i.test(x.type || '')).sort((a, b) => (a.distance ?? 1e12) - (b.distance ?? 1e12)) : [];
      fuelStops.systems[name] = st.length ? { name: st[0].name, label: st[0].label, ls: st[0].distance, pad: st[0].pad, icon: st[0].icon, count: st.length } : null;
    } catch (e) { fuelStops.key = null; break; } // sin red: se reintenta en la siguiente actualización
    if (win && !win.isDestroyed()) win.webContents.send('ed:fuelstops', fuelStops.systems);
  }
  fuelStops.busy = false;
}
let controls = { error: 'Cargando controles…' };
const keys = new KeySender({ simulate: process.env.ED_BUBBLE_SIMULATE === '1' || undefined });

/** Lee los controles (preset activo del juego o archivo elegido) y avisa a la ventana. */
function loadControls() {
  controls = settings.bindsFile ? binds.loadFile(settings.bindsFile) : binds.loadActive(process.env.ED_BINDINGS_FOLDER || undefined);
  controls.source = settings.bindsFile ? 'file' : 'auto';
  if (controls.error) { console.warn('[controles]', controls.error); logLine(`[controles] ${controls.error}`); }
  else console.log(`[controles] preset ${controls.preset} (${Object.keys(controls.binds).length} acciones de teclado)`);
  watchControls();
  if (win && !win.isDestroyed()) win.webContents.send('ed:controls', controlsInfo());
}

function controlsInfo() {
  return {
    preset: controls.preset || null, error: controls.error || null, code: controls.code || null,
    source: controls.source, file: controls.file || null, folder: controls.folder || null,
    defaultFolder: process.env.ED_BINDINGS_FOLDER || binds.defaultBindingsFolder(),
    simulate: keys.simulate, actions: actions.describe(controls.binds), check: controls.error ? null : actions.checkControls(controls),
  };
}

/** Recarga los controles cuando el comandante los cambia en el juego (vigila su carpeta). */
let ctlWatch = null;
function watchControls() {
  const folder = controls.folder || process.env.ED_BINDINGS_FOLDER || binds.defaultBindingsFolder();
  if (ctlWatch && ctlWatch.folder === folder) return;
  if (ctlWatch) { try { ctlWatch.w.close(); } catch (e) { /* ya cerrado */ } ctlWatch = null; }
  let t = null;
  try {
    ctlWatch = { folder, w: fs.watch(folder, () => { clearTimeout(t); t = setTimeout(loadControls, 800); }) };
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
  if (settings.fullscreen) win.setFullScreen(true);
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
      for (const sec of ['puente', 'vuelo', 'orbita', 'equipo', 'mineria', 'apie', 'ingenieros', 'navegacion', 'colonizacion', 'estacion', 'powerplay', 'ajustes', 'controles']) {
        await win.webContents.executeJavaScript(`ui.section='${sec}'; ui.autoJump=false; if ('${sec}' === 'ajustes') loadSettingsInfo(); render();`);
        await new Promise((r) => setTimeout(r, 400));
        const img = await win.webContents.capturePage();
        fs.writeFileSync(path.join(out, `${sec}.png`), img.toPNG());
      }
      // ED_BUBBLE_SHOT_FINAL=json: Vuelo con un destino final (para revisar el diseño)
      if (process.env.ED_BUBBLE_SHOT_FINAL) {
        await win.webContents.executeJavaScript(`ui.section='vuelo'; ui.finalDest=${process.env.ED_BUBBLE_SHOT_FINAL}; render();`);
        await new Promise((r) => setTimeout(r, 400));
        fs.writeFileSync(path.join(out, 'destino.png'), (await win.webContents.capturePage()).toPNG());
      }
      // ED_BUBBLE_SHOT_MATERIAL=clave: Colonización con ese material elegido (dónde comprar)
      if (process.env.ED_BUBBLE_SHOT_MATERIAL) {
        await win.webContents.executeJavaScript(`ui.section='colonizacion'; ui.colSel=${JSON.stringify(process.env.ED_BUBBLE_SHOT_MATERIAL)}; ui.colAside='buy'; render();`);
        await new Promise((r) => setTimeout(r, 3000));
        await win.webContents.executeJavaScript('ui.mk.pick=1; render();');
        await new Promise((r) => setTimeout(r, 400));
        fs.writeFileSync(path.join(out, 'comprar.png'), (await win.webContents.capturePage()).toPNG());
      }
      // ED_BUBBLE_SHOT_SYSTEM=nombre: busca ese sistema en Navegación y captura la ficha
      if (process.env.ED_BUBBLE_SHOT_SYSTEM) {
        const n = JSON.stringify(process.env.ED_BUBBLE_SHOT_SYSTEM);
        await win.webContents.executeJavaScript(`ui.section='navegacion'; render(); const el=document.getElementById('nav-search'); el.focus(); el.value=${n}.slice(0, 16); el.dispatchEvent(new Event('input', { bubbles: true }));`);
        await new Promise((r) => setTimeout(r, 3000));
        fs.writeFileSync(path.join(out, 'buscador.png'), (await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`selectSystem(${n});`);
        await new Promise((r) => setTimeout(r, 4000));
        for (const tab of ['stations', 'factions', 'bodies']) {
          await win.webContents.executeJavaScript(`ui.sysTab='${tab}'; ui.sysPage=0; render();`);
          await new Promise((r) => setTimeout(r, 400));
          fs.writeFileSync(path.join(out, `sistema-${tab}.png`), (await win.webContents.capturePage()).toPNG());
        }
        await win.webContents.executeJavaScript("ui.sysTab='stations'; ui.sysKinds=['Asentamiento','Construcción en superficie']; ui.sysLarge=true; render();");
        await new Promise((r) => setTimeout(r, 400));
        fs.writeFileSync(path.join(out, 'sistema-filtro.png'), (await win.webContents.capturePage()).toPNG());
      }
      app.quit();
    });
  }
}

/**
 * Lista completa de nebulosas (EDAstro, la misma fuente que SrvSurvey) para predecir Electricae y otras
 * especies que viven cerca de una nebulosa. Se descarga una vez por semana y se guarda; sin red se usa
 * la lista que trae la app.
 */
async function loadNebulae() {
  const file = path.join(app.getPath('userData'), 'nebulae.json');
  let cached = null;
  try { cached = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* aún no hay */ }
  if (cached && cached.list) biopredict.setNebulae(cached.list);
  if (process.env.ED_BUBBLE_OFFLINE === '1') return;
  if (cached && cached.at && Date.now() - cached.at < 7 * 86400000) return;
  try {
    const r = await fetch('https://edastro.com/mapcharts/files/nebulae-coordinates.csv', { headers: { 'User-Agent': 'ED-BUBBLE' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    // columnas: Name, System, X, Y, Z, Type
    const list = (await r.text()).split(/\r?\n/).slice(1).map((l) => l.split(',')).filter((p) => p.length >= 5)
      .map((p) => [Number(p[2]), Number(p[3]), Number(p[4])]).filter((v) => v.every(Number.isFinite));
    if (list.length > 100) { biopredict.setNebulae(list); fs.writeFileSync(file, JSON.stringify({ at: Date.now(), list })); }
  } catch (e) { logLine(`[nebulosas] ${e.message}`); }
}

app.whenReady().then(() => {
  loadNebulae();
  // Ajustes guardados: se leen lo primero (los controles dependen de ellos)
  const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');
  try { settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) || {}; } catch (e) { /* sin ajustes */ }
  spansh.setFetch((url, opts) => net.fetch(url, opts));
  // Solo desarrollo: ED_BUBBLE_SPANSH_FIXTURE=carpeta con search.json y suggest.json (sin red)
  if (process.env.ED_BUBBLE_SPANSH_FIXTURE) {
    const dir = process.env.ED_BUBBLE_SPANSH_FIXTURE;
    spansh.setFetch(async (url) => new Response(fs.readFileSync(path.join(dir, /field_values/.test(url) ? 'suggest.json' : /stations\/search/.test(url) ? 'markets.json' : /api\/body\//.test(url) ? 'body.json' : 'search.json'))));
  }
  engine = new Engine({ folder: process.env.ED_JOURNAL_FOLDER || undefined });
  // Flota: los módulos de cada nave que has usado (para comparar builds), guardados entre sesiones
  // porque el historial que se lee al arrancar solo cubre los últimos diarios
  const FLEET_FILE = path.join(app.getPath('userData'), 'fleet.json');
  try { engine.state.fleet = JSON.parse(fs.readFileSync(FLEET_FILE, 'utf8')) || {}; } catch (e) { /* aún no hay */ }
  let fleetSaved = JSON.stringify(engine.state.fleet || {});
  engine.on('update', (snap) => {
    last = snap;
    const fj = JSON.stringify(snap.state.fleet || {});
    if (fj !== fleetSaved) { fleetSaved = fj; try { fs.writeFileSync(FLEET_FILE, fj); } catch (e) { /* no se guarda */ } }
    snap.view.mine = mineView(snap);
    if (win && !win.isDestroyed()) win.webContents.send('ed:update', snap);
    lookFuelStops(snap);
    lookBody(snap);
    lookHere(snap);
    lookExplore(snap);
    saveExplore(snap);
    skullSites(snap);
    // destino fijado sin cuerpo: se completa al llegar a uno
    const nt = geo.adoptBody(snap.state.surfaceTarget, snap.state);
    if (nt) {
      engine.setSurfaceTarget(nt);
      try { fs.writeFileSync(path.join(app.getPath('userData'), 'surface-target.json'), JSON.stringify(nt)); } catch (e) { /* no se guarda */ }
      logLine(`[destino] cuerpo completado: ${nt.body}`);
    }
  });
  // Exploración: valores de especies aprendidos (ventas, Spansh) y ruta de neutrones, guardados entre sesiones
  const BIOVAL_FILE = path.join(app.getPath('userData'), 'biovalues.json');
  const NEUTRON_FILE = path.join(app.getPath('userData'), 'neutron.json');
  try { engine.learnBioValues(JSON.parse(fs.readFileSync(BIOVAL_FILE, 'utf8'))); } catch (e) { /* aún no hay */ }
  try { engine.setNeutronRoute(JSON.parse(fs.readFileSync(NEUTRON_FILE, 'utf8'))); } catch (e) { /* sin ruta */ }
  let bioSaved = -1; let neutronSaved = JSON.stringify(engine.state.neutron || null);
  saveExplore = (snap) => {
    const X = snap.state.exploration;
    if (X.bioValuesChanged !== bioSaved) { bioSaved = X.bioValuesChanged; try { fs.writeFileSync(BIOVAL_FILE, JSON.stringify(X.bioValues)); } catch (e) { /* no se guarda */ } }
    const nj = JSON.stringify(snap.state.neutron || null);
    if (nj !== neutronSaved) { neutronSaved = nj; try { if (snap.state.neutron) fs.writeFileSync(NEUTRON_FILE, nj); else fs.unlinkSync(NEUTRON_FILE); } catch (e) { /* no se guarda */ } }
  };
  ipcMain.handle('ed:neutron-plot', async (_e, opts) => {
    const st = (last || engine.snapshot()).state;
    const to = String((opts && opts.to) || '').trim().slice(0, 80);
    const from = String((opts && opts.from) || st.location.system || '').trim().slice(0, 80);
    const range = Number(opts && opts.range) || st.ship.maxJumpRange;
    if (!to) return { ok: false, error: 'Escribe el sistema de destino' };
    if (!from) return { ok: false, error: 'Aún no sé en qué sistema estás' };
    if (!range) return { ok: false, error: 'Aún no sé el alcance de salto de tu nave (sale al cargar la partida)' };
    try {
      const r = await spansh.neutronRoute({ from, to, range: Math.round(range * 100) / 100, efficiency: 60 });
      if (!r.jumps.length) return { ok: false, error: 'Spansh no encontró ruta' };
      engine.setNeutronRoute({ ...r, at: new Date().toISOString(), reached: 0 });
      return { ok: true };
    } catch (e) { logLine(`[spansh] ruta de neutrones: ${e.message}`); return { ok: false, error: /400|422/.test(e.message) ? 'Spansh no conoce ese sistema' : e.message }; }
  });
  ipcMain.handle('ed:neutron-clear', () => { engine.setNeutronRoute(null); return true; });
  engine.on('warning', (msg) => { console.warn('[engine]', msg); logLine(`[motor] ${msg}`); });
  engine.start();
  ipcMain.handle('ed:snapshot', () => last || engine.snapshot());
  loadControls();
  keys.on('warning', (m) => console.warn('[teclas]', m));
  keys.start();
  ipcMain.on('ed:log', (_e, msg) => { console.warn('[ventana]', msg); logLine(`[ventana] ${msg}`); });
  ipcMain.handle('ed:controls', () => controlsInfo());
  ipcMain.handle('ed:run', async (_e, id) => {
    if (plotting) return { ok: false, error: 'plot-busy' };
    const built = actions.build(String(id), controls.binds);
    if (built.error) return { ok: false, error: built.error, action: built.action };
    const res = await keys.run(built.ops);
    if (!res.ok) { console.warn(`[teclas] ${id}: ${res.error}`); logLine(`[teclas] ${id}: ${res.error}`); }
    return res;
  });
  // En Electron 45 el portapapeles es asíncrono (devuelve promesas): hay que esperarlo
  ipcMain.handle('ed:copy', async (_e, text) => { await clipboard.writeText(String(text || '').slice(0, 200)); return true; });
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
  // Spansh: sugerencias y ficha (con la distancia desde el sistema actual)
  ipcMain.handle('ed:suggest', async (_e, q) => {
    try { return { ok: true, results: await spansh.suggest(String(q || '').slice(0, 80)) }; } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle('ed:system', async (_e, name) => {
    const here = last && last.state.location.system;
    try { return { ok: true, system: await spansh.system(String(name || '').slice(0, 120), here || undefined) }; } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle('ed:markets', async (_e, q) => {
    const here = last && last.state.location.system;
    if (!here) return { ok: false, error: 'Sin sistema actual (abre el juego)' };
    try {
      // Spansh solo entiende los nombres en inglés: se traduce desde el símbolo interno
      const commodity = commodities.englishName(q && q.symbol) || String((q && q.commodity) || '').slice(0, 80);
      const list = await spansh.markets({ commodity, reference: here, minSupply: Number(q && q.minSupply) || 1, largePad: !!(q && q.largePad) });
      return { ok: true, list, reference: here };
    } catch (e) { return { ok: false, error: e.message }; }
  });
  // Trazar ruta en el mapa galáctico
  const plotStatus = (st) => { if (win && !win.isDestroyed()) win.webContents.send('ed:plot-status', st); };
  ipcMain.handle('ed:plot', async (_e, name, distance) => {
    const target = String(name || '').trim().slice(0, 120);
    if (!target) return { ok: false, error: 'no-target' };
    if (plotting) return { ok: false, error: 'plot-busy' };
    plotting = { cancelled: false, target };
    plotStatus({ running: true, target, text: 'Preparando' });
    const res = await plotRoute(target, Number(distance) || 0, {
      keys,
      binds: controls.binds,
      getState: () => (last || engine.snapshot()).state,
      clipboard,
      onStep: (text) => plotStatus({ running: true, target, text }),
      isCancelled: () => plotting.cancelled,
    });
    plotting = null;
    plotStatus({ running: false, target, ...res });
    if (!res.ok) { console.warn('[ruta]', target, res); logLine(`[ruta] ${target} ${JSON.stringify(res)}`); }
    return res;
  });
  // Ajustes guardados (sistema de Powerplay seguido, …)
  const saveSettings = () => { try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2)); } catch (e) { logLine(`[ajustes] ${e.message}`); } };
  if (settings.ppTracked) engine.setTrackedSystem(settings.ppTracked);
  ipcMain.handle('ed:pp-track', (_e, name) => {
    settings.ppTracked = name ? String(name).slice(0, 120) : null;
    engine.setTrackedSystem(settings.ppTracked);
    saveSettings();
    return true;
  });
  ipcMain.handle('ed:settings', () => prefs());
  ipcMain.handle('ed:settings-set', (_e, key, value) => {
    const v = cleanPref(key, value);
    if (v === undefined) return prefs();
    const [group, sub] = String(key).split('.');
    if (sub) settings[group] = { ...(settings[group] || {}), [sub]: v }; else settings[key] = v;
    saveSettings();
    if (key === 'fullscreen' && win && !win.isDestroyed()) win.setFullScreen(v);
    return prefs();
  });
  // Pantallas conectadas: para mover la ventana a otra
  const displayList = () => {
    const prim = screen.getPrimaryDisplay().id;
    const cur = win && !win.isDestroyed() ? screen.getDisplayMatching(win.getBounds()).id : null;
    return screen.getAllDisplays().sort((a, b) => a.bounds.x - b.bounds.x || a.bounds.y - b.bounds.y)
      .map((d, i) => ({ id: d.id, n: i + 1, label: d.label || '', width: d.size.width, height: d.size.height, scale: d.scaleFactor, primary: d.id === prim, current: d.id === cur }));
  };
  ipcMain.handle('ed:displays', () => displayList());
  ipcMain.handle('ed:display-move', (_e, id) => {
    const d = screen.getAllDisplays().find((x) => x.id === Number(id));
    if (!d || !win || win.isDestroyed()) return displayList();
    const full = win.isFullScreen();
    if (full) win.setFullScreen(false);
    if (win.isMaximized()) win.unmaximize();
    win.setBounds(d.workArea);
    win.maximize();
    if (full) setTimeout(() => win.setFullScreen(true), 300);
    saveBounds(win);
    return displayList();
  });
  // Controles: importar un .binds, volver al preset activo del juego, releer, abrir carpeta
  ipcMain.handle('ed:binds-import', async () => {
    const def = controls.folder || binds.defaultBindingsFolder();
    const r = await dialog.showOpenDialog(win, { title: 'Elige tu archivo de controles de Elite Dangerous', defaultPath: fs.existsSync(def) ? def : app.getPath('home'), filters: [{ name: 'Controles de Elite Dangerous', extensions: ['binds'] }], properties: ['openFile'] });
    if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
    const test = binds.loadFile(r.filePaths[0]);
    if (test.error) return { ok: false, error: test.error };
    settings.bindsFile = r.filePaths[0]; saveSettings(); loadControls();
    return { ok: true };
  });
  ipcMain.handle('ed:binds-auto', () => { delete settings.bindsFile; saveSettings(); loadControls(); return true; });
  ipcMain.handle('ed:binds-reload', () => { loadControls(); return true; });
  ipcMain.handle('ed:binds-folder', () => {
    const f = controls.folder || binds.defaultBindingsFolder();
    return fs.existsSync(f) ? shell.openPath(f) : 'No existe la carpeta';
  });
  ipcMain.handle('ed:bodies', () => bodyInfo);
  // recetas de ingeniería de nave (datos fijos; el renderer las pide una vez)
  // naves y módulos (datos fijos: coriolis-data + EDCD FDevIDs), con nombres en español de los módulos conocidos
  ipcMain.handle('ed:shipdata', () => {
    const d = require('../core/data/shipdata.json');
    const norm = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, '');
    const es = {};
    for (const [en, v] of Object.entries(require('../core/shipengineers').MODULES)) es[norm(en)] = v.es;
    return { ships: d.ships, modules: d.modules, es };
  });
  // Builds importadas y su lista de deseos: se guardan en builds.json hasta que el usuario las borre
  const builds = require('../core/builds');
  const BUILDS_FILE = path.join(app.getPath('userData'), 'builds.json');
  const readBuilds = () => { try { const b = JSON.parse(fs.readFileSync(BUILDS_FILE, 'utf8')); return Array.isArray(b) ? b : []; } catch (e) { return []; } };
  const writeBuilds = (b) => { try { fs.writeFileSync(BUILDS_FILE, JSON.stringify(b)); } catch (e) { logLine(`[builds] no se pudo guardar: ${e.message}`); } };
  ipcMain.handle('ed:builds', () => readBuilds());
  ipcMain.handle('ed:build-import', async () => {
    const text = String((await clipboard.readText()) || '').slice(0, 2000000);
    try {
      const b = builds.parse(text);
      const st = engine.snapshot().state;
      const mine = (st.fleet || {})[b.ship];
      const wish = builds.diff(b, mine ? mine.modules : []);
      const item = { id: `b${Date.now().toString(36)}`, at: new Date().toISOString(), ...b, against: mine ? { name: mine.name, ident: mine.ident } : null, wish };
      const list = readBuilds(); list.unshift(item); writeBuilds(list.slice(0, 50));
      return { ok: true, build: item };
    } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle('ed:build-delete', (_e, id) => { writeBuilds(readBuilds().filter((b) => b.id !== id)); return true; });
  ipcMain.handle('ed:ship-export', async (_e, kind) => {
    const L = engine.snapshot().state.ship.loadout;
    if (!L) return { ok: false, error: 'El diario aún no ha escrito los módulos de tu nave.' };
    if (kind === 'slef') { await clipboard.writeText(builds.toSlef(L, require('./package.json').version)); return { ok: true, copied: true }; }
    const url = builds.exportUrl(kind, L);
    if (!url) return { ok: false, error: 'No se pudo crear el enlace.' };
    shell.openExternal(url);
    return { ok: true };
  });
  ipcMain.handle('ed:buy-search', async (_e, item) => {
    const info = builds.moduleInfo(item);
    const st = engine.snapshot().state;
    const ref = st.location && st.location.system;
    if (!info) return { ok: false, error: 'No conozco ese módulo.' };
    if (!ref) return { ok: false, error: 'Aún no sé en qué sistema estás.' };
    try { return { ok: true, ref, info, results: await spansh.outfitting({ item: String(item).toLowerCase(), info, reference: ref }) }; } catch (e) { return { ok: false, error: e.message }; }
  });
  // mercancías por tipo de construcción de colonización (datos fijos de SrvSurvey / Raven Colonial)
  ipcMain.handle('ed:colcosts', () => require('../core/colcosts').costList());
  ipcMain.handle('ed:recipes', () => {
    const b = require('../core/shipblueprints');
    // Nombres del juego en español y máximo que se puede llevar (core/data/materials.json); por símbolo y, si falta, por nombre en inglés.
    const M = require('../core/data/materials.json').materials;
    const byEn = {}; for (const v of Object.values(M)) byEn[String(v.en).toLowerCase()] = v;
    const mats = {};
    for (const [k, m] of Object.entries(b.MATS)) { const x = M[k] || byEn[String(m.name).toLowerCase()]; mats[k] = x ? { ...m, es: x.es, max: x.max } : m; }
    return { mats, blueprints: b.BLUEPRINTS, specials: b.SPECIALS, modules: b.MODULE_RECIPES };
  });
  ipcMain.handle('ed:here', () => hereInfo);
  // Minería (Skull Mining)
  ipcMain.handle('ed:skull', () => { skullRead(); return skullInfo(); });
  ipcMain.handle('ed:skull-connect', () => {
    const r = readEdmcSkull();
    if (r.ok) { settings.skull = { url: r.url, token: r.token }; saveSettings(); if (engine) skullSites(engine.snapshot(), true); }
    return r.ok ? { ok: true } : r;
  });
  ipcMain.handle('ed:skull-disconnect', () => { delete settings.skull; saveSettings(); skull.sites = null; skull.sitesStatus = ''; sendSkull(); return true; });
  ipcMain.handle('ed:rig', (_e, op) => {
    const pos = minePos((last || engine.snapshot()).state);
    if (op === 'add' && pos) { if (rigs.body !== pos.body) rigs = { body: pos.body, list: [] }; rigs.list.push({ lat: pos.lat, lon: pos.lon, t: Date.now() }); }
    else if (op === 'undo') rigs.list.pop();
    else if (op === 'clear') rigs.list = [];
    if (last) { last.view.mine = mineView(last); if (win && !win.isDestroyed()) win.webContents.send('ed:update', last); }
    return rigs.list.length;
  });
  ipcMain.handle('ed:skull-refresh', () => { if (engine) skullSites(engine.snapshot(), true); return true; });
  ipcMain.handle('ed:open-skull-web', () => shell.openExternal('https://skullflota.github.io/SkullMining/'));
  // relectura de los archivos del plugin cada 5 s (los guarda cada 20 s durante una sesión)
  skullRead(); setInterval(() => { skullRead(); sendSkull(); }, 5000);
  ipcMain.handle('ed:open-data', () => shell.openPath(app.getPath('userData')));
  // Coordenadas de destino en un planeta (se guardan entre sesiones)
  const TARGET_FILE = path.join(app.getPath('userData'), 'surface-target.json');
  try { engine.setSurfaceTarget(JSON.parse(fs.readFileSync(TARGET_FILE, 'utf8'))); } catch (e) { /* sin destino guardado */ }
  ipcMain.handle('ed:clipboard-read', async () => String((await clipboard.readText()) || '').slice(0, 200));
  ipcMain.handle('ed:target-set', (_e, text) => {
    const c = geo.parseCoords(String(text || '').slice(0, 200));
    if (!c) return { ok: false, error: 'No entiendo esas coordenadas. Ejemplo: 12.345, -67.89' };
    const st = (last || engine.snapshot()).state;
    const t = { ...c, body: st.status.bodyName || st.location.body || null, at: new Date().toISOString() };
    engine.setSurfaceTarget(t);
    try { fs.writeFileSync(TARGET_FILE, JSON.stringify(t)); } catch (e) { /* no se guarda */ }
    return { ok: true, target: t };
  });
  ipcMain.handle('ed:target-clear', () => { engine.setSurfaceTarget(null); try { fs.unlinkSync(TARGET_FILE); } catch (e) { /* ya no estaba */ } return true; });
  ipcMain.handle('ed:plot-cancel', () => { if (plotting) plotting.cancelled = true; return true; });
  ipcMain.handle('ed:info', () => ({ version: require('./package.json').version, journalFolder: engine.folder, log: LOG_FILE() }));
  logLine(`[inicio] ED BUBBLE ${require('./package.json').version} · Journal: ${engine.folder}`);
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  if (engine) engine.stop();
  keys.stop();
  app.quit();
});
