'use strict';

/**
 * Builds de nave: ranuras de cada nave, exportar a Coriolis y EDSY, importar
 * builds (SLEF de EDSY, Coriolis o Inara, evento Loadout del diario o enlaces
 * de importación) y lista de deseos (lo que cambia respecto a tu nave).
 *
 * Formatos públicos: SLEF (https://inara.cz/elite/inara-impexp-slef/) y los
 * enlaces de importación de Coriolis (…/import?data=) y EDSY (…/#/I=), que
 * llevan el evento Loadout en JSON comprimido con gzip y en base64.
 */

const zlib = require('zlib');

let DATA = null;
function data() {
  if (!DATA) { try { DATA = require('./data/shipdata.json'); } catch (e) { DATA = { ships: {}, modules: {} }; } }
  return DATA;
}

const STANDARD = ['PowerPlant', 'MainEngines', 'FrameShiftDrive', 'LifeSupport', 'PowerDistributor', 'Radar', 'FuelTank'];
const HP_SIZE = { 4: 'Huge', 3: 'Large', 2: 'Medium', 1: 'Small', 0: 'Tiny' };
const NAMED_INTERNAL = { Military: 'Military', Limpets: 'LimpetController', Fighter: 'FighterBay', Cargo: 'Cargo' };
const COSMETIC = /^(PaintJob|ShipCockpit|CargoHatch|VesselVoice|Decal\d*|ShipName\d*|ShipID\d*|Bobble\d*|WeaponColour|EngineColour|StringLights|ShipKit\w*)$/i;

/**
 * Ranuras de una nave con el nombre que usa el juego en el evento Loadout:
 * [{ slot, group: 'core'|'hard'|'opt', size }].
 */
function slotsFor(shipSymbol) {
  const sh = data().ships[String(shipSymbol || '').toLowerCase()];
  if (!sh || !sh.slots) return null;
  const out = [{ slot: 'Armour', group: 'core', size: null }];
  (sh.slots.standard || []).forEach((cl, i) => { if (STANDARD[i]) out.push({ slot: STANDARD[i], group: 'core', size: cl }); });
  const cnt = {};
  for (const x of sh.slots.hardpoints || []) {
    const cl = typeof x === 'number' ? x : x.cl;
    cnt[cl] = (cnt[cl] || 0) + 1;
    const pre = typeof x === 'object' && x.name === 'Mining' ? 'Mining' : '';
    out.push({ slot: `${HP_SIZE[cl]}${pre}Hardpoint${cnt[cl]}`, group: 'hard', size: cl, mining: !!pre });
  }
  let n = 1; const named = {};
  for (const x of sh.slots.internal || []) {
    const cl = typeof x === 'number' ? x : x.cl;
    const name = typeof x === 'object' ? x.name : null;
    if (name === 'PlanetaryApproachSuite') { out.push({ slot: 'PlanetaryApproachSuite', group: 'opt', size: cl }); continue; }
    if (name && NAMED_INTERNAL[name]) {
      named[name] = (named[name] || 0) + 1;
      out.push({ slot: `${NAMED_INTERNAL[name]}${String(named[name]).padStart(2, '0')}`, group: 'opt', size: cl, special: name });
    } else {
      out.push({ slot: `Slot${String(n).padStart(2, '0')}_Size${cl}`, group: 'opt', size: cl, special: name || null });
      n += 1;
    }
  }
  return out;
}

const groupOf = (slot) => (slot === 'Armour' || STANDARD.includes(slot) ? 'core' : /Hardpoint/.test(slot) ? 'hard' : 'opt');

/**
 * Todas las ranuras de la nave, con el módulo montado o vacías.
 * Si el diario trae una ranura que no está en la plantilla, la plantilla de ese
 * grupo no se usa (para no inventar ranuras vacías que no existen).
 */
