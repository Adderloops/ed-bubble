'use strict';

/**
 * Datos calculados a partir del estado: modo de vuelo, alertas, combustible,
 * sección a la que debe ir AHORA, etc. Funciones puras (fáciles de probar).
 */

const SCOOPABLE = new Set(['K', 'G', 'B', 'F', 'O', 'A', 'M']);

// Alertas v1.0 (decididas el 2026-11-22). Umbrales: combustible < 25 %, casco < 50 %.
const FUEL_ALERT = 0.25;
const HULL_ALERT = 0.5;

// Clases del Journal: "K", "G", "M", "M_RedGiant", "K_OrangeGiant"… son recogibles;
// "DA", "N", "H", "AeBe", "TTS", "L", "T", "Y", "W", "C", "MS", "S"… no.
function isScoopable(starClass) {
  if (!starClass) return null;
  const c = String(starClass).trim();
  return SCOOPABLE.has(c.charAt(0)) && (c.length === 1 || c.charAt(1) === '_');
}

function flightMode(state) {
  const f = state.status.flags || {};
  if (f.isOnFoot && (state.status.sampler || state.bioCurrent)) return { key: 'exobio', label: 'Muestreo biológico', section: 'exobiologia' };
  if (f.isOnFoot) return { key: 'onfoot', label: 'A pie', section: 'apie' };
  if (f.isInSRV) {
    const type = (state.srv && state.srv.type) || '';
    if (/rhino/i.test(type)) return { key: 'rhino', label: 'Minando con el Rhino', section: 'mineria' };
    // la Nomad (lander) se usa para exobiología; con otro SRV, si estás muestreando o el cuerpo tiene señales biológicas
    const here = state.status.bodyName && state.bodies[state.status.bodyName];
    const bio = here && (here.signals || []).some((x) => x.key === 'biological' && x.count > 0);
    if (/lander/i.test(type) || state.bioCurrent || bio) return { key: 'exobio-srv', label: state.srv.name ? `En la ${state.srv.name}` : 'En el vehículo', section: 'exobiologia' };
    return { key: 'srv', label: 'En SRV', section: 'srv' };
  }
  if (f.isFSDJump) return { key: 'jump', label: 'Saltando', section: 'vuelo' };
  if (f.isDocked || state.location.docked) {
    // en una construcción, la sección es Colonización
    const atDepot = /construction/i.test(state.location.stationType || '') || /construction site/i.test(state.location.station || '');
    // has abierto el mercado de mercancías en este atraque: Comercio (hasta que despegues)
    const mk = state.marketOpenedAt && state.marketOpenedStation === state.location.station && (!state.dockedAt || state.marketOpenedAt >= state.dockedAt);
    if (!atDepot && mk) return { key: 'docked-market', label: 'Mercado', section: 'comercio' };
    return { key: atDepot ? 'docked-depot' : 'docked', label: 'Atracado', section: atDepot ? 'colonizacion' : 'estacion' };
  }
  // minería con la nave: hubo prospección, dron o refinado hace menos de 5 minutos
  // armamento desplegado con el HUD en modo combate (no análisis): Combate, aunque estuvieras minando
  // escáner de espectro completo (FSS) o sonda de superficie (DSS): Exploración
  if (state.status.guiFocus === 'FSS mode' || state.status.guiFocus === 'SAA mode') return { key: 'explore', label: state.status.guiFocus === 'FSS mode' ? 'Escáner FSS' : 'Cartografía DSS', section: 'exploracion' };
  if (f.areHardpointsDeployed && !f.isHUDInAnalysisMode && !f.isSupercruise && !state.docking.active) return { key: 'combat', label: 'Armamento desplegado', section: 'combate' };
  const m = state.mining;
  if (m && m.lastAt && !f.isSupercruise && Date.parse(state.status.timestamp || new Date().toISOString()) - Date.parse(m.lastAt) < 5 * 60 * 1000) return { key: 'mining', label: 'Minando', section: 'mineria' };
  // combate: en una zona de conflicto o de extracción, o te han atacado / has derribado a alguien hace poco
  if (!f.isSupercruise && !state.docking.active && !f.isLanded && !state.location.landed) {
    const cv = require('./combat').view(state, Date.parse(state.status.timestamp || '') || Date.now());
    if (cv.zone || cv.recent) return { key: 'combat', label: cv.zone ? 'En zona de combate' : 'En combate', section: 'combate' };
  }
  if (f.isLanded || state.location.landed) return { key: 'landed', label: 'Aterrizado', section: 'orbita' };
  // cerca de un planeta (vuelo orbital o planeo): coordenadas en Status.json o aproximación a un cuerpo
  if (!state.docking.active && (f.hasLatLong || (state.location.approach && !f.isSupercruise))) return { key: 'orbit', label: 'Órbita planetaria', section: 'orbita' };
  if (f.isSupercruise) return { key: 'supercruise', label: 'Supercrucero', section: 'vuelo' };
  if (state.docking.active) return { key: 'approach', label: 'Aproximación', section: 'vuelo' };
  if (f.isFSDCharging) return { key: 'charging', label: 'Cargando FSD', section: 'vuelo' };
  return { key: 'normal', label: 'Vuelo normal', section: 'vuelo' };
}

