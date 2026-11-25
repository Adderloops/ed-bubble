'use strict';

/**
 * Predicción de especies de exobiología a partir de los datos del cuerpo.
 *
 * Las reglas («bio-criteria», core/data/bio-criteria/*.json) son de SrvSurvey (njthomson,
 * https://github.com/njthomson/SrvSurvey, GPLv3) y se usan tal cual. Este archivo es una
 * implementación propia en JavaScript de la forma de leerlas y aplicarlas, siguiendo la
 * documentación y el comportamiento de SrvSurvey. Las regiones de la galaxia salen de
 * EliteDangerousRegionMap (klightspeed, MIT) y la lista de nebulosas, de SrvSurvey.
 */

const fs = require('fs');
const path = require('path');

/* ---------- Reglas ---------- */

// nombres cortos que usan las reglas
const PROP = {
  body: 'PlanetClass', gravity: 'SurfaceGravity', temp: 'SurfaceTemperature', pressure: 'SurfacePressure',
  atmosphere: 'Atmosphere', atmosType: 'AtmosphereType', atmosComp: 'AtmosphereComposition', matsComp: 'Materials',
  dist: 'DistanceFromArrivalLS', volcanism: 'Volcanism', mats: 'Materials', regions: 'Region',
  star: 'Star', parentStar: 'ParentStar', primaryStar: 'PrimaryStar', nebulae: 'Nebulae', guardian: 'Guardian',
};
const VALUE = { Icy: 'Icy body', Rocky: 'Rocky body', RockyIce: 'Rocky ice ', HMC: 'High metal content ', MRB: 'Metal rich body' };
// grupos de regiones por brazo de la galaxia (los mismos que usa SrvSurvey)
const ARMS = {
  'Orion-CygnusArm': [7, 8, 16, 17, 18, 35], OuterArm: [5, 6, 13, 14, 27, 29, 31, 41, 37],
  'Scutum-CentaurusArm': [9, 10, 11, 12, 24, 25, 26, 42, 28], PerseusArm: [15, 30, 32, 33, 34, 36, 38, 39],
  'Sagittarius-CarinaArm': [9, 18, 19, 20, 21, 22, 23, 40], CentreLeft: [1, 4], CentreTop: [1, 3, 7], CentreRight: [1, 2],
  AmphoraBatch: [10, 19, 20, 21, 22], AnemoneBatch: [7, 8, 9, 13, 14, 15, 16, 17, 18, 27, 31],
  BarkMoundBatch: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 25, 32, 33, 34],
  BrainTreeBatch: [2, 9, 10, 17, 18, 35], TubersBatch: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19],
  ShardBatch: [14, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 34, 36, 37, 38, 39, 40, 41, 42],
};

function parseClause(txt) {
  const t = String(txt).trim();
  if (!t || t.startsWith('#')) return null;
  const m = t.match(/^\s*(\w+)\s*([&!]?)\[(.*)\]\s*$/);
  if (!m) throw new Error(`Regla mal formada: ${t}`);
  const [, prop, mod, val] = m;
  const c = { prop, raw: t };
  if (val.includes('~')) {
    const [a, b] = val.split('~').map((x) => x.trim());
    c.op = 'range'; c.min = a === '' ? null : Number(a); c.max = b === '' ? null : Number(b);
  } else if (val.includes('>=')) {
    c.op = 'comp'; c.comp = {};
    for (const part of val.split('|')) {
      const p = part.match(/([\w\s]+)>=\s*([.\d]+)/);
      if (!p) throw new Error(`Composición mal formada: ${part}`);
      c.comp[p[1].trim()] = Number(p[2]);
    }
  } else {
    c.op = mod === '!' ? 'not' : mod === '&' ? 'all' : 'is';
    c.values = val.split(',').map((x) => x.trim()).filter(Boolean).map((v) => {
      if (VALUE[v]) return VALUE[v];
      if (prop === 'regions') return ARMS[v] ? ARMS[v].join(',') : v;
      return v;
    });
  }
  return c;
}

function prepare(node) {
  const out = {
    genus: node.genus ?? null, species: node.species ?? null, variant: node.variant ?? null,
    query: (node.query || []).map(parseClause).filter(Boolean),
    useCommonChildren: !!node.useCommonChildren,
  };
  if (node.children) out.children = node.children.map(prepare);
  if (node.commonChildren) out.commonChildren = node.commonChildren.map(prepare);
  return out;
}

let CRITERIA = null;
function criteria() {
  if (CRITERIA) return CRITERIA;
  const dir = path.join(__dirname, 'data', 'bio-criteria');
  CRITERIA = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
    .map((f) => prepare(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))));
  return CRITERIA;
}