function layout(shipSymbol, modules) {
  const mods = (modules || []).filter((m) => m && m.slot && !COSMETIC.test(m.slot));
  const bySlot = new Map(mods.map((m) => [m.slot.toLowerCase(), m]));
  const tpl = slotsFor(shipSymbol) || [];
  const tplSet = new Set(tpl.map((t) => t.slot.toLowerCase()));
  const badGroups = new Set(mods.filter((m) => !tplSet.has(m.slot.toLowerCase())).map((m) => groupOf(m.slot)));
  const out = { core: [], hard: [], opt: [] };
  for (const t of tpl) {
    if (badGroups.has(t.group)) continue;
    out[t.group].push({ ...t, module: bySlot.get(t.slot.toLowerCase()) || null });
  }
  for (const m of mods) {
    const g = groupOf(m.slot);
    if (!badGroups.has(g) && tplSet.has(m.slot.toLowerCase())) continue;
    out[g].push({ slot: m.slot, group: g, size: null, module: m });
  }
  return out;
}

/* ---------- Exportar ---------- */

function encode(obj) {
  const gz = zlib.gzipSync(Buffer.from(JSON.stringify(obj), 'utf8'));
  return gz.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '%3D');
}
/** Enlace que abre la nave en Coriolis o en EDSY. */
function exportUrl(kind, loadout) {
  if (!loadout || !loadout.Ship) return null;
  const clean = { ...loadout, Modules: (loadout.Modules || []).filter((m) => m && m.Slot) };
  if (kind === 'coriolis') return `https://coriolis.io/import?data=${encode(clean)}`;
  if (kind === 'edsy') return `https://edsy.org/#/I=${encode(clean)}`;
  return null;
}
/** SLEF (para Inara y otras webs). */
function toSlef(loadout, version) {
  return JSON.stringify([{ header: { appName: 'ED BUBBLE', appVersion: version || '' }, data: loadout }]);
}

/* ---------- Importar ---------- */