/** Ruta de neutrones: en qué punto vas (último punto de la ruta en el que has estado) y el siguiente. */
function neutronView(state) {
  const r = state.neutron;
  if (!r || !Array.isArray(r.jumps) || !r.jumps.length) return null;
  const cur = String(state.location.system || '').toLowerCase();
  let at = r.jumps.findIndex((j) => String(j.system).toLowerCase() === cur);
  if (at < 0) at = Math.max(0, Math.min(r.reached ?? 0, r.jumps.length - 1));
  const last = r.jumps[r.jumps.length - 1];
  const total = r.jumps[0].left || 0;
  const left = (r.jumps[at] || {}).left ?? total;
  return { ...r, at, here: String((r.jumps[at] || {}).system || '').toLowerCase() === cur, next: r.jumps[at + 1] || null, arrived: at >= r.jumps.length - 1 && String(last.system).toLowerCase() === cur,
    jumpsLeft: r.jumps.slice(at + 1).reduce((n, j) => n + (j.jumps || 0), 0), done: total ? Math.max(0, Math.min(1, 1 - left / total)) : 0, left };
}

function alerts(state) {
  const f = state.status.flags || {};
  const out = [];
  const fuelCap = state.ship.fuelCapacity;
  const fuel = state.status.fuelMain;
  if (f.isLowFuel || (fuelCap && fuel !== null && fuel / fuelCap < FUEL_ALERT)) out.push({ level: 'warn', text: 'Combustible bajo' });
  if (state.ship.hull !== null && state.ship.hull < HULL_ALERT) out.push({ level: 'danger', text: `Casco al ${Math.round(state.ship.hull * 100)} %` });
  if (f.isOverHeating) out.push({ level: 'danger', text: 'Sobrecalentamiento' });
  if (f.isBeingInterdicted) out.push({ level: 'danger', text: 'Interdicción en curso' });
  if (f.isInDanger) out.push({ level: 'warn', text: 'En peligro' });
  if (f.areShieldsUp === false && f.isInMainShip && !f.isDocked && !f.isLanded) out.push({ level: 'warn', text: 'Escudos caídos' });
  const lastAttack = state.log.find((l) => l.event === 'UnderAttack');
  if (lastAttack && lastAttack.at && Date.now() - Date.parse(lastAttack.at) < 20000) out.push({ level: 'danger', text: 'Bajo ataque' });
  if (state.cmdr.legalState && !['Clean', 'Allied', 'Thargoid'].includes(state.cmdr.legalState)) out.push({ level: 'warn', text: `Estado legal: ${legalLabel(state.cmdr.legalState)}` });
  const stolen = (state.cargo.inventory || []).reduce((a, i) => a + (i.stolen || 0), 0);
  if (stolen > 0) out.push({ level: 'warn', text: `Carga robada a bordo · ${stolen} t` });
  // combustible insuficiente para la ruta (sin recolector)
  const fp = require('./fuel').fuelPlan(state);
  if (fp && !fp.ok) {
    const left = fp.jumpsOk;
    out.unshift({ kind: 'fuelRoute', level: left <= 1 ? 'danger' : 'warn', text: left <= 0 ? 'Sin combustible para el siguiente salto' : `Combustible: solo ${left} salto${left === 1 ? '' : 's'} · reposta antes` });
  }
  // atraque concedido: visible desde cualquier sección
  if (state.docking && state.docking.active && state.docking.pad) out.unshift({ kind: 'dock', level: 'info', text: `Atraque · plataforma ${state.docking.pad}` });
  return out;
}