/* ---------- Comprobar una regla ---------- */

const eq = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
const regionIds = (values) => new Set(values.flatMap((v) => String(v).split(',')).map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n)));

function clauseOk(c, props) {
  const v = props[PROP[c.prop] || c.prop];
  if (c.op === 'range') {
    if (typeof v !== 'number' || Number.isNaN(v)) return null; // dato que falta
    if (c.min != null && v < c.min) return false;
    if (c.max != null && v > c.max) return false;
    return true;
  }
  if (c.op === 'comp') {
    if (!v || typeof v !== 'object') return null;
    // basta con que se cumpla una de las composiciones
    return Object.entries(c.comp).some(([k, min]) => v[k] != null && v[k] >= min);
  }
  if (c.prop === 'regions') {
    if (v == null) return null;
    const ids = regionIds(c.values);
    return c.op === 'not' ? !ids.has(Number(v)) : ids.has(Number(v));
  }
  if (v == null) return null;
  const list = Array.isArray(v) ? v : typeof v === 'object' ? Object.keys(v) : null;
  if (c.op === 'all') return c.values.every((x) => (list || [v]).some((y) => eq(x, y)));
  if (c.op === 'not') return !c.values.some((x) => (list || [v]).some((y) => eq(x, y)));
  // is
  if (c.prop === 'mats') return c.values.some((x) => Object.entries(v).some(([k, pct]) => eq(k, x) && pct > 0.25));
  if (list) return c.values.some((x) => list.some((y) => eq(x, y)));
  const s = String(v);
  if (c.prop === 'body') return c.values.some((x) => s.toLowerCase().startsWith(String(x).toLowerCase()));
  if (c.prop === 'volcanism') {
    if (c.values[0] === 'Any') return s !== 'None';
    return c.values.some((x) => s.toLowerCase().includes(String(x).toLowerCase()));
  }
  return c.values.some((x) => eq(x, s));
}

/**
 * Especies posibles para un cuerpo.
 * props: propiedades del cuerpo (ver bodyProps). known: { genus: [...], species: {genus: species}, allGenusKnown }.
 * Devuelve [{ genus, species, variant, name, unsure }]; «unsure» si alguna regla no se pudo comprobar
 * por falta de datos (por ejemplo, la composición de la atmósfera).
 */
function predict(props, known = {}) {
  const out = new Map();
  const knownGenus = (known.genus || []).map((g) => g.toLowerCase());
  const knownSpecies = known.species || {};
  const walk = (node, genus, species, variant, common, unsure) => {
    const cc = node.commonChildren || common;
    genus = node.genus ?? genus; species = node.species ?? species; variant = node.variant ?? variant;
    if (genus && known.allGenusKnown && knownGenus.length && !knownGenus.includes(genus.toLowerCase())) return;
    if (genus && species && knownSpecies[genus] && knownSpecies[genus] !== `${genus} ${species}`) return;
    let u = unsure;
    for (const c of node.query) {
      const r = clauseOk(c, props);
      if (r === false) return;
      if (r === null) u = true;
    }
    if (genus && species && variant != null) {
      const name = variant === '' ? species : `${genus} ${species} - ${variant}`;
      const prev = out.get(name);
      if (!prev || (prev.unsure && !u)) out.set(name, { genus, species: `${genus} ${species}`, variant, name, unsure: u });
    }
    const kids = node.useCommonChildren ? cc : node.children;
    for (const k of kids || []) walk(k, genus, species, variant, cc, u);
  };
  for (const root of criteria()) walk(root, null, null, null, null, false);
  return [...out.values()];
}

/* ---------- Datos del cuerpo ---------- */

/** Tipo de estrella simplificado como lo usan las reglas (D, W, C, M en vez de M_RedGiant…). */
function flatStar(t) {
  if (!t) return null;
  const s = String(t);
  if (/^AeBe$/i.test(s) || /herbig/i.test(s)) return 'Ae';
  if (/black ?hole/i.test(s) || s === 'SupermassiveBlackHole') return 'H';
  if (/neutron/i.test(s)) return 'N';
  if (/t ?tauri/i.test(s) || s === 'TTS') return 'TTS';
  const paren = s.match(/\((.*)\)/);
  if (paren && paren[1].length <= 3) return flatStar(paren[1]);
  if (/^[DWC]/.test(s)) return s[0];
  if (s.length > 1 && s[1] === '_') return s[0];
  if (/\s/.test(s)) return s[0]; // «K (Yellow-Orange) Star» y similares de Spansh
  return s;
}

