'use strict';

/**
 * ED BUBBLE · consultas a Spansh (https://spansh.co.uk).
 *  - suggest(q): nombres de sistemas mientras se escribe.
 *  - system(name, reference): ficha completa de un sistema (estaciones,
 *    facciones, Powerplay, cuerpos) y su distancia al sistema de referencia.
 * Los resultados se guardan en memoria unos minutos para no repetir consultas.
 */

const UA = 'ED-BUBBLE (https://github.com/Adderloops/ed-bubble)';
const TIMEOUT = 15000;
const TTL = 10 * 60 * 1000;
const cache = new Map();
let fetchImpl = (...a) => fetch(...a);
/** En Electron se usa net.fetch (red de Chromium, respeta el proxy del sistema). */
function setFetch(fn) { fetchImpl = fn; }

async function getJson(url, opts = {}) {
  const res = await fetchImpl(url, { ...opts, headers: { 'User-Agent': UA, Accept: 'application/json', ...(opts.headers || {}) }, signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) throw new Error(`Spansh respondió ${res.status}`);
  return res.json();
}

function cached(key, fn) {
  const c = cache.get(key);
  if (c && Date.now() - c.at < TTL) return c.p;
  const p = fn().catch((e) => { cache.delete(key); throw e; });
  cache.set(key, { at: Date.now(), p });
  return p;
}

/** Sugerencias de nombres (máx. 8) con coordenadas. */
function suggest(q) {
  const query = String(q || '').trim();
  if (query.length < 3) return Promise.resolve([]);
  return cached(`s:${query.toLowerCase()}`, async () => {
    const d = await getJson(`https://spansh.co.uk/api/systems/field_values/system_names?q=${encodeURIComponent(query)}`);
    const list = d.min_max || (d.values || []).map((name) => ({ name }));
    return list.slice(0, 8).map((x) => ({ name: x.name, id64: x.id64 ?? null, pos: x.x != null ? [x.x, x.y, x.z] : null }));
  });
}

// Tipo de estación de Spansh -> icono, nombre y si es de superficie.
const STATION_KIND = [
  [/^stronghold carrier$/i, 'carrier', 'Portanaves bastión', false], // Powerplay (Spansh los marca como Planetary Outpost)
  [/coriolis/i, 'coriolis', 'Coriolis', false],
  [/orbis/i, 'orbis', 'Orbis', false],
  [/ocellus|bernal/i, 'ocellus', 'Ocellus', false],
  [/dodec/i, 'dodec', 'Dodec', false],
  [/asteroid/i, 'asteroid', 'Base en asteroide', false],
  [/space construction/i, 'outpost', 'Construcción orbital', false],
  [/planetary construction/i, 'surface_outpost', 'Construcción en superficie', true],
  [/mega ?ship/i, 'megaship', 'Meganave', false],
  [/carrier/i, 'carrier', 'Fleet carrier', false],
  [/planetary port/i, 'surface_port', 'Puerto planetario', true],
  [/planetary outpost/i, 'surface_outpost', 'Puesto planetario', true],
  [/settlement/i, 'settlement', 'Asentamiento', true],
  [/outpost/i, 'outpost', 'Puesto orbital', false],
];

function stationKind(type, name) {
  if (/^stronghold carrier$/i.test(String(name || ''))) type = 'Stronghold Carrier';
  const k = STATION_KIND.find(([re]) => re.test(String(type || '')));
  return k ? { icon: k[1], label: k[2], surface: k[3] } : { icon: null, label: type || 'Desconocido', surface: false };
}

/** Tamaño de plataforma más grande. Las construcciones siempre tienen L. */
function padSize(st) {
  if (/construction/i.test(st.type || '')) return 'L';
  if (st.has_large_pad || st.large_pads > 0) return 'L';
  if (st.medium_pads > 0) return 'M';
  if (st.small_pads > 0) return 'S';
  return null;
}

function normalise(r) {
  const main = (r.bodies || []).find((b) => b.is_main_star) || null;
  const starClass = main && main.subtype ? String(main.subtype).split(' ')[0] : null;
  const services = (st) => {
    const sv = Array.isArray(st.services) ? st.services : [];
    return { market: !!st.has_market, shipyard: !!st.has_shipyard, outfitting: !!st.has_outfitting, refuel: sv.includes('Refuel'), repair: sv.includes('Repair') };
  };
  const stations = (r.stations || [])
    .filter((st) => st.type || st.has_market) // sin tipo ni mercado suelen ser datos incompletos
    .map((st) => { const k = stationKind(st.type, st.name); return { name: st.name, type: st.type || null, ...k, carrier: k.icon === 'carrier', bastion: /bastión/.test(k.label), pad: k.label === 'Portanaves bastión' ? 'L' : padSize(st), distance: st.distance_to_arrival ?? null, faction: st.controlling_minor_faction || null, services: services(st) }; })
    .sort((a, b) => (a.distance ?? 1e12) - (b.distance ?? 1e12));
  const factions = (r.minor_faction_presences || [])
    .map((f) => ({ name: f.name, influence: f.influence ?? null, state: f.state || null, government: f.government || null, allegiance: f.allegiance || null, controlling: f.name === r.controlling_minor_faction }))
    .sort((a, b) => (b.influence || 0) - (a.influence || 0));
  const bodies = (r.bodies || []).map((b) => ({ name: b.name, type: b.type, subtype: b.subtype || null, distance: b.distance_to_arrival ?? null, mainStar: !!b.is_main_star }))
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  const conflict = Array.isArray(r.power_conflict_progress) ? r.power_conflict_progress.map((p) => ({ power: p.power, progress: p.progress })) : [];
  return {
    name: r.name, id64: r.id64 ?? null, pos: r.x != null ? [r.x, r.y, r.z] : null,
    distance: r.distance ?? null,
    starClass, starSubtype: main ? main.subtype : null,
    population: r.population ?? null, security: r.security || null, allegiance: r.allegiance || null, government: r.government || null,
    economy: r.primary_economy || null, secondEconomy: r.secondary_economy || null,
    controllingFaction: r.controlling_minor_faction || null, factionState: r.controlling_minor_faction_state || null,
    powers: Array.isArray(r.power) ? r.power : (r.power ? [r.power] : []), powerState: r.power_state || null, conflict,
    bodyCount: r.body_count ?? (r.bodies || []).length,
    stations, factions, bodies,
    needsPermit: !!r.needs_permit,
    updatedAt: r.updated_at || null,
  };
}

/** Ficha de un sistema por su nombre exacto. Devuelve null si Spansh no lo conoce. */
function system(name, reference) {
  const n = String(name || '').trim();
  if (!n) return Promise.resolve(null);
  return cached(`y:${n.toLowerCase()}|${reference || ''}`, async () => {
    const body = { filters: { name: { value: n } }, size: 1, page: 0 };
    if (reference) body.reference_system = reference;
    const d = await getJson('https://spansh.co.uk/api/systems/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const hit = (d.results || [])[0];
    if (!hit || String(hit.name).toLowerCase() !== n.toLowerCase()) return null;
    return normalise(hit);
  });
}

/**
 * Estaciones que venden un material, de la más cercana a la más lejana.
 * minSupply: stock mínimo; largePad: solo con plataforma L.
 */
function markets({ commodity, reference, minSupply = 1, largePad = false }) {
  const c = String(commodity || '').trim();
  if (!c || !reference) return Promise.resolve([]);
  const min = Math.max(1, Math.round(minSupply));
  return cached(`m:${c.toLowerCase()}|${reference}|${min}|${largePad}`, async () => {
    const filters = { market: [{ name: c, supply: { value: [String(min), '1000000000'], comparison: '<=>' } }] };
    if (largePad) filters.has_large_pad = { value: true };
    const d = await getJson('https://spansh.co.uk/api/stations/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters, sort: [{ distance: { direction: 'asc' } }], reference_system: reference, size: 40, page: 0 }),
    });
    return (d.results || []).map((r) => {
      const m = (r.market || []).find((x) => String(x.commodity).toLowerCase() === c.toLowerCase()) || {};
      const kind = stationKind(r.type, r.name);
      return {
        station: r.name, system: r.system_name, type: r.type || null, ...kind,
        carrier: /carrier/i.test(r.type || ''), planetary: !!r.is_planetary || kind.surface,
        distance: r.distance ?? null, ls: r.distance_to_arrival ?? null, pad: padSize(r),
        supply: m.supply ?? null, price: m.buy_price ?? null, updatedAt: r.market_updated_at || r.updated_at || null,
      };
    });
  });
}

/**
 * Datos de un cuerpo por su id64 (gravedad en g, radio en km, si se puede aterrizar).
 * El id64 de un cuerpo es SystemAddress + (BodyID << 55).
 */
function bodyId64(systemAddress, bodyId) {
  if (systemAddress == null || bodyId == null) return null;
  return (BigInt(systemAddress) + (BigInt(bodyId) << 55n)).toString();
}
/** Volcado completo de un sistema (todos sus cuerpos con sus datos físicos), para predecir exobiología. */
function dump(systemAddress) {
  if (systemAddress == null) return Promise.resolve(null);
  return cached(`d:${systemAddress}`, async () => {
    const d = await getJson(`https://spansh.co.uk/api/dump/${encodeURIComponent(String(systemAddress))}`);
    return (d && d.system) || null;
  });
}
function body(id64) {
  if (!id64) return Promise.resolve(null);
  return cached(`b:${id64}`, async () => {
    const d = await getJson(`https://spansh.co.uk/api/body/${encodeURIComponent(id64)}`);
    const r = d.record || d;
    if (!r || !r.name) return null;
    // especies conocidas con su primera posición (para fijarla como destino)
    const species = [];
    for (const l of r.landmarks || []) {
      if (!l.subtype) continue;
      const x = species.find((y) => y.species === l.subtype);
      const pt = l.latitude != null && l.longitude != null ? { lat: l.latitude, lon: l.longitude } : null;
      if (x) { x.count += 1; if (pt && x.points.length < 40) x.points.push(pt); } else species.push({ species: l.subtype, genus: l.type || null, value: l.value ?? null, count: 1, lat: l.latitude ?? null, lon: l.longitude ?? null, points: pt ? [pt] : [] });
    }
    return {
      name: r.name, gravity: r.gravity ?? null, radius: r.radius ?? null, landable: r.is_landable ?? null,
      subtype: r.subtype || null, atmosphere: r.atmosphere || null, temperature: r.surface_temperature ?? null, volcanism: r.volcanism_type || null,
      signals: (r.signals || []).map((x) => ({ name: x.name, count: x.count || 0 })),
      rings: (r.rings || []).map((g) => ({ name: g.name, type: g.type || null, signals: (g.signals || []).map((x) => ({ name: x.name, count: x.count || 0 })) })),
      species: species.sort((a, b) => (b.value || 0) - (a.value || 0)),
    };
  });
}


/**
 * Estaciones que venden un módulo (por su símbolo del juego), de la más cercana a la más lejana.
 * info: { name, cls, rating, base } de core/builds.moduleInfo. Devuelve el precio de cada
 * estación y el descuento sobre el precio normal (Powerplay, estado de la facción…).
 */
function outfitting({ item, info, reference }) {
  const sym = String(item || '').toLowerCase();
  if (!sym || !info || !reference) return Promise.resolve([]);
  return cached(`o:${sym}|${reference}`, async () => {
    const f = { name: [info.name] };
    if (info.cls != null) f.class = [String(info.cls)];
    if (info.rating) f.rating = [String(info.rating)];
    const d = await getJson('https://spansh.co.uk/api/stations/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters: { modules: [f] }, sort: [{ distance: { direction: 'asc' } }], reference_system: reference, size: 100, page: 0 }),
    });
    const out = [];
    const found = (d.results || []).map((r) => [r, (r.modules || []).find((x) => String(x.ed_symbol || '').toLowerCase() === sym)]).filter(([, m]) => m);
    // precio normal: el de los datos; si no lo hay (blindajes, módulos nuevos), el más repetido
    let base = info.base || null;
    if (!base) {
      const n = {}; for (const [, m] of found) if (m.price) n[m.price] = (n[m.price] || 0) + 1;
      const top = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
      base = top ? Number(top[0]) : null;
    }
    for (const [r, m] of found) {
      const kind = stationKind(r.type, r.name);
      const price = m.price ?? null;
      const disc = price && base ? Math.round((1 - price / base) * 100) : null;
      out.push({
        station: r.name, system: r.system_name, type: r.type || null, ...kind,
        carrier: /carrier/i.test(r.type || ''), planetary: !!r.is_planetary || kind.surface,
        distance: r.distance ?? null, ls: r.distance_to_arrival ?? null, pad: padSize(r),
        price, discount: disc != null && disc >= 1 ? disc : 0,
        power: r.system_controlling_power || null, powerState: r.system_power_state || null,
        state: r.state || null, faction: r.controlling_minor_faction || null,
        base, updatedAt: r.outfitting_updated_at || r.updated_at || null,
      });
    }
    return out;
  });
}