function legalLabel(s) {
  return ({ Wanted: 'buscado', IllegalCargo: 'carga ilegal', Speeding: 'exceso de velocidad', Warrant: 'orden de arresto', Hostile: 'hostil', PassengerWanted: 'pasajero buscado', Hunter: 'cazador' })[s] || s;
}

function fuel(state) {
  const cap = state.ship.fuelCapacity;
  const main = state.status.fuelMain;
  const used = state.lastJump.fuelUsed;
  // saltos que quedan a alcance máximo (el caso más exigente), con el consumo real de la nave
  const m = require('./fuel').fuelModel(state);
  const range = state.ship.maxJumpRange;
  const perMax = m && range ? m.perJump(range) : null;
  return {
    main, cap, ratio: cap && main !== null ? Math.max(0, Math.min(1, main / cap)) : null,
    reservoir: state.status.fuelReservoir, reservoirCap: state.ship.reserveCapacity,
    lastUsed: used, lastDistance: state.lastJump.distance,
    jumpsLeft: main != null && perMax ? Math.floor(main / perMax) : used && main ? Math.floor(main / used) : null,
    jumpsAtMax: !!perMax,
    scooping: !!(state.status.flags || {}).isScoopingFuel,
  };
}

function routeView(state) {
  const r = state.route || [];
  const total = r.slice(1).reduce((a, x) => a + (x.distance || 0), 0); // el primer tramo es el salto que ya hiciste
  // progreso sobre la ruta completa (tal como se trazó)
  const full = state.routeFull && state.routeFull.length ? state.routeFull : r;
  const fullDistance = full.reduce((a, x) => a + (x.distance || 0), 0);
  const doneJumps = Math.max(0, full.length - r.length);
  const doneDistance = full.slice(0, doneJumps + 1).reduce((a, x) => a + (x.distance || 0), 0);
  return {
    jumps: Math.max(0, r.length - 1), distance: total,
    destination: r.length ? r[r.length - 1].system : null,
    totalJumps: Math.max(0, full.length - 1), doneJumps, fullDistance, doneDistance,
    // todos los sistemas de la ruta trazada, con lo ya recorrido, para el gráfico
    fullLegs: full.map((x, i) => ({ system: x.system, starClass: x.starClass, distance: x.distance || 0, scoopable: isScoopable(x.starClass), done: i < doneJumps, current: i === doneJumps })),
    legs: r.map((x, i) => ({ index: i, system: x.system, systemAddress: x.systemAddress ?? null, starClass: x.starClass, distance: x.distance, scoopable: isScoopable(x.starClass), here: i === 0 && x.system === state.location.system })),
  };
}

/** Colonización: todas las construcciones vistas, con lo que falta, lo que llevas a bordo y los viajes. */
function colonisationView(state) {
  const cap = state.ship.cargoCapacity || null;
  const aboard = {};
  for (const i of (state.cargo && state.cargo.inventory) || []) aboard[i.key] = (aboard[i.key] || 0) + i.count;
  const trips = (t) => (cap && t > 0 ? Math.ceil(t / cap) : t > 0 ? null : 0);
  const depots = Object.values(state.colonisation.depots).map((d) => {
    const resources = (d.resources || []).map((r) => {
      const remaining = Math.max(0, (r.required || 0) - (r.provided || 0));
      return { ...r, remaining, ratio: r.required ? (r.provided || 0) / r.required : 1, aboard: aboard[r.key] || 0, trips: trips(remaining) };
    }).sort((a, b) => (b.remaining > 0) - (a.remaining > 0) || b.remaining - a.remaining || a.name.localeCompare(b.name));
    return { ...d, resources, trips: trips(d.remaining), done: resources.filter((r) => r.remaining === 0).length };
  }).sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  const cur = state.colonisation.depots[state.colonisation.current];
  const need = new Set(cur ? (cur.resources || []).filter((r) => (r.required || 0) > (r.provided || 0)).map((r) => r.key) : []);
  const cargo = ((state.cargo && state.cargo.inventory) || []).map((i) => ({ ...i, useful: need.has(i.key) }));
  return { depots, current: state.colonisation.current, cargo, cargoCount: (state.cargo && state.cargo.count) || 0, capacity: cap, contributions: state.colonisation.contributions || [] };
}