const camel = (k) => String(k).replace(/-rich/i, 'Rich').replace(/ (\w)/g, (m, c) => c.toUpperCase());

/** Normaliza un cuerpo del diario (evento Scan) o del volcado de Spansh a un formato común. */
function normBody(b, src) {
  if (src === 'journal') {
    return {
      id: b.BodyID, name: b.BodyName, star: !!b.StarType, starType: flatStar(b.StarType), radius: b.Radius ?? null, temp: b.SurfaceTemperature ?? null,
      absMag: b.AbsoluteMagnitude ?? null, main: b.DistanceFromArrivalLS === 0 && !!b.StarType,
      parents: (b.Parents || []).map((p) => { const [k, v] = Object.entries(p)[0]; return { type: k, id: v }; }),
      planetClass: b.PlanetClass || null, landable: b.Landable ?? null,
      gravity: b.SurfaceGravity != null ? b.SurfaceGravity / 10 : null, // como SrvSurvey: m/s² / 10
      pressure: b.SurfacePressure != null ? b.SurfacePressure / 100000 : null,
      atmosphere: b.Atmosphere != null ? String(b.Atmosphere).replace(' atmosphere', '') : null,
      atmosType: b.AtmosphereType != null ? (b.AtmosphereType || 'None') : (b.Atmosphere === '' ? 'None' : null),
      atmosComp: Array.isArray(b.AtmosphereComposition) ? Object.fromEntries(b.AtmosphereComposition.map((x) => [x.Name, x.Percent])) : null,
      volcanism: b.Volcanism != null ? (b.Volcanism || 'None') : null,
      materials: Array.isArray(b.Materials) ? Object.fromEntries(b.Materials.map((x) => [String(x.Name).toLowerCase(), x.Percent])) : null,
      dist: b.DistanceFromArrivalLS ?? null, sma: b.SemiMajorAxis ?? null, // metros
    };
  }
  // Spansh (api/dump)
  const isStar = b.type === 'Star';
  let atmosType = null;
  if (!isStar) {
    if (b.atmosphereType == null || b.atmosphereType === 'No atmosphere') atmosType = 'None';
    else atmosType = String(b.atmosphereType).replace(/^Thin |^Thick /, '').replace(/-/g, ' ').replace(/ atmosphere/, '').split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
  }
  return {
    id: b.bodyId, name: b.name, star: isStar, starType: isStar ? flatStar(b.subType) : null, radius: b.solarRadius != null ? b.solarRadius * 695700000 : (b.radius != null ? b.radius * 1000 : null),
    temp: b.surfaceTemperature ?? null, absMag: b.absoluteMagnitude ?? null, main: !!b.mainStar,
    parents: (b.parents || []).map((p) => { const [k, v] = Object.entries(p)[0]; return { type: k, id: v }; }),
    planetClass: b.subType === 'Metal-rich body' ? 'Metal rich body' : (b.subType || null), landable: b.isLandable ?? null,
    gravity: b.gravity ?? null, pressure: b.surfacePressure != null ? b.surfacePressure * 101325 / 100000 : null,
    atmosphere: b.atmosphereType != null ? String(b.atmosphereType).replace(' atmosphere', '') : (isStar ? null : ''),
    atmosType,
    atmosComp: b.atmosphereComposition ? Object.fromEntries(Object.entries(b.atmosphereComposition).map(([k, v]) => [camel(k), v])) : null,
    volcanism: b.volcanismType ? (b.volcanismType === 'No volcanism' ? 'None' : b.volcanismType) : (isStar ? null : 'None'),
    materials: b.materials ? Object.fromEntries(Object.entries(b.materials).map(([k, v]) => [k.toLowerCase(), v])) : null,
    dist: b.distanceToArrival ?? null, sma: b.semiMajorAxis != null ? b.semiMajorAxis * 149597870700 : null, // Spansh: UA
  };
}

/**
 * Estrella que más ilumina al cuerpo, como hace SrvSurvey: entre todas las estrellas de su cadena de
 * padres (y las que cuelgan de sus baricentros), la de mayor (radio × temperatura² / √distancia)²,
 * con la distancia como suma de semiejes mayores hasta el padre común.
 */
