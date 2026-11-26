'use strict';
/**
 * Exploración: cuerpos del sistema actual (escaneo FSS, cartografía DSS, descubrimientos) y datos
 * sin vender (cartografía y exobiología) desde la última venta.
 *
 * Los valores son estimaciones con la fórmula conocida de la comunidad para el pago de datos de
 * exploración en Odyssey (constantes de cada tipo de cuerpo, masa, primer descubrimiento y
 * cartografía). El juego añade además bonos por sistema completo que aquí no se cuentan.
 * El valor de cada especie biológica solo se sabe si Spansh lo da o si ya la vendiste antes.
 */

const create = () => ({
  system: { address: null, name: null, bodyCount: null, nonBodyCount: null, progress: null, honked: false, allFound: false },
  bodies: {}, // { bodyId: cuerpo }
  unsold: { carto: {}, bio: [] }, // carto: { systemAddress: { name, at, bodies: { bodyId: cuerpo } } }
  lastSale: null, // { at, kind: 'carto'|'bio', total }
  bioValues: {}, // valor base por especie (clave interna del juego, p. ej. $Codex_Ent_Stratum_07_Name;)
  bioValuesChanged: 0,
  spansh: null, // { address, bodies|null, error } volcado de Spansh del sistema actual
});

/* ---------- tipos de cuerpo ---------- */

// Clase de planeta del diario -> nombre de Spansh (el que usa la interfaz para traducir).
const PLANET_CLASS = {
  'earthlike body': 'Earth-like world', 'water world': 'Water world', 'ammonia world': 'Ammonia world',
  'metal rich body': 'Metal-rich body', 'high metal content body': 'High metal content world', 'rocky body': 'Rocky body',
  'icy body': 'Icy body', 'rocky ice body': 'Rocky Ice world', 'water giant': 'Water giant', 'helium rich gas giant': 'Helium-rich gas giant',
  'gas giant with water based life': 'Gas giant with water-based life', 'gas giant with ammonia based life': 'Gas giant with ammonia-based life',
  'sudarsky class i gas giant': 'Class I gas giant', 'sudarsky class ii gas giant': 'Class II gas giant', 'sudarsky class iii gas giant': 'Class III gas giant',
  'sudarsky class iv gas giant': 'Class IV gas giant', 'sudarsky class v gas giant': 'Class V gas giant', 'helium gas giant': 'Helium gas giant',
};
const planetClass = (c) => (c ? PLANET_CLASS[String(c).toLowerCase()] || c : null);
const normCls = (c) => String(c || '').toLowerCase().replace(/[^a-z]/g, '');

/** Tipo de estrella para el valor: 'wd', 'ns', 'bh', 'smbh' o 'star'. Acepta el código del diario o el subtipo de Spansh. */
function starKind(t) {
  const s = String(t || '');
  if (/^D/.test(s) || /white dwarf/i.test(s)) return 'wd';
  if (s === 'N' || /neutron/i.test(s)) return 'ns';
  if (/supermassive/i.test(s)) return 'smbh';
  if (s === 'H' || /black hole/i.test(s)) return 'bh';
  return 'star';
}
const isTerraformable = (t) => !!t && !/^not|^$/i.test(String(t)) && !/terraformed/i.test(String(t));

/* ---------- valor estimado ---------- */

function planetK(cls, terra) {
  switch (normCls(cls)) {
    case 'metalrichbody': return 21790;
    case 'ammoniaworld': return 96932;
    case 'classigasgiant': return 1656;
    case 'highmetalcontentworld': return 9654 + (terra ? 100677 : 0);
    case 'classiigasgiant': return 9654;
    case 'earthlikeworld': return 64831 + 116295;
    case 'waterworld': return 64831 + (terra ? 116295 : 0);
    default: return 300 + (terra ? 93328 : 0);
  }
}

/**
 * Valor de un planeta. first: primer descubrimiento; mapped: cartografiado; firstMapped: el primero en
 * cartografiarlo; efficient: con el número de sondas objetivo o menos.
 */
function planetValue({ cls, terra, mass, first, mapped, firstMapped, efficient }) {
  const q = 0.56591828;
  const k = planetK(cls, terra);
  let mult = 1;
  if (mapped) mult = first && firstMapped ? 3.699622554 : firstMapped ? 8.0956 : 10 / 3;
  let v = (k + k * q * Math.pow(Math.max(mass || 0, 0), 0.2)) * mult;
  if (mapped) { v += Math.max(v * 0.3, 555); if (efficient) v *= 1.25; }
  v = Math.max(500, v);
  if (first) v *= 2.6;
  return Math.round(v);
}