// Servicios de estación que se muestran (clave del Journal -> nombre), en este orden.
const SERVICES = [
  ['commodities', 'Mercado'], ['refuel', 'Repostar'], ['repair', 'Reparar'], ['rearm', 'Rearmar'],
  ['outfitting', 'Equipamiento'], ['shipyard', 'Astillero'], ['blackmarket', 'Mercado negro'], ['materialtrader', 'Comerciante mat.'],
  ['techbroker', 'Intermediario tec.'], ['engineer', 'Ingeniero'], ['exploration', 'Cartografía'], ['missions', 'Misiones'],
  ['contacts', 'Contactos'], ['searchrescue', 'Búsqueda y rescate'], ['facilitator', 'Facilitador'], ['crewlounge', 'Sala de tripulación'],
  ['powerplay', 'Powerplay'], ['registeringcolonisation', 'Colonización'], ['socialspace', 'Zona social'], ['shop', 'Pioneer Supplies'],
  ['bartender', 'Bar'], ['vistagenomics', 'Vista Genomics'], ['apexinterstellar', 'Apex Interstellar'], ['frontlinesolutions', 'Frontline Solutions'],
];

/** Estación: datos del atraque, servicios y mercado cruzado con tu carga y tu construcción. */
function stationView(state) {
  const st = state.station;
  if (!st) return null;
  const here = state.location.docked && state.location.station === st.name;
  const has = new Set(st.services);
  const services = SERVICES.map(([k, label]) => ({ key: k, label, on: has.has(k) }));
  const m = state.market && st.marketId && state.market.marketId === st.marketId ? state.market : null;
  let market = null;
  if (m) {
    const byKey = new Map(m.items.map((i) => [i.key, i]));
    const sellCargo = ((state.cargo && state.cargo.inventory) || []).map((c) => {
      const it = byKey.get(c.key);
      return { name: c.name, count: c.count, stolen: !!c.stolen, sell: it ? it.sell : 0, demand: it ? it.demand : 0, mean: it ? it.mean : 0, total: it ? it.sell * c.count : 0 };
    }).sort((a, b) => b.total - a.total);
    // obra: la actual o la última con material pendiente
    const depots = Object.values(state.colonisation.depots).filter((d) => (d.remaining || 0) > 0).sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
    const depot = state.colonisation.depots[state.colonisation.current] && state.colonisation.depots[state.colonisation.current].remaining > 0 ? state.colonisation.depots[state.colonisation.current] : depots[0];
    const forDepot = depot ? (depot.resources || []).map((r) => {
      const rem = Math.max(0, (r.required || 0) - (r.provided || 0));
      const it = byKey.get(r.key);
      return rem > 0 && it && it.stock > 0 && it.buy > 0 ? { name: r.name, remaining: rem, stock: it.stock, buy: it.buy } : null;
    }).filter(Boolean).sort((a, b) => b.remaining - a.remaining) : [];
    const bestSells = m.items.filter((i) => i.demand > 0 && i.sell > 0).sort((a, b) => b.sell - a.sell).slice(0, 8)
      .map((i) => ({ name: i.name, sell: i.sell, demand: i.demand, mean: i.mean }));
    market = { at: m.at, sellCargo, sellTotal: sellCargo.reduce((a, c) => a + c.total, 0), depotName: depot ? depot.name : null, forDepot, bestSells, count: m.items.length };
  }
  const cg = (state.communityGoals || []).filter((g) => !g.complete);
  return { ...st, here, services, market, communityGoals: cg, engineering: state.engineering };
}

