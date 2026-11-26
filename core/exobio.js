'use strict';
/**
 * Exobiología sobre el terreno: distancia mínima entre muestras de cada género (dato del juego,
 * «alcance de colonia» del Códice), distancia desde tu posición a cada muestra tomada y datos para
 * el minimapa del cuerpo en el que estás.
 */

// Clave del género en el diario ($Codex_Ent_<clave>_Genus_Name;) -> nombre y distancia mínima entre muestras (m).
const GENUS = {
  Aleoids: ['Aleoida', 150], Bacterial: ['Bacterium', 500], Cactoid: ['Cactoida', 300], Clypeus: ['Clypeus', 150], Conchas: ['Concha', 150],
  Electricae: ['Electricae', 1000], Fonticulus: ['Fonticulua', 500], Shrubs: ['Frutexa', 150], Fumerolas: ['Fumerola', 100], Fungoids: ['Fungoida', 300],
  Osseus: ['Osseus', 800], Recepta: ['Recepta', 150], Stratum: ['Stratum', 500], Tubus: ['Tubus', 800], Tussocks: ['Tussock', 200],
  Vents: ['Amphora Plant', 100], Sphere: ['Anemone', 100], Cone: ['Bark Mounds', 100], Brancae: ['Brain Trees', 100], Ground_Struct_Ice: ['Crystalline Shards', 100], Tubers: ['Sinuous Tubers', 100],
};
const genusId = (key) => String(key || '').replace(/^\$Codex_Ent_|_Genus_Name;$|_Name;$/g, '');
const genusInfo = (key) => GENUS[genusId(key)] || null;
/** Distancia mínima entre muestras (m) por clave del diario o por nombre del género. */
function colonyRange(keyOrName) {
  const g = genusInfo(keyOrName);
  if (g) return g[1];
  const n = String(keyOrName || '').toLowerCase();
  const hit = Object.values(GENUS).find(([name]) => n.startsWith(name.toLowerCase().split(' ')[0]));
  return hit ? hit[1] : null;
}

const rad = (d) => (d * Math.PI) / 180;
function dist(a, b, R) {
  const p1 = rad(a.lat); const p2 = rad(b.lat);
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Id del cuerpo en el que estás (por nombre en Status.json). */
function currentBodyId(state) {
  const name = state.status.bodyName;
  if (!name) return state.bioCurrent ? state.bioCurrent.body : null;
  const jb = state.bodies[name];
  if (jb && jb.id != null) return jb.id;
  const xb = Object.values((state.exploration || {}).bodies || {}).find((b) => b.name === name);
  if (xb) return xb.id;
  return state.bioCurrent && state.bioCurrent.bodyName === name ? state.bioCurrent.body : null;
}

function view(state) {
  const S = state.status;
  const R = S.planetRadius || null;
  const pos = S.latitude != null && S.longitude != null ? { lat: S.latitude, lon: S.longitude, heading: S.heading ?? null } : null;
  const bodyId = currentBodyId(state);
  const onBody = bodyId != null ? state.bio[bodyId] || {} : {};
  const species = Object.values(onBody).map((x) => {
    const range = colonyRange(x.genusKey || x.genus);
    const points = (x.samples || []).map((p) => ({ ...p, dist: pos && R ? dist(pos, p, R) : null }));
    return { genusKey: x.genusKey || null, genus: x.genus, species: x.species, variant: x.variant, step: x.step, done: x.step >= 3, range, points, at: x.at };
  });
  const cur = state.bioCurrent && state.bioCurrent.body === bodyId ? species.find((x) => x.genusKey === state.bioCurrent.genus && !x.done) || null : null;
  let current = null;
  if (cur) {
    const ds = cur.points.map((p) => p.dist).filter((d) => d != null);
    const nearest = ds.length ? Math.min(...ds) : null;
    current = { ...cur, nearest, ok: nearest != null && cur.range != null ? nearest >= cur.range : null, need: nearest != null && cur.range != null ? Math.max(0, cur.range - nearest) : null };
  }
  return { bodyId, bodyName: S.bodyName || null, radius: R, pos, species, current, onFoot: !!(S.flags && S.flags.isOnFoot) };
}

module.exports = { view, colonyRange, genusInfo, genusId, GENUS, dist };