function starValue({ type, mass, first }) {
  const k = { wd: 14057, ns: 22628, bh: 22628, smbh: 33.5678 }[starKind(type)] || 1200;
  let v = k + ((mass || 0) * k) / 66.25;
  if (first) v *= 2.6;
  return Math.round(v);
}

/** Valores de un cuerpo: lo que vale ahora, y lo que valdría cartografiado (solo planetas). */
function bodyValues(b) {
  if (b.kind === 'star') { const v = starValue({ type: b.starType, mass: b.mass, first: b.first }); return { now: v, scan: v, mapped: null }; }
  if (b.kind !== 'planet') return { now: 0, scan: 0, mapped: null };
  const base = { cls: b.cls, terra: b.terra, mass: b.mass, first: b.first };
  const scan = planetValue(base);
  const mapped = planetValue({ ...base, mapped: true, firstMapped: b.firstMapped ?? !b.wasMapped, efficient: b.mapped ? !!b.efficient : true });
  return { now: b.mapped ? mapped : scan, scan, mapped };
}

/* ---------- eventos ---------- */

function setSystem(X, address, name) {
  if (address == null || X.system.address === address) { if (name) X.system.name = name; return; }
  X.system = { address, name: name || null, bodyCount: null, nonBodyCount: null, progress: null, honked: false, allFound: false };
  X.bodies = {};
  // si vuelves a un sistema que escaneaste y aún no has vendido, sus cuerpos siguen contando como escaneados
  const prev = X.unsold.carto[address];
  if (prev) for (const [id, b] of Object.entries(prev.bodies)) X.bodies[id] = { ...bodyOf(X, Number(id), b.name), ...b, id: Number(id), scanned: true };
}

function bodyOf(X, id, name) {
  const b = X.bodies[id] || (X.bodies[id] = { id, name: name || null, kind: null, cls: null, starType: null, mass: null, terra: false, landable: false, distLs: null,
    scanned: false, first: false, wasDiscovered: null, wasMapped: null, wasFootfalled: null, mapped: false, efficient: false, firstMapped: null, bio: 0, geo: 0 });
  if (name) b.name = name;
  return b;
}

function addUnsoldCarto(X, sysAddr, sysName, b, at) {
  if (sysAddr == null) return;
  const s = X.unsold.carto[sysAddr] || (X.unsold.carto[sysAddr] = { name: sysName || null, at: at || null, bodies: {} });
  if (sysName) s.name = sysName;
  s.bodies[b.id] = { name: b.name, kind: b.kind, cls: b.cls, starType: b.starType, mass: b.mass, terra: b.terra, first: b.first, wasDiscovered: b.wasDiscovered, wasMapped: b.wasMapped,
    mapped: b.mapped, efficient: b.efficient, firstMapped: b.firstMapped, distLs: b.distLs, landable: b.landable };
}

const signalCount = (signals, re) => (signals || []).filter((s) => re.test(s.Type || '')).reduce((n, s) => n + (s.Count || 0), 0);