/** Último corte semanal de Powerplay (jueves 07:00 UTC) antes de `now`. */
function lastWeeklyCut(now = Date.now()) {
  const d = new Date(now);
  const cut = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 7, 0, 0));
  const back = (cut.getUTCDay() - 4 + 7) % 7; // 4 = jueves
  cut.setUTCDate(cut.getUTCDate() - back);
  if (cut.getTime() > now) cut.setUTCDate(cut.getUTCDate() - 7);
  return cut.getTime();
}

/** Powerplay: piloto, sistema seguido (progreso, ciclo actual y anterior). */
function powerplayView(state, now = Date.now()) {
  const { getMeritsToNextRank, getMeritsRequiredForRank } = require('../src/services/powerplay-ranks');
  const { segmentStates } = require('../src/services/powerplay-control');
  const pp = state.powerplay;
  const pilot = { power: pp.power, rank: pp.rank, merits: pp.merits, session: state.session.merits || 0, toNext: pp.rank != null && pp.merits != null ? getMeritsToNextRank(pp.rank, pp.merits) : null, rankStart: pp.rank > 1 ? getMeritsRequiredForRank(pp.rank - 1) : 0 }; // méritos con los que empezó el rango actual
  const here = state.location.system;
  const tracked = pp.tracked || (pp.systems[here] ? here : null);
  const snaps = tracked ? pp.systems[tracked] || [] : [];
  const latest = snaps[snaps.length - 1] || null;
  const cut = lastWeeklyCut(now);
  const prev = [...snaps].reverse().find((x) => x.at && Date.parse(x.at) < cut) || null;
  const latestInCycle = latest && latest.at && Date.parse(latest.at) >= cut;
  const system = latest ? {
    name: tracked, at: latest.at, power: latest.power, ...latest.control,
    segments: segmentStates(latest.control.baseProgress, latest.control.progress),
    stale: !latestInCycle, // datos de un ciclo anterior: aún no has entrado esta semana
    previous: prev && prev !== latest ? { at: prev.at, reinforcement: prev.control.reinforcement, undermining: prev.control.undermining, net: prev.control.net, progress: prev.control.progress } : null,
  } : null;
  const canTrackHere = !!(here && (pp.systems[here] || (pp.conflicts && pp.conflicts[here])) && here !== tracked);
  // Puntos de control que aportan tus méritos: ÷ 4 (exploración ÷ 6), guía de Inara
  const cpOf = (x) => (x.kind === 'explore' ? x.merits / 6 : x.merits / 4);
  const earned = (pp.earned || []).filter((x) => x.at && Date.parse(x.at) >= cut);
  const bySys = {};
  for (const x of earned) {
    const k = x.system || '—';
    const b = bySys[k] || (bySys[k] = { system: x.system, merits: 0, cp: 0, last: x.at });
    b.merits += x.merits; b.cp += cpOf(x); if (String(x.at) > String(b.last)) b.last = x.at;
  }
  const cycle = Object.values(bySys).map((b) => ({ ...b, cp: Math.round(b.cp) })).sort((a, b) => String(b.last).localeCompare(String(a.last)));
  const live = (pp.earned || []).filter((x) => !x.hist);
  pilot.sessionCp = Math.round(live.reduce((t, x) => t + cpOf(x), 0));
  pilot.cycleMerits = earned.reduce((t, x) => t + x.merits, 0);
  pilot.cycleCp = Math.round(earned.reduce((t, x) => t + cpOf(x), 0));
  // Adquisición: el sistema seguido (o el actual) si no es de nadie y alguna potencia lo intenta
  const acqName = pp.tracked && pp.conflicts && pp.conflicts[pp.tracked] ? pp.tracked : (!system && here && pp.conflicts && pp.conflicts[here] ? here : null);
  let acquisition = null;
  if (acqName) {
    const list = pp.conflicts[acqName];
    const last = list[list.length - 1];
    const { ACQ_CAP } = require('./model');
    const CONTEST = 35000;
    const over = last.powers.filter((x) => x.cp >= CONTEST);
    const prevA = [...list].reverse().find((x) => x.at && Date.parse(x.at) < cut) || null;
    acquisition = {
      name: acqName, at: last.at, stale: !(last.at && Date.parse(last.at) >= cut), cap: ACQ_CAP, contest: CONTEST,
      powers: last.powers.map((x) => ({ ...x, mine: x.power === pp.power, toClaim: Math.max(0, ACQ_CAP - x.cp) })),
      contested: over.length >= 2, leader: last.powers[0] || null,
      mineIn: last.powers.some((x) => x.power === pp.power),
      previous: prevA && prevA !== last ? { at: prevA.at, powers: prevA.powers } : null,
    };
  }
  return { pilot, tracked: system ? tracked : (acquisition ? acquisition.name : tracked), system, acquisition, cycle, cut, nextCut: cut + 7 * 86400000, canTrackHere, here, pinned: !!pp.tracked };
}

