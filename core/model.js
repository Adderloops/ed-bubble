'use strict';

/**
 * Modelo de estado de ED BUBBLE: un único objeto con todo lo que muestran
 * las pantallas. Se rellena a partir de los eventos del Journal (applyEvent)
 * y de los ficheros JSON que el juego reescribe (applyStatus, applyCargo,
 * applyNavRoute). No sabe nada de Electron ni de Touch Portal.
 */

const { computeControl } = require('../src/services/powerplay-control');

const MAX_LOG = 40;

function createState() {
  return {
    updatedAt: null,
    connection: { journal: false, journalFile: null, lastEventAt: null, status: false },
    cmdr: { name: null, credits: null, legalState: 'Clean' },
    ship: { type: null, typeLocalised: null, name: null, ident: null, maxJumpRange: null, fuelCapacity: null, reserveCapacity: null, cargoCapacity: null, hull: null, rebuy: null },
    location: {
      system: null, body: null, bodyType: null, station: null, stationType: null, docked: false, landed: false,
      starClass: null, allegiance: null, economy: null, secondEconomy: null, government: null, security: null, population: null,
      faction: null, factionState: null, powerplayState: null, controllingPower: null, systemAddress: null,
    },
    destination: { name: null, body: null, system: null },
    status: {
      flags: {}, pips: null, fireGroup: null, guiFocus: null,
      fuelMain: null, fuelReservoir: null, cargo: null, balance: null,
      latitude: null, longitude: null, altitude: null, heading: null, bodyName: null, planetRadius: null, gravity: null,
    },
    fsdTarget: { name: null, starClass: null, remainingJumps: null },
    route: [],
    lastJump: { distance: null, fuelUsed: null, at: null },
    docking: { active: false, pad: null, station: null, stationType: null, at: null },
    powerplay: { power: null, rank: null, merits: null, system: null, control: null, controlAt: null },
    colonisation: { depots: {}, current: null },
    cargo: { count: 0, vessel: 'Ship', inventory: [] },
    session: { startedAt: null, jumps: 0, distance: 0, merits: 0, bounties: 0, mined: 0, deliveredToConstruction: 0 },
    log: [],
  };
}

/* ---------- utilidades ---------- */

const loc = (e, key) => e[`${key}_Localised`] || e[key] || null;

function pushLog(state, e, title, detail, level) {
  state.log.unshift({ at: e.timestamp || null, event: e.event, title, detail: detail || '', level: level || 'info' });
  if (state.log.length > MAX_LOG) state.log.length = MAX_LOG;
}

function setSystemInfo(state, e) {
  const L = state.location;
  if (e.StarSystem) L.system = e.StarSystem;
  if (e.SystemAddress !== undefined) L.systemAddress = e.SystemAddress;
  if (e.SystemAllegiance !== undefined) L.allegiance = e.SystemAllegiance || null;
  if (e.SystemEconomy !== undefined) L.economy = loc(e, 'SystemEconomy');
  if (e.SystemSecondEconomy !== undefined) L.secondEconomy = loc(e, 'SystemSecondEconomy');
  if (e.SystemGovernment !== undefined) L.government = loc(e, 'SystemGovernment');
  if (e.SystemSecurity !== undefined) L.security = loc(e, 'SystemSecurity');
  if (e.Population !== undefined) L.population = e.Population;
  if (e.SystemFaction) { L.faction = e.SystemFaction.Name || null; L.factionState = e.SystemFaction.FactionState || null; }
  L.powerplayState = e.PowerplayState || null;
  L.controllingPower = e.ControllingPower || null;
  if (e.Body !== undefined) { L.body = e.Body; L.bodyType = e.BodyType || null; }

  const control = computeControl(e);
  if (e.PowerplayState || e.ControllingPower) {
    state.powerplay.system = e.StarSystem || L.system;
    state.powerplay.control = control;
    state.powerplay.controlAt = e.timestamp || null;
  }
}

function clearDocking(state) {
  state.docking = { active: false, pad: null, station: null, stationType: null, at: null };
}

/* ---------- eventos del Journal ---------- */