/** Aplica un evento del diario. Devuelve true si cambió algo. */
function apply(state, e) {
  const X = state.exploration;
  switch (e.event) {
    case 'Location': case 'FSDJump': case 'CarrierJump':
      setSystem(X, e.SystemAddress, e.StarSystem); return true;
    case 'FSSDiscoveryScan':
      setSystem(X, e.SystemAddress, e.SystemName);
      Object.assign(X.system, { bodyCount: e.BodyCount ?? null, nonBodyCount: e.NonBodyCount ?? null, progress: e.Progress ?? null, honked: true });
      return true;
    case 'FSSAllBodiesFound':
      setSystem(X, e.SystemAddress, e.SystemName); X.system.allFound = true; if (e.Count != null) X.system.bodyCount = e.Count; return true;
    case 'Scan': {
      if (e.BodyID == null || !e.BodyName || /belt cluster/i.test(e.BodyName)) return false;
      if (e.SystemAddress != null) setSystem(X, e.SystemAddress, e.StarSystem || null);
      const b = bodyOf(X, e.BodyID, e.BodyName);
      b.scanned = true;
      b.kind = e.StarType ? 'star' : e.PlanetClass ? 'planet' : 'other';
      b.starType = e.StarType || null;
      b.cls = e.PlanetClass ? planetClass(e.PlanetClass) : null;
      b.mass = e.StarType ? (e.StellarMass ?? null) : (e.MassEM ?? null);
      b.terra = isTerraformable(e.TerraformState);
      b.landable = !!e.Landable;
      b.distLs = e.DistanceFromArrivalLS ?? null;
      if (e.WasDiscovered !== undefined) { b.wasDiscovered = !!e.WasDiscovered; b.first = !e.WasDiscovered; }
      if (e.WasMapped !== undefined) b.wasMapped = !!e.WasMapped;
      if (e.WasFootfalled !== undefined) b.wasFootfalled = !!e.WasFootfalled;
      if (e.ScanType !== 'NavBeaconDetail') addUnsoldCarto(X, e.SystemAddress ?? X.system.address, X.system.name, b, e.timestamp);
      return true;
    }
    case 'SAAScanComplete': {
      if (e.BodyID == null) return false;
      const b = bodyOf(X, e.BodyID, e.BodyName);
      b.mapped = true;
      b.efficient = e.ProbesUsed != null && e.EfficiencyTarget != null && e.ProbesUsed <= e.EfficiencyTarget;
      b.firstMapped = b.wasMapped === false;
      if (b.scanned) addUnsoldCarto(X, e.SystemAddress ?? X.system.address, X.system.name, b, e.timestamp);
      return true;
    }
    case 'FSSBodySignals': case 'SAASignalsFound': {
      if (e.BodyID == null) return false;
      const b = bodyOf(X, e.BodyID, e.BodyName);
      b.bio = signalCount(e.Signals, /Biological/i) || b.bio;
      b.geo = signalCount(e.Signals, /Geological/i) || b.geo;
      if (Array.isArray(e.Genuses) && e.Genuses.length) b.genuses = e.Genuses.map((g) => ({ key: g.Genus, name: g.Genus_Localised || null }));
      return true;
    }
    case 'ScanOrganic': {
      if (e.ScanType !== 'Analyse') return false;
      X.unsold.bio.push({ species: e.Species || null, name: e.Species_Localised || e.Species || e.Genus_Localised || '', genus: e.Genus_Localised || e.Genus || null,
        variant: e.Variant_Localised || null, system: e.SystemAddress ?? X.system.address, systemName: X.system.address === e.SystemAddress ? X.system.name : null,
        body: e.Body ?? null, bodyName: (X.bodies[e.Body] || {}).name || null, at: e.timestamp || null });
      return true;
    }
    case 'SellOrganicData': {
      let total = 0;
      for (const d of e.BioData || []) {
        total += (d.Value || 0) + (d.Bonus || 0);
        if (d.Value) learnBioValues(state, { [d.Species]: d.Value, [nameKey(d.Species_Localised)]: d.Value });
        const i = X.unsold.bio.findIndex((x) => x.species === d.Species);
        if (i >= 0) X.unsold.bio.splice(i, 1);
      }
      X.lastSale = { at: e.timestamp || null, kind: 'bio', total };
      return true;
    }
    case 'SellExplorationData': case 'MultiSellExplorationData': {
      const names = new Set([...(e.Systems || []), ...(e.Discovered || []).map((d) => (typeof d === 'string' ? d : d.SystemName))].filter(Boolean).map((n) => n.toLowerCase()));
      for (const [k, s] of Object.entries(X.unsold.carto)) if (s.name && names.has(s.name.toLowerCase())) delete X.unsold.carto[k];
      X.lastSale = { at: e.timestamp || null, kind: 'carto', total: e.TotalEarnings ?? null };
      return true;
    }
    case 'Died':
      X.unsold = { carto: {}, bio: [] }; return true;
    default: return false;
  }
}

/** Clave por nombre de especie (en latín, igual en todos los idiomas del juego). */
const nameKey = (n) => (n ? `n:${String(n).trim().toLowerCase()}` : '');

/** Añade valores de especies (por clave interna o por nombre con nameKey) aprendidos de ventas, Spansh o el archivo guardado. */
function learnBioValues(state, map) {
  const X = state.exploration;
  let n = 0;
  for (const [k, v] of Object.entries(map || {})) if (k && v > 0 && X.bioValues[k] !== v) { X.bioValues[k] = v; n += 1; }
  X.bioValuesChanged += n;
  return n;
}

/* ---------- vista ---------- */