function view(state) {
  const { padInfo } = require('./pads');
  const dockPad = state.docking && state.docking.active ? padInfo(state.docking.stationType, state.docking.pad) : null;
  // a pie: lo que falta para subir de grado el traje y las armas del equipo actual
  const { nextUpgrade } = require('./odyssey');
  const of = state.onfoot || {};
  const lo = of.loadout != null && of.loadouts ? of.loadouts[of.loadout] : null;
  const upgrades = lo ? {
    suit: nextUpgrade('suit', lo.suit.key, lo.suit.grade, of.locker),
    weapons: Object.fromEntries(lo.weapons.map((w) => [w.id, nextUpgrade('weapon', w.key, w.grade, of.locker)])),
  } : null;
  // mejoras de ingeniero posibles para el traje y cada arma, con ranuras libres e ingenieros con acceso
  const { modsFor } = require('./odymods');
  const ranks = (state.engineering && state.engineering.ranks) || {};
  const mods = lo ? {
    suit: modsFor('suit', lo.suit, of.locker, ranks),
    weapons: Object.fromEntries(lo.weapons.map((w) => [w.id, modsFor('weapon', w, of.locker, ranks)])),
  } : null;
  // ingenieros de nave y de a pie con el estado de cada uno (pantalla Ingenieros)
  const se = require('./shipengineers');
  const om = require('./odymods');
  const engineers = {
    ship: se.shipList(ranks, null),
    modules: se.moduleIndex(),
    suit: om.ENGINEERS.map((e) => ({
      name: e.name, slug: se.slug(e.name), site: e.site, system: e.system, colonia: !!e.colonia, tipo: e.tipo || null, unlock: e.unlock || null,
      status: om.access(ranks, e.name) === 'yes' ? 'unlocked' : om.access(ranks, e.name) === 'known' ? 'known' : 'none',
      suitMods: e.suit.map((id) => om.modInfo(id).es), weaponMods: e.weapon.map((id) => om.modInfo(id).es),
    })),
  };
  return {
    dockPadHour: dockPad ? dockPad.hour : null,
    upgrades,
    mods,
    engineers,
    dockPad,
    mode: flightMode(state),
    combat: require('./combat').view(state),
    exploration: require('./exploration').view(state),
    exobio: require('./exobio').view(state),
    trade: require('./trade').view(state),
    neutron: neutronView(state),
    shipLayout: state.ship && state.ship.type ? require('./builds').layout(state.ship.type, state.ship.modules) : null,
    alerts: alerts(state),
    fuel: fuel(state),
    route: routeView(state),
    scoopableHere: isScoopable(state.location.starClass),
    colonisation: state.colonisation.current ? state.colonisation.depots[state.colonisation.current] : null,
    col: colonisationView(state),
    station: stationView(state),
    powerplay: powerplayView(state),
    fuelPlan: require('./fuel').fuelPlan(state),
    surfaceNav: require('./geo').surfaceNav(state.status, state.surfaceTarget),
  };
}

module.exports = { view, colonisationView, stationView, powerplayView, lastWeeklyCut, flightMode, alerts, fuel, routeView, isScoopable, FUEL_ALERT, HULL_ALERT };