function parentStars(body, all) {
  const byId = new Map(all.map((b) => [b.id, b]));
  const chain = (b) => [b.id, ...(b.parents || []).map((p) => p.id)];
  const distTo = (b, ancestor) => {
    let d = 0;
    if (b.id === ancestor) return 0;
    d += b.sma || 0;
    for (const p of b.parents || []) {
      if (p.id === ancestor) break;
      const pb = byId.get(p.id); d += (pb && pb.sma) || 0;
    }
    return d;
  };
  const cands = new Map();
  for (const p of body.parents || []) {
    if (p.type === 'Star') { const st = byId.get(p.id); if (st && st.starType) cands.set(st.id, st); }
    if (p.type === 'Null') for (const st of all) if (st.star && st.starType && (st.parents || []).some((q) => q.id === p.id)) cands.set(st.id, st);
  }
  if (!cands.size) return [];
  const bc = chain(body);
  let best = null; let bestV = -1;
  for (const st of cands.values()) {
    const sc = chain(st);
    const common = bc.find((id) => sc.includes(id));
    const d = Math.sqrt(Math.max(1, distTo(body, common) + distTo(st, common)));
    const v = ((st.radius || 0) * (st.temp || 0) ** 2 / d) ** 2;
    if (v > bestV) { bestV = v; best = st; }
  }
  return best ? [best.starType] : [];
}

let REGIONS = null;
function regionAt(pos) {
  if (!Array.isArray(pos)) return null;
  if (!REGIONS) { try { REGIONS = require('./data/regionmap.json'); } catch (e) { return null; } }
  const [x, , z] = pos;
  const px = Math.floor((x + 49985) * 83 / 4096); const pz = Math.floor((z + 24105) * 83 / 4096);
  const row = REGIONS.regionmap[pz];
  if (px < 0 || pz < 0 || !row) return null;
  let rx = 0;
  for (const [len, id] of row) { if (px < rx + len) return id || null; rx += len; }
  return null;
}
const regionName = (id) => (REGIONS && id ? REGIONS.regions[id] : null);

// Nebulosas: la lista completa la descarga app/main.js de EDAstro (como SrvSurvey); si no, la de SrvSurvey
let NEB = null;
function setNebulae(list) { if (Array.isArray(list) && list.length) NEB = list.map((v) => (v.length === 3 ? ['', ...v] : v)); }
function nebulaDist(pos) {
  if (!Array.isArray(pos)) return null;
  if (!NEB) { try { NEB = require('./data/nebulae.json').nebulae; } catch (e) { NEB = []; } }
  let min = Infinity;
  for (const [, x, y, z] of NEB) min = Math.min(min, Math.hypot(pos[0] - x, pos[1] - y, pos[2] - z));
  return Number.isFinite(min) ? min : null;
}

// Burbujas guardianas (las mismas posiciones y radios que usa SrvSurvey para los Brain Trees)
const GUARDIAN_BIG = [[1099.21875, -146.6875, -133.59375], [-840.65625, -561.15625, 13361.8125]]; // Gamma Velorum, Hen 2-333 · 750 ly
const GUARDIAN_SMALL = [[-9298.6875, -419.40625, 7911.15625], [-5479.28125, -574.84375, 10468.96875], [1228.1875, -694.5625, 12341.65625],
  [4961.1875, 158.09375, 20642.65625], [14602.75, -237.90625, 3561.875], [8649.125, -154.71875, 2686.03125]]; // 100 ly
function inGuardianBubble(pos) {
  if (!Array.isArray(pos)) return null;
  const d = (p) => Math.hypot(pos[0] - p[0], pos[1] - p[1], pos[2] - p[2]);
  return GUARDIAN_BIG.some((p) => d(p) < 750) || GUARDIAN_SMALL.some((p) => d(p) < 100);
}

/** Propiedades del cuerpo con los nombres que usan las reglas. */
function bodyProps(body, all, starPos) {
  const primary = all.find((b) => b.star && b.main) || all.find((b) => b.star && b.id === 0) || null;
  return {
    PlanetClass: body.planetClass, SurfaceGravity: body.gravity, SurfaceTemperature: body.temp, SurfacePressure: body.pressure,
    Atmosphere: body.atmosphere, AtmosphereType: body.atmosType,
    AtmosphereComposition: body.atmosComp && Object.keys(body.atmosComp).length === 1 ? { [Object.keys(body.atmosComp)[0]]: 100 } : body.atmosComp,
    DistanceFromArrivalLS: body.dist, Volcanism: body.volcanism, Materials: body.materials,
    Region: regionAt(starPos) != null ? String(regionAt(starPos)) : null,
    Star: (() => { const s = parentStars(body, all); return s.length ? s : null; })(), PrimaryStar: primary ? primary.starType : null,
    Nebulae: nebulaDist(starPos), Guardian: inGuardianBubble(starPos) == null ? null : String(inGuardianBubble(starPos)),
  };
}

module.exports = { predict, bodyProps, normBody, parseClause, flatStar, regionAt, regionName, nebulaDist, setNebulae, inGuardianBubble, criteria };