/** Cuerpo de Spansh (volcado del sistema) en el mismo formato que los del diario. */
function fromSpansh(sb) {
  const star = sb.type === 'Star';
  const sig = (sb.signals && sb.signals.signals) || {};
  const count = (re) => Object.entries(sig).filter(([k]) => re.test(k)).reduce((n, [, v]) => n + (v || 0), 0);
  return { id: sb.bodyId, name: sb.name, kind: star ? 'star' : sb.type === 'Planet' ? 'planet' : 'other', cls: star ? null : sb.subType || null, starType: star ? sb.subType || null : null,
    mass: star ? sb.solarMasses ?? null : sb.earthMasses ?? null, terra: isTerraformable(sb.terraformingState), landable: !!sb.isLandable, distLs: sb.distanceToArrival ?? null,
    bio: count(/Biological/i), geo: count(/Geological/i), genuses: ((sb.signals && sb.signals.genuses) || []).map((k) => ({ key: k })) };
}

/**
 * Vista del sistema actual y de los datos sin vender. spanshBodies: cuerpos del volcado de Spansh del
 * sistema actual (o null si no se han pedido), para mostrar también los que aún no has escaneado.
 */
function view(state, spanshBodies) {
  const X = state.exploration;
  const sp = X.spansh && X.spansh.address === X.system.address ? X.spansh : null;
  if (spanshBodies === undefined) spanshBodies = sp ? sp.bodies : null;
  const byId = new Map();
  for (const sb of spanshBodies || []) if (sb.bodyId != null && /^(Star|Planet)$/.test(sb.type)) byId.set(sb.bodyId, { ...fromSpansh(sb), scanned: false, inSpansh: true });
  for (const b of Object.values(X.bodies)) {
    if (!b.kind && !byId.has(b.id)) continue; // solo señales, sin escaneo
    const prev = byId.get(b.id) || {};
    byId.set(b.id, { ...prev, ...Object.fromEntries(Object.entries(b).filter(([, v]) => v !== null && v !== undefined)), inSpansh: !!prev.inSpansh,
      bio: b.bio || prev.bio || 0, geo: b.geo || prev.geo || 0, kind: b.kind || prev.kind, cls: b.cls || prev.cls, mass: b.mass ?? prev.mass, distLs: b.distLs ?? prev.distLs });
  }
  const bodies = [...byId.values()].map((b) => {
    const v = bodyValues(b);
    return { ...b, value: v.now, valueScan: v.scan, valueMapped: v.mapped, interest: b.kind === 'planet' && v.mapped >= 300000, mapLeft: b.kind === 'planet' && !b.mapped && v.mapped >= 300000 };
  }).sort((a, b) => (a.distLs ?? 1e12) - (b.distLs ?? 1e12) || a.id - b.id);
  const scanned = bodies.filter((b) => b.scanned);
  const total = X.system.bodyCount ?? (spanshBodies ? bodies.length : null);

  // datos sin vender
  const systems = Object.entries(X.unsold.carto).map(([addr, s]) => {
    const list = Object.values(s.bodies);
    const value = list.reduce((n, b) => n + bodyValues(b).now, 0);
    return { address: addr, name: s.name, at: s.at, bodies: list.length, first: list.filter((b) => b.first).length, mapped: list.filter((b) => b.mapped).length, value };
  }).sort((a, b) => b.value - a.value);
  const bio = X.unsold.bio.map((x) => ({ ...x, value: X.bioValues[x.species] ?? X.bioValues[nameKey(x.name)] ?? null })).sort((a, b) => (b.value || 0) - (a.value || 0));
  const since = [...systems.map((s) => s.at), ...bio.map((x) => x.at)].filter(Boolean).sort()[0] || null;
  return {
    system: { ...X.system, total, found: total != null ? Math.min(scanned.length, total) : scanned.length, scanned: scanned.length,
      value: scanned.reduce((n, b) => n + b.value, 0), mapLeft: bodies.filter((b) => b.mapLeft).length,
      mapGain: bodies.filter((b) => b.scanned && b.kind === 'planet' && !b.mapped && b.interest).reduce((n, b) => n + (b.valueMapped - b.valueScan), 0) },
    bodies,
    unsold: {
      since,
      carto: { systems, value: systems.reduce((n, s) => n + s.value, 0), bodies: systems.reduce((n, s) => n + s.bodies, 0), first: systems.reduce((n, s) => n + s.first, 0), mapped: systems.reduce((n, s) => n + s.mapped, 0) },
      bio: { list: bio, value: bio.reduce((n, x) => n + (x.value || 0), 0), unknown: bio.filter((x) => x.value == null).length },
    },
    lastSale: X.lastSale,
    spansh: sp ? (sp.error ? 'error' : sp.bodies ? 'ok' : 'missing') : 'pending',
  };
}

module.exports = { create, apply, view, learnBioValues, nameKey, bodyValues, planetValue, starValue, planetClass, starKind, fromSpansh };
