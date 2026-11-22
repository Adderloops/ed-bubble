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
  if (f.isOnFoot) return { key: 'onfoot', label: 'A pie', section: 'apie' };
  if (f.isInSRV) return { key: 'srv', label: 'En SRV', section: 'srv' };
  if (f.isFSDJump) return { key: 'jump', label: 'Saltando', section: 'vuelo' };
  if (f.isDocked || state.location.docked) {
    // en una obra de construcción, la sección es Colonización
    const atDepot = /construction/i.test(state.location.stationType || '') || /construction site/i.test(state.location.station || '');
    return { key: atDepot ? 'docked-depot' : 'docked', label: 'Atracado', section: atDepot ? 'colonizacion' : 'estacion' };
  }
  if (f.isLanded || state.location.landed) return { key: 'landed', label: 'Aterrizado', section: 'vuelo' };
  if (f.isSupercruise) return { key: 'supercruise', label: 'Supercrucero', section: 'vuelo' };
  if (state.docking.active) return { key: 'approach', label: 'Aproximación', section: 'vuelo' };
  if (f.isFSDCharging) return { key: 'charging', label: 'Cargando FSD', section: 'vuelo' };
  return { key: 'normal', label: 'Vuelo normal', section: 'vuelo' };
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
  // atraque concedido: visible desde cualquier sección
  if (state.docking && state.docking.active && state.docking.pad) out.unshift({ level: 'info', text: `Atraque · plataforma ${state.docking.pad}` });
  return out;
}

function legalLabel(s) {
  return ({ Wanted: 'buscado', IllegalCargo: 'carga ilegal', Speeding: 'exceso de velocidad', Warrant: 'orden de arresto', Hostile: 'hostil', PassengerWanted: 'pasajero buscado', Hunter: 'cazador' })[s] || s;
}

function fuel(state) {
  const cap = state.ship.fuelCapacity;
  const main = state.status.fuelMain;
  const used = state.lastJump.fuelUsed;
  return {
    main, cap, ratio: cap && main !== null ? Math.max(0, Math.min(1, main / cap)) : null,
    reservoir: state.status.fuelReservoir, reservoirCap: state.ship.reserveCapacity,
    lastUsed: used, lastDistance: state.lastJump.distance,
    jumpsLeft: used && main ? Math.floor(main / used) : null,
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

/** Colonización: todas las obras vistas, con lo que falta, lo que llevas a bordo y los viajes. */
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

function view(state) {
  const { padHour } = require('./pads');
  return {
    dockPadHour: state.docking && state.docking.active ? padHour(state.docking.stationType, state.docking.pad) : null,
    mode: flightMode(state),
    alerts: alerts(state),
    fuel: fuel(state),
    route: routeView(state),
    scoopableHere: isScoopable(state.location.starClass),
    colonisation: state.colonisation.current ? state.colonisation.depots[state.colonisation.current] : null,
    col: colonisationView(state),
  };
}

module.exports = { view, colonisationView, flightMode, alerts, fuel, routeView, isScoopable, FUEL_ALERT, HULL_ALERT };