/**
 * Dónde vender una mercancía cerca: estaciones con demanda y precio de venta mínimo, de la más cercana a
 * la más lejana (sin portanaves). Con power, solo sistemas de refuerzo de esa potencia (méritos de Powerplay).
 */
function sellSearch({ commodity, reference, minPrice = 1, power = null, largePad = false }) {
  const c = String(commodity || '').trim();
  if (!c || !reference) return Promise.resolve([]);
  const min = Math.max(1, Math.round(minPrice));
  return cached(`s:${c.toLowerCase()}|${reference}|${min}|${power}|${largePad}`, async () => {
    const filters = { market: [{ name: c, sell_price: { value: [String(min), '999999999'], comparison: '<=>' }, demand: { value: ['1', '999999999'], comparison: '<=>' } }] };
    if (largePad) filters.has_large_pad = { value: true };
    if (power) { filters.system_controlling_power = { value: [power] }; filters.system_power_state = { value: ['Exploited', 'Fortified', 'Stronghold'] }; }
    const d = await getJson('https://spansh.co.uk/api/stations/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters, sort: [{ distance: { direction: 'asc' } }], reference_system: reference, size: 40, page: 0 }),
    });
    return (d.results || []).filter((r) => !/carrier/i.test(r.type || '')).map((r) => {
      const m = (r.market || []).find((x) => String(x.commodity).toLowerCase() === c.toLowerCase()) || {};
      const kind = stationKind(r.type, r.name);
      return { station: r.name, system: r.system_name, ...kind, distance: r.distance ?? null, ls: r.distance_to_arrival ?? null, pad: padSize(r),
        sell: m.sell_price ?? null, demand: m.demand ?? null, power: r.system_controlling_power || null, powerState: r.system_power_state || null,
        updatedAt: r.market_updated_at || r.updated_at || null };
    });
  });
}