const HANDLERS = {
  Fileheader(state, e) {
    state.session.startedAt = e.timestamp || state.session.startedAt;
  },
  Commander(state, e) { state.cmdr.name = e.Name || state.cmdr.name; },
  LoadGame(state, e) {
    state.cmdr.name = e.Commander || state.cmdr.name;
    if (e.Credits !== undefined) state.cmdr.credits = e.Credits;
    if (e.Ship && e.Ship !== state.ship.type) state.ship.typeLocalised = e.Ship_Localised || null;
    state.ship.type = e.Ship || state.ship.type;
    state.ship.name = e.ShipName || state.ship.name;
    state.ship.ident = e.ShipIdent || state.ship.ident;
    state.session.startedAt = e.timestamp || state.session.startedAt;
  },
  Loadout(state, e) {
    const S = state.ship;
    if (e.Ship && e.Ship !== S.type) S.typeLocalised = e.Ship_Localised || null;
    S.type = e.Ship || S.type;
    S.name = e.ShipName || S.name;
    S.ident = e.ShipIdent || S.ident;
    if (e.MaxJumpRange !== undefined) S.maxJumpRange = e.MaxJumpRange;
    if (e.FuelCapacity) { S.fuelCapacity = e.FuelCapacity.Main; S.reserveCapacity = e.FuelCapacity.Reserve; }
    if (e.CargoCapacity !== undefined) S.cargoCapacity = e.CargoCapacity;
    if (e.HullHealth !== undefined) S.hull = e.HullHealth;
    if (e.Rebuy !== undefined) S.rebuy = e.Rebuy;
  },
  Location(state, e) {
    setSystemInfo(state, e);
    state.location.docked = !!e.Docked;
    state.location.station = e.Docked ? (e.StationName || null) : null;
    state.location.stationType = e.Docked ? (e.StationType || null) : null;
    pushLog(state, e, 'Posición', e.Docked ? `${e.StationName} · ${e.StarSystem}` : e.StarSystem);
  },
  FSDJump(state, e) {
    setSystemInfo(state, e);
    state.location.docked = false; state.location.station = null; state.location.stationType = null;
    state.location.landed = false;
    state.lastJump = { distance: e.JumpDist ?? null, fuelUsed: e.FuelUsed ?? null, at: e.timestamp || null };
    if (e.StarClass) state.location.starClass = e.StarClass;
    state.session.jumps += 1;
    state.session.distance += Number(e.JumpDist) || 0;
    if (state.fsdTarget.name === e.StarSystem) {
      state.location.starClass = state.fsdTarget.starClass || state.location.starClass;
      state.fsdTarget = { name: null, starClass: null, remainingJumps: null };
    }
    // al llegar, se quita el sistema de la ruta
    const i = state.route.findIndex((r) => r.system === e.StarSystem);
    if (i >= 0) state.route = state.route.slice(i);
    clearDocking(state);
    pushLog(state, e, 'Salto FSD', `${e.StarSystem} · ${fmtNum(e.JumpDist, 2)} al`);
  },
  CarrierJump(state, e) { setSystemInfo(state, e); pushLog(state, e, 'Salto del carrier', e.StarSystem); },
  FSDTarget(state, e) {
    state.fsdTarget = { name: e.Name || null, starClass: e.StarClass || null, remainingJumps: e.RemainingJumpsInRoute ?? null };
  },
  StartJump(state, e) {
    if (e.JumpType === 'Hyperspace' && e.StarClass && e.StarSystem) {
      state.fsdTarget.starClass = e.StarClass;
      state.location.starClass = null;
      state._pendingStarClass = e.StarClass;
    }
  },
  SupercruiseEntry(state, e) { state.location.body = null; pushLog(state, e, 'Supercrucero', 'Entrada'); },
  SupercruiseExit(state, e) {
    if (e.Body) { state.location.body = e.Body; state.location.bodyType = e.BodyType || null; }
    pushLog(state, e, 'Supercrucero', `Salida · ${e.Body || ''}`);
  },
  ApproachBody(state, e) { pushLog(state, e, 'Aproximación', e.Body); },
  LeaveBody(state, e) { pushLog(state, e, 'Alejándose', e.Body); },
  DockingRequested(state, e) { pushLog(state, e, 'Atraque solicitado', e.StationName); },
  DockingGranted(state, e) {
    state.docking = { active: true, pad: e.LandingPad ?? null, station: e.StationName || null, stationType: e.StationType || null, at: e.timestamp || null };
    pushLog(state, e, 'Atraque concedido', `${e.StationName} · plataforma ${e.LandingPad}`);
  },
  DockingDenied(state, e) { clearDocking(state); pushLog(state, e, 'Atraque denegado', `${e.StationName} · ${e.Reason || ''}`, 'warn'); },
  DockingCancelled(state, e) { clearDocking(state); pushLog(state, e, 'Atraque cancelado', e.StationName); },
  DockingTimeout(state, e) { clearDocking(state); pushLog(state, e, 'Atraque caducado', e.StationName, 'warn'); },
  Docked(state, e) {
    clearDocking(state);
    state.location.docked = true;
    state.location.station = e.StationName || null;
    state.location.stationType = e.StationType || null;
    if (e.StarSystem) state.location.system = e.StarSystem;
    pushLog(state, e, 'Atracado', e.StationName);
  },
  Undocked(state, e) {
    state.location.docked = false; state.location.station = null; state.location.stationType = null;
    pushLog(state, e, 'Despegue', e.StationName);
  },
  Touchdown(state, e) { state.location.landed = true; pushLog(state, e, 'Aterrizaje', e.Body || ''); },
  Liftoff(state, e) { state.location.landed = false; pushLog(state, e, 'Despegue', e.Body || ''); },
  FuelScoop(state, e) { pushLog(state, e, 'Recogida de combustible', `${fmtNum(e.Scooped, 1)} t`); },
  RefuelAll(state, e) { pushLog(state, e, 'Repostaje', `${fmtNum(e.Amount, 1)} t`); },
  Interdicted(state, e) { pushLog(state, e, 'Interdicción', e.Submitted ? 'Sometido' : (e.Interdictor || ''), 'warn'); },
  EscapeInterdiction(state, e) { pushLog(state, e, 'Interdicción', 'Evadida', 'warn'); },
  UnderAttack(state, e) { pushLog(state, e, 'Bajo ataque', e.Target || '', 'danger'); },
  HullDamage(state, e) { if (e.PlayerPilot !== false && e.Health !== undefined) state.ship.hull = e.Health; },
  RepairAll(state) { state.ship.hull = 1; },
  Died(state, e) { clearDocking(state); pushLog(state, e, 'Nave destruida', e.KillerName || '', 'danger'); },
  NavRoute() { /* el contenido real está en NavRoute.json */ },
  NavRouteClear(state, e) { state.route = []; pushLog(state, e, 'Ruta borrada', ''); },
  Powerplay(state, e) { state.powerplay.power = e.Power || null; state.powerplay.rank = e.Rank ?? null; state.powerplay.merits = e.Merits ?? null; },
  PowerplayMerits(state, e) {
    state.powerplay.merits = e.TotalMerits ?? state.powerplay.merits;
    state.session.merits += Number(e.MeritsGained) || 0;
  },
  PowerplayRank(state, e) { state.powerplay.rank = e.Rank ?? state.powerplay.rank; },
  Bounty(state, e) { state.session.bounties += Number(e.TotalReward || e.Reward) || 0; },
  MiningRefined(state, e) { state.session.mined += 1; },
  ColonisationConstructionDepot(state, e) {
    const id = String(e.MarketID);
    const prev = state.colonisation.depots[id] || {};
    const req = (e.ResourcesRequired || []).map((r) => ({
      name: r.Name_Localised || r.Name, required: r.RequiredAmount, provided: r.ProvidedAmount, payment: r.Payment,
    }));
    const required = req.reduce((a, r) => a + (r.required || 0), 0);
    const provided = req.reduce((a, r) => a + (r.provided || 0), 0);
    state.colonisation.depots[id] = {
      marketId: id, name: prev.name || stationNameFor(state, id), system: prev.system || state.location.system,
      progress: e.ConstructionProgress ?? null, complete: !!e.ConstructionComplete, failed: !!e.ConstructionFailed,
      required, provided, remaining: Math.max(0, required - provided), resources: req, at: e.timestamp || null,
    };
    state.colonisation.current = id;
  },
  ColonisationContribution(state, e) {
    const t = (e.Contributions || []).reduce((a, c) => a + (c.Amount || 0), 0);
    state.session.deliveredToConstruction += t;
    pushLog(state, e, 'Entrega a construcción', `${fmtNum(t, 0)} t`);
  },
  CommitCrime(state, e) { pushLog(state, e, 'Delito', loc(e, 'CrimeType') || '', 'warn'); },
  Shutdown(state, e) { pushLog(state, e, 'Juego cerrado', ''); },
};