function decodeLink(text) {
  const m = String(text).match(/(?:[?&]data=|#\/I=)([A-Za-z0-9_\-+/%=]+)/);
  if (!m) return null;
  const b64 = decodeURIComponent(m[1]).replace(/-/g, '+').replace(/_/g, '/');
  const buf = Buffer.from(b64, 'base64');
  const raw = buf[0] === 0x1f && buf[1] === 0x8b ? zlib.gunzipSync(buf) : buf;
  return JSON.parse(raw.toString('utf8'));
}

/** Busca dentro de lo pegado un evento Loadout (o algo con Ship y Modules). */
function findLoadout(x) {
  if (!x || typeof x !== 'object') return null;
  if (Array.isArray(x)) { for (const y of x) { const r = findLoadout(y); if (r) return r; } return null; }
  if (x.Ship && Array.isArray(x.Modules)) return { loadout: x, app: null };
  if (x.data) { const r = findLoadout(x.data); if (r) return { ...r, app: (x.header && x.header.appName) || r.app }; }
  return null;
}

/**
 * Convierte lo que pegue el usuario en una build:
 * { ship, shipName, name, app, modules: [{ slot, item, eng }] }.
 * Lanza un Error con el motivo en español si no se puede leer.
 */
function parse(text) {
  const t = String(text || '').trim();
  if (!t) throw new Error('El portapapeles está vacío.');
  let obj = null;
  if (/^https?:\/\//i.test(t) || /#\/I=|import\?data=/.test(t)) {
    if (/coriolis\.io\/outfit\//i.test(t)) throw new Error('Ese enlace de Coriolis usa un código propio que no se puede leer. En Coriolis pulsa «Export», elige SLEF y copia el texto.');
    try { obj = decodeLink(t); } catch (e) { obj = null; }
    if (!obj) throw new Error('No reconozco ese enlace. Sirven los de importación de Coriolis («import?data=») y EDSY («#/I=»), o el texto SLEF.');
  } else {
    try { obj = JSON.parse(t); } catch (e) {
      // un evento Loadout copiado del diario puede venir con más líneas
      const line = t.split(/\r?\n/).find((l) => /"event"\s*:\s*"Loadout"/.test(l));
      if (line) { try { obj = JSON.parse(line); } catch (e2) { obj = null; } }
      if (!obj) throw new Error('No es un texto que entienda. Copia la build en formato SLEF (EDSY: Export › SLEF; Coriolis: Export › SLEF).');
    }
  }
  if (obj && obj.$schema && /coriolis/i.test(obj.$schema)) throw new Error('Es el JSON propio de Coriolis. En la ventana de Export elige SLEF y copia ese texto.');
  const f = findLoadout(obj);
  if (!f) throw new Error('No encuentro una nave en lo que has copiado (falta «Ship» o «Modules»).');
  const L = f.loadout;
  const ship = String(L.Ship).toLowerCase();
  const sh = data().ships[ship];
  return {
    ship,
    shipName: sh ? sh.n : L.Ship,
    name: L.ShipName || (L.BuildName) || null,
    app: f.app || (L.event === 'Loadout' ? 'Diario del juego' : null),
    modules: (L.Modules || []).filter((m) => m && m.Slot && m.Item && !COSMETIC.test(m.Slot)).map((m) => ({
      slot: m.Slot,
      item: String(m.Item).toLowerCase(),
      eng: m.Engineering ? { bp: m.Engineering.BlueprintName || null, level: m.Engineering.Level ?? null, exp: m.Engineering.ExperimentalEffect || null } : null,
    })),
  };
}

/* ---------- Lista de deseos ---------- */

/**
 * Lo que cambia de tu nave a la build, ranura a ranura:
 * kind 'buy' (otro módulo), 'add' (ranura vacía en tu nave), 'remove' (la build la deja vacía)
 * o 'eng' (mismo módulo con otra ingeniería).
 */
function diff(build, current) {
  const have = new Map((current || []).filter((m) => m && m.slot).map((m) => [m.slot.toLowerCase(), m]));
  const want = new Map((build.modules || []).map((m) => [m.slot.toLowerCase(), m]));
  const out = [];
  for (const [k, w] of want) {
    const h = have.get(k);
    if (!h) out.push({ slot: w.slot, kind: 'add', item: w.item, eng: w.eng, from: null });
    else if (h.item !== w.item) out.push({ slot: w.slot, kind: 'buy', item: w.item, eng: w.eng, from: h.item });
    else if (w.eng && w.eng.bp && (!h.eng || h.eng.bp !== w.eng.bp || (h.eng.level || 0) < (w.eng.level || 0) || (w.eng.exp && w.eng.exp !== h.eng.exp))) {
      out.push({ slot: w.slot, kind: 'eng', item: w.item, eng: w.eng, from: h.item, fromEng: h.eng ? { bp: h.eng.bp, level: h.eng.level, exp: h.eng.exp || null } : null });
    }
  }
  for (const [k, h] of have) {
    if (!want.has(k) && !COSMETIC.test(h.slot) && h.item) out.push({ slot: h.slot, kind: 'remove', item: null, eng: null, from: h.item });
  }
  const order = (s) => { const g = groupOf(s); return g === 'core' ? 0 : g === 'hard' ? 1 : 2; };
  return out.sort((a, b) => order(a.slot) - order(b.slot) || a.slot.localeCompare(b.slot, 'en', { numeric: true }));
}

/** ¿Ya está hecho este cambio en la nave actual? */
function itemDone(it, current) {
  const h = (current || []).find((m) => m && m.slot && m.slot.toLowerCase() === it.slot.toLowerCase());
  if (it.kind === 'remove') return !h || !h.item;
  if (!h || h.item !== it.item) return false;
  if (it.kind === 'eng') return !!(h.eng && h.eng.bp === it.eng.bp && (h.eng.level || 0) >= (it.eng.level || 0) && (!it.eng.exp || h.eng.exp === it.eng.exp));
  return true;
}

/** Datos del módulo para buscarlo en Spansh y saber su precio normal. */
function moduleInfo(item) {
  const m = data().modules[String(item || '').toLowerCase()];
  if (!m) return null;
  return { name: m.n, cls: m.cl, rating: m.r, mount: m.m || null, base: (m.s && m.s.cost) || null, ship: m.sh || null };
}

module.exports = { slotsFor, layout, exportUrl, toSlef, parse, diff, itemDone, moduleInfo, decodeLink, groupOf, STANDARD };