/**
 * Ruta de comercio (planificador de Spansh) desde una estación: tramos con qué comprar, dónde venderlo y la ganancia.
 */
async function tradeRoute({ system, station, capital, cargo, range, hops = 4, largePad = false, planetary = true, maxWaitMs = 90000 }) {
  const form = new URLSearchParams({ max_hops: String(hops), max_hop_distance: String(range), starting_capital: String(Math.round(capital)), max_cargo: String(cargo),
    system, station, requires_large_pad: largePad ? '1' : '0', allow_prohibited: '0', allow_planetary: planetary ? '1' : '0', allow_player_owned: '0',
    unique: '0', permit: '0', max_price_age: String(3 * 24 * 3600), max_system_distance: '5000' });
  const start = await getJson('https://spansh.co.uk/api/trade/route', { method: 'POST', body: form.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  if (start.error) throw new Error(start.error);
  if (!start.job) throw new Error('Spansh no devolvió el trabajo');
  const t0 = Date.now();
  for (;;) {
    await new Promise((r) => setTimeout(r, 1500));
    const d = await getJson(`https://spansh.co.uk/api/results/${encodeURIComponent(start.job)}`);
    if (d.error) throw new Error(d.error);
    if (d.status === 'ok' && d.result) {
      return (d.result || []).map((h) => ({
        from: { system: h.source.system, station: h.source.station, ls: h.source.distance_to_arrival ?? null },
        to: { system: h.destination.system, station: h.destination.station, ls: h.destination.distance_to_arrival ?? null },
        distance: h.distance ?? null, profit: h.total_profit ?? null, cumulative: h.cumulative_profit ?? null,
        goods: (h.commodities || []).map((c) => ({ name: c.name, amount: c.amount, buy: c.source_commodity && c.source_commodity.buy_price, sell: c.destination_commodity && c.destination_commodity.sell_price, profit: c.total_profit })),
      }));
    }
    if (Date.now() - t0 > maxWaitMs) throw new Error('Spansh tarda demasiado en calcular la ruta');
  }
}

/** Valor base de una especie biológica («Stratum Tectonicas»): lo da cualquier cuerpo de Spansh donde se haya visto. */
function speciesValue(name) {
  const n = String(name || '').trim();
  if (!n) return Promise.resolve(null);
  return cached(`v:${n.toLowerCase()}`, async () => {
    const d = await getJson('https://spansh.co.uk/api/bodies/search', { method: 'POST', body: JSON.stringify({ filters: { landmark_subtype: { value: [n] } }, size: 1, page: 0 }), headers: { 'Content-Type': 'application/json' } });
    for (const r of d.results || []) for (const l of r.landmarks || []) if (String(l.subtype).toLowerCase() === n.toLowerCase() && l.value) return l.value;
    return null;
  });
}

/**
 * Ruta con estrellas de neutrones (Neutron Plotter de Spansh). Lanza el cálculo y espera el resultado.
 * Devuelve { from, to, range, efficiency, total, jumps: [{ system, jumps, neutron, left, dist }] }.
 */
async function neutronRoute({ from, to, range, efficiency = 60, maxWaitMs = 90000 }) {
  const form = new URLSearchParams({ efficiency: String(efficiency), range: String(range), from, to });
  const start = await getJson('https://spansh.co.uk/api/route', { method: 'POST', body: form.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  if (start.error) throw new Error(start.error);
  if (!start.job) throw new Error('Spansh no devolvió el trabajo');
  const t0 = Date.now();
  for (;;) {
    await new Promise((r) => setTimeout(r, 1500));
    const d = await getJson(`https://spansh.co.uk/api/results/${encodeURIComponent(start.job)}`);
    if (d.error) throw new Error(d.error);
    if (d.status === 'ok' && d.result) {
      const R = d.result;
      return { from: R.source_system || from, to: R.destination_system || to, range: Number(R.range) || range, efficiency, total: R.total_jumps ?? null,
        jumps: (R.system_jumps || []).map((j) => ({ system: j.system, jumps: j.jumps || 0, neutron: !!j.neutron_star, left: j.distance_left ?? null, dist: j.distance_jumped ?? null })) };
    }
    if (Date.now() - t0 > maxWaitMs) throw new Error('Spansh tarda demasiado en calcular la ruta');
  }
}

module.exports = { body, dump, neutronRoute, speciesValue, sellSearch, tradeRoute, bodyId64, markets, outfitting, setFetch, suggest, system, normalise, stationKind, padSize };