function stationNameFor(state, marketId) {
  if (state._markets && state._markets[marketId]) return state._markets[marketId];
  return state.location.station || null;
}

function fmtNum(n, d) {
  if (n === undefined || n === null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function applyEvent(state, e) {
  if (!e || typeof e.event !== 'string') return false;
  // recordar nombre de estación por MarketID (para las obras de colonización)
  if (e.MarketID && e.StationName) {
    state._markets = state._markets || {};
    state._markets[String(e.MarketID)] = e.StationName;
    const d = state.colonisation.depots[String(e.MarketID)];
    if (d && !d.name) d.name = e.StationName;
  }
  if (e.event === 'FSDJump' && state._pendingStarClass) {
    state.location.starClass = state._pendingStarClass;
    state._pendingStarClass = null;
  }
  state.connection.lastEventAt = e.timestamp || state.connection.lastEventAt;
  const h = HANDLERS[e.event];
  if (!h) return false;
  h(state, e);
  if (e.event === 'FSDJump' && !state.location.starClass && state.fsdTarget.starClass) {
    state.location.starClass = state.fsdTarget.starClass;
  }
  return true;
}

/* ---------- ficheros JSON ---------- */

function applyStatus(state, raw, decoded) {
  const S = state.status;
  const flags = {};
  for (const [k, v] of Object.entries(decoded)) if (v === 'true' || v === 'false') flags[k] = v === 'true';
  S.flags = flags;
  S.pips = Array.isArray(raw.Pips) ? raw.Pips.map((p) => p / 2) : null;
  S.fireGroup = raw.FireGroup ?? null;
  S.guiFocus = decoded.guiFocus || null;
  S.fuelMain = raw.Fuel ? raw.Fuel.FuelMain : null;
  S.fuelReservoir = raw.Fuel ? raw.Fuel.FuelReservoir : null;
  S.cargo = raw.Cargo ?? null;
  S.balance = raw.Balance ?? null;
  S.latitude = raw.Latitude ?? null;
  S.longitude = raw.Longitude ?? null;
  S.altitude = raw.Altitude ?? null;
  S.heading = raw.Heading ?? null;
  S.bodyName = raw.BodyName || null;
  S.planetRadius = raw.PlanetRadius ?? null;
  S.gravity = raw.Gravity ?? null;
  if (raw.Balance !== undefined) state.cmdr.credits = raw.Balance;
  state.cmdr.legalState = raw.LegalState || 'Clean';
  state.destination = raw.Destination
    ? { name: raw.Destination.Name_Localised || raw.Destination.Name || null, body: raw.Destination.Body ?? null, system: raw.Destination.System ?? null }
    : { name: null, body: null, system: null };
  if (flags.isDocked !== undefined) state.location.docked = flags.isDocked;
  if (flags.isLanded !== undefined) state.location.landed = flags.isLanded;
  state.connection.status = true;
}

function applyCargo(state, raw) {
  state.cargo = {
    count: raw.Count ?? 0,
    vessel: raw.Vessel || 'Ship',
    inventory: (raw.Inventory || []).map((i) => ({ name: i.Name_Localised || i.Name, count: i.Count || 0, stolen: i.Stolen || 0, mission: !!i.MissionID })),
  };
}

function applyNavRoute(state, raw) {
  const route = (raw.Route || []).map((r) => ({ system: r.StarSystem, starClass: r.StarClass || null, systemAddress: r.SystemAddress ?? null, pos: r.StarPos || null }));
  // la distancia de cada salto se calcula con las coordenadas
  for (let i = 1; i < route.length; i += 1) {
    const a = route[i - 1].pos; const b = route[i].pos;
    route[i].distance = a && b ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) : null;
  }
  if (route.length) route[0].distance = 0;
  // si ya estamos en un sistema de la ruta, se recorta desde ahí
  const i = route.findIndex((r) => r.system === state.location.system);
  state.route = i >= 0 ? route.slice(i) : route;
}

module.exports = { createState, applyEvent, applyStatus, applyCargo, applyNavRoute, HANDLERS, fmtNum };
