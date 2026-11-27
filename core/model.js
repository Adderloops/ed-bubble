'use strict';

/**
 * Modelo de estado de ED BUBBLE: un único objeto con todo lo que muestran
 * las pantallas. Se rellena a partir de los eventos del Journal (applyEvent)
 * y de los ficheros JSON que el juego reescribe (applyStatus, applyCargo,
 * applyNavRoute). No sabe nada de Electron ni de Touch Portal.
 */

const { computeControl } = require('../src/services/powerplay-control');
const combat = require('./combat');
const exploration = require('./exploration');
const trade = require('./trade');

const MAX_LOG = 40;

function createState() {
  return {
    updatedAt: null,
    connection: { journal: false, journalFile: null, lastEventAt: null, status: false },
    cmdr: { name: null, credits: null, legalState: 'Clean', extra: require('./cmdr').create() }, // extra: rangos, reputación, estadísticas, escuadrón y flota (core/cmdr.js)
    ship: { type: null, typeLocalised: null, name: null, ident: null, maxJumpRange: null, fuelCapacity: null, reserveCapacity: null, cargoCapacity: null, hull: null, rebuy: null, fsdSize: null, hasFuelScoop: null },
    location: {
      system: null, body: null, bodyType: null, station: null, stationType: null, docked: false, landed: false,
      starClass: null, allegiance: null, economy: null, secondEconomy: null, government: null, security: null, population: null,
      faction: null, factionState: null, powerplayState: null, controllingPower: null, systemAddress: null, starPos: null,
      approach: null, // cuerpo al que te acercas (ApproachBody): { body, bodyId, systemAddress }
    },
    // cuerpos de este sistema según el Journal: { nombre: { id, gravity (g), radius (m), landable, planetClass,
    //   atmosphere, temperature (K), rings: [nombres], signals: [{ key, name, count }], genuses: [{ key, name }] } }
    bodies: {},
    bio: {}, // muestras exobiológicas de este sistema: { bodyId: { genusKey: { genus, species, step 1-3, samples: [{ lat, lon }] } } }
    bioCurrent: null, // especie que estás muestreando: { body, genus, bodyName }
    destination: { name: null, body: null, system: null },
    status: {
      flags: {}, pips: null, fireGroup: null, guiFocus: null,
      fuelMain: null, fuelReservoir: null, cargo: null, balance: null,
      latitude: null, longitude: null, altitude: null, heading: null, bodyName: null, planetRadius: null, gravity: null,
    },
    fsdTarget: { name: null, starClass: null, remainingJumps: null },
    route: [],
    routeFull: [],
    lastJump: { distance: null, fuelUsed: null, at: null },
    docking: { active: false, pad: null, station: null, stationType: null, at: null },
    powerplay: { power: null, rank: null, merits: null, system: null, control: null, controlAt: null, systems: {}, tracked: null, conflicts: {}, earned: [], lastExploreSale: null },
    colonisation: { depots: {}, current: null, contributions: [] },
    jumpFuel: [], // saltos recientes { ship, fsd, dist, fuel } para calcular el consumo
    surfaceTarget: null, // coordenadas fijadas en un planeta: { lat, lon, body, at }
    station: null, // última estación en la que has atracado (datos del evento Docked / Location)
    market: null, // Market.json: { marketId, station, at, items[] }
    communityGoals: [], // objetivos comunitarios activos (evento CommunityGoal)
    engineering: { last: null, ranks: {} }, // último trabajo de ingeniero y rangos
    materials: null, // materiales de ingeniería de nave: { símbolo: cantidad } (evento Materials y cambios)
    cargo: { count: 0, vessel: 'Ship', inventory: [] },
    // minería con la nave (asteroides): desde el último despegue
    mining: { since: null, lastAt: null, refined: {}, prospects: [], drones: { prospector: 0, collection: 0 }, cracked: 0, motherlodes: 0 },
    // a pie (Odyssey): equipo actual, equipos y trajes/armas vistos, taquilla y mochila
    onfoot: { loadout: null, loadouts: {}, suits: {}, weapons: {}, locker: null, backpack: null },
    srv: { type: null, name: null, launchedAt: null, collected: {} }, // SRV desplegado (LaunchSRV): 'mev_rhino' es el Rhino de minería; collected: materiales recogidos en esta salida
    carrier: require('./carrier').create(), // tu fleet carrier (core/carrier.js)
    shipSurface: null, // dónde está la nave aparcada en la superficie: { body, lat, lon, present } (present false = despedida, en órbita)
    marketOpenedAt: null, marketOpenedStation: null, dockedAt: null,
    tradeRoute: null, // ruta de comercio de Spansh: { at, params, hops: [...] }
    neutron: null, // ruta de neutrones de Spansh: { from, to, range, at, jumps: [{ system, jumps, neutron, left }] }
    trade: trade.create(), // comercio: coste de la bodega, minado, sesión, rango (core/trade.js)
    exploration: exploration.create(), // sistema actual (FSS/DSS) y datos de exploración sin vender (core/exploration.js)
    combat: combat.create(), // objetivo, zona de combate, bajas, bonos por cobrar, masacres (core/combat.js)
    session: { startedAt: null, jumps: 0, distance: 0, merits: 0, bounties: 0, mined: 0, deliveredToConstruction: 0 },
    log: [],
  };
}

/* ---------- utilidades ---------- */

// sin texto localizado, el valor interno del juego («$government_Criminal;») se deja legible («Criminal»)
const tidyRaw = (x) => {
  if (typeof x !== 'string' || !/^\$.*;$/.test(x)) return x;
  let t = x.slice(1, -1);
  const known = t.replace(/^(SYSTEM_SECURITY|GAlAXY_MAP_INFO_state|government|economy|Faction_State|SAA_SignalType)_/i, '');
  t = known !== t ? known : t.replace(/^[A-Za-z]+_(?=[A-Za-z])/, '');
  return t.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
};
const loc = (e, key) => e[`${key}_Localised`] || tidyRaw(e[key]) || null;
const DENIED = { NoSpace: 'no hay plataforma libre', TooLarge: 'tu nave es demasiado grande', Hostile: 'la estación te es hostil', Offences: 'tienes delitos pendientes aquí', Distance: 'estás demasiado lejos', ActiveFighter: 'tienes un caza fuera', NoReason: 'sin motivo', RestrictedAccess: 'acceso restringido', JumpImminent: 'el carrier va a saltar', DockOffline: 'atraque fuera de servicio' };
const deniedText = (r) => DENIED[r] || (r ? String(r).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase() : '');

function pushLog(state, e, title, detail, level) {
  state.log.unshift({ at: e.timestamp || null, event: e.event, title, detail: detail || '', level: level || 'info' });
  if (state.log.length > MAX_LOG) state.log.length = MAX_LOG;
}

/** Datos de la estación (Docked, o Location estando atracado). */
function setStation(state, e) {
  if (!e.StationName) return;
  const f = e.StationFaction || {};
  const pads = e.LandingPads || {};
  state.station = {
    name: e.StationName, type: e.StationType || null, system: e.StarSystem || state.location.system, marketId: e.MarketID != null ? String(e.MarketID) : null,
    faction: f.Name || null, factionState: f.FactionState || null,
    government: e.StationGovernment_Localised || null, allegiance: e.StationAllegiance || null,
    economies: (e.StationEconomies || []).map((x) => ({ name: x.Name_Localised || x.Name, proportion: x.Proportion || 0 })),
    services: Array.isArray(e.StationServices) ? e.StationServices.map((x) => String(x).toLowerCase()) : [],
    distLs: e.DistFromStarLS ?? null,
    pads: { S: pads.Small ?? null, M: pads.Medium ?? null, L: pads.Large ?? null },
    at: e.timestamp || null,
  };
}

/** Market.json: lo que compra y vende la estación (solo al abrir el mercado en el juego). */
function applyMarket(state, raw) {
  if (!raw || !Array.isArray(raw.Items)) return;
  state.market = {
    marketId: raw.MarketID != null ? String(raw.MarketID) : null, station: raw.StationName || null, system: raw.StarSystem || null, at: raw.timestamp || null,
    items: raw.Items.map((i) => ({
      key: commodityKey(i.Name), name: i.Name_Localised || i.Name, category: i.Category_Localised || null,
      buy: i.BuyPrice || 0, sell: i.SellPrice || 0, mean: i.MeanPrice || 0, stock: i.Stock || 0, demand: i.Demand || 0, rare: !!i.Rare,
    })),
  };
}

function setSystemInfo(state, e) {
  const L = state.location;
  if (e.StarSystem) L.system = e.StarSystem;
  if (e.SystemAddress !== undefined) L.systemAddress = e.SystemAddress;
  if (Array.isArray(e.StarPos)) L.starPos = e.StarPos;
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
  recordControl(state, e, control);
}

/** Consumo real de un salto (para estimar el combustible de la ruta con esta nave). */
function recordJumpFuel(state, e) {
  const d = Number(e.JumpDist); const f = Number(e.FuelUsed);
  if (!(d >= 3) || !(f > 0) || !state.ship.type) return;
  const list = state.jumpFuel;
  list.push({ ship: state.ship.type, fsd: state.ship.fsdSize || null, dist: d, fuel: f, at: e.timestamp || null });
  if (list.length > 60) list.splice(0, list.length - 60);
}

/**
 * Guarda el control de Powerplay de un sistema cada vez que entras en él
 * (FSDJump/Location), para el sistema seguido y la comparación entre ciclos.
 */
function recordControl(state, e, control = computeControl(e)) {
  const name = e.StarSystem;
  recordConflict(state, e);
  if (!name || !control) return;
  const list = state.powerplay.systems[name] || (state.powerplay.systems[name] = []);
  const last = list[list.length - 1];
  if (last && last.at === e.timestamp) return;
  list.push({ at: e.timestamp || null, control, power: e.ControllingPower || null, powers: e.Powers || [] });
  if (list.length > 40) list.splice(0, list.length - 40);
}

/**
 * Adquisición: en un sistema sin potencia, cada potencia que intenta quedárselo
 * trae su ConflictProgress (1,0 = 120.000 puntos de control, el umbral para reclamarlo).
 */
const ACQ_CAP = 120000;
function recordConflict(state, e) {
  const name = e.StarSystem;
  if (!name || !Array.isArray(e.PowerplayConflictProgress) || !e.PowerplayConflictProgress.length) return;
  const pp = state.powerplay;
  if (!pp.conflicts) pp.conflicts = {};
  const list = pp.conflicts[name] || (pp.conflicts[name] = []);
  const last = list[list.length - 1];
  if (last && last.at === e.timestamp) return;
  list.push({
    at: e.timestamp || null, state: e.PowerplayState || null,
    powers: e.PowerplayConflictProgress.map((x) => ({ power: x.Power, progress: Number(x.ConflictProgress) || 0, cp: Math.round((Number(x.ConflictProgress) || 0) * ACQ_CAP) })).sort((a, b) => b.progress - a.progress),
  });
  if (list.length > 20) list.splice(0, list.length - 20);
  const names = Object.keys(pp.conflicts);
  if (names.length > 120) { // los más antiguos fuera
    names.sort((a, b) => String(pp.conflicts[a][pp.conflicts[a].length - 1].at).localeCompare(String(pp.conflicts[b][pp.conflicts[b].length - 1].at)));
    for (const n of names.slice(0, names.length - 120)) delete pp.conflicts[n];
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
    if (e.HullHealth !== undefined) { S.hull = e.HullHealth; S.hullAt = e.timestamp || null; }
    if (e.Rebuy !== undefined) S.rebuy = e.Rebuy;
    if (Array.isArray(e.Modules)) {
      const fsd = e.Modules.find((m) => /hyperdrive/i.test(m.Item || ''));
      const mm = fsd && String(fsd.Item).match(/size(\d)_class(\d)/i);
      S.fsdSize = mm ? Number(mm[1]) : null;
      S.hasFuelScoop = e.Modules.some((m) => /fuelscoop/i.test(m.Item || ''));
      // módulos montados, con su ingeniería (pantalla Equipo)
      S.modules = e.Modules.filter((m) => !COSMETIC.test(m.Slot || '')).map((m) => ({
        slot: m.Slot, item: String(m.Item || '').toLowerCase(), on: m.On !== false, priority: m.Priority ?? null,
        health: m.Health ?? null, value: m.Value ?? null,
        eng: m.Engineering ? { bp: m.Engineering.BlueprintName || null, level: m.Engineering.Level ?? null, quality: m.Engineering.Quality ?? null, engineer: m.Engineering.Engineer || null, exp: m.Engineering.ExperimentalEffect || null, expName: m.Engineering.ExperimentalEffect_Localised || null } : null,
      }));
      S.shipValue = e.HullValue != null ? { hull: e.HullValue, modules: e.ModulesValue ?? null } : (S.shipValue || null);
      // para exportar a Coriolis o EDSY, y para comparar builds con cada nave de tu flota
      S.loadout = { timestamp: e.timestamp, event: 'Loadout', Ship: e.Ship, ShipID: e.ShipID, ShipName: e.ShipName, ShipIdent: e.ShipIdent, HullValue: e.HullValue, ModulesValue: e.ModulesValue, HullHealth: e.HullHealth, UnladenMass: e.UnladenMass, CargoCapacity: e.CargoCapacity, MaxJumpRange: e.MaxJumpRange, FuelCapacity: e.FuelCapacity, Rebuy: e.Rebuy, Modules: e.Modules };
      if (!state.fleet) state.fleet = {};
      const fk = String(e.Ship || '').toLowerCase(); const prev = state.fleet[fk];
      if (!prev || !prev.at || !e.timestamp || e.timestamp >= prev.at) state.fleet[fk] = { name: e.ShipName || null, ident: e.ShipIdent || null, at: e.timestamp || null, modules: S.modules };
    }
  },
  Location(state, e) {
    if (e.Docked) setStation(state, e);
    setSystemInfo(state, e);
    state.location.docked = !!e.Docked;
    state.location.station = e.Docked ? (e.StationName || null) : null;
    state.location.stationType = e.Docked ? (e.StationType || null) : null;
    if (e.BodyType === 'Planet') setApproachFrom(state, e, true);
    pushLog(state, e, 'Posición', e.Docked ? `${e.StationName} · ${e.StarSystem}` : e.StarSystem);
  },
  FSDJump(state, e) {
    setSystemInfo(state, e);
    state.location.approach = null; state.bodies = {}; state.bio = {}; state.bioCurrent = null;
    state.location.docked = false; state.location.station = null; state.location.stationType = null;
    state.location.landed = false;
    state.lastJump = { distance: e.JumpDist ?? null, fuelUsed: e.FuelUsed ?? null, at: e.timestamp || null };
    recordJumpFuel(state, e);
    if (e.StarClass) state.location.starClass = e.StarClass;
    state.session.jumps += 1;
    state.session.distance += Number(e.JumpDist) || 0;
    if (state.fsdTarget.name === e.StarSystem) {
      state.location.starClass = state.fsdTarget.starClass || state.location.starClass;
      state.fsdTarget = { name: null, starClass: null, remainingJumps: null };
    }
    // ruta de neutrones: recuerda el último punto alcanzado (entre puntos hay saltos por sistemas que no salen en la ruta)
    if (state.neutron && Array.isArray(state.neutron.jumps)) { const k = state.neutron.jumps.findIndex((j) => String(j.system).toLowerCase() === String(e.StarSystem).toLowerCase()); if (k >= 0) state.neutron.reached = k; }
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
  SupercruiseEntry(state, e) { state.location.body = null; state.shipSurface = null; pushLog(state, e, 'Supercrucero', 'Entrada'); },
  SupercruiseExit(state, e) {
    if (e.Body) { state.location.body = e.Body; state.location.bodyType = e.BodyType || null; }
    if (e.BodyType === 'Planet') setApproachFrom(state, e, true);
    pushLog(state, e, 'Supercrucero', `Salida · ${e.Body || ''}`);
  },
  ApproachBody(state, e) {
    state.location.approach = { body: e.Body || null, bodyId: e.BodyID ?? null, systemAddress: e.SystemAddress ?? state.location.systemAddress };
    pushLog(state, e, 'Aproximación', e.Body);
  },
  LeaveBody(state, e) { state.location.approach = null; pushLog(state, e, 'Alejándose', e.Body); },
  Scan(state, e) {
    if (!e.BodyName) return;
    const b = bodyEntry(state, e.BodyName, e.BodyID);
    // SurfaceGravity viene en m/s²; se guarda en g
    if (e.SurfaceGravity != null) b.gravity = e.SurfaceGravity / 9.80665;
    if (e.Radius != null) b.radius = e.Radius;
    if (e.Landable != null) b.landable = !!e.Landable;
    if (e.PlanetClass) b.planetClass = e.PlanetClass;
    if (e.StarType) b.starType = e.StarType;
    if (e.Atmosphere !== undefined) b.atmosphere = e.Atmosphere_Localised || e.Atmosphere || '';
    if (e.SurfaceTemperature != null) b.temperature = e.SurfaceTemperature;
    if (e.Volcanism !== undefined) b.volcanism = e.Volcanism_Localised || e.Volcanism || '';
    if (Array.isArray(e.Rings)) b.rings = e.Rings.map((r) => r.Name).filter(Boolean);
    // datos en bruto para predecir especies de exobiología (core/biopredict.js)
    const keep = ['BodyID', 'BodyName', 'SystemAddress', 'StarType', 'Radius', 'SurfaceTemperature', 'AbsoluteMagnitude', 'DistanceFromArrivalLS', 'Parents', 'SemiMajorAxis',
      'PlanetClass', 'Landable', 'SurfaceGravity', 'SurfacePressure', 'Atmosphere', 'AtmosphereType', 'AtmosphereComposition', 'Volcanism', 'Materials'];
    b.scan = Object.fromEntries(keep.filter((k) => e[k] !== undefined).map((k) => [k, e[k]]));
  },
  FSSBodySignals(state, e) { if (e.BodyName) bodySignals(state, e.BodyName, e.BodyID, e.Signals); },
  SAASignalsFound(state, e) {
    if (!e.BodyName) return;
    const b = bodySignals(state, e.BodyName, e.BodyID, e.Signals);
    if (Array.isArray(e.Genuses)) b.genuses = e.Genuses.map((g) => ({ key: g.Genus, name: g.Genus_Localised || g.Genus }));
  },
  ScanOrganic(state, e) {
    if (e.Body == null || !e.Genus) return;
    // el juego escribe Log (1.ª muestra), Sample (2.ª), Sample (3.ª) y, unos segundos después, Analyse (sin moverte)
    const byBody = state.bio[e.Body] || (state.bio[e.Body] = {});
    const S = state.status;
    const pos = S.latitude != null && S.longitude != null ? { lat: S.latitude, lon: S.longitude } : null;
    const prev = byBody[e.Genus];
    const other = prev && prev.speciesKey && e.Species && prev.speciesKey !== e.Species;
    let step; let samples;
    if (e.ScanType === 'Analyse') { step = 3; samples = (!other && prev && prev.samples) || []; }
    else if (e.ScanType === 'Log' || !prev || other || prev.step >= 3) { step = e.ScanType === 'Log' ? 1 : 2; samples = pos ? [pos] : []; }
    else { step = Math.min(3, (prev.step || 1) + 1); samples = (prev.samples || []).concat(pos ? [pos] : []); }
    byBody[e.Genus] = { genus: e.Genus_Localised || e.Genus, species: e.Species_Localised || e.Species || null, variant: e.Variant_Localised || null, step,
      analysed: e.ScanType === 'Analyse', genusKey: e.Genus, speciesKey: e.Species || null, samples, at: e.timestamp || null };
    state.bioCurrent = step < 3 ? { body: e.Body, genus: e.Genus, bodyName: S.bodyName || null } : null;
    pushLog(state, e, 'Exobiología', `${e.Species_Localised || e.Genus_Localised || ''} · ${e.ScanType === 'Analyse' ? 'analizada' : `${step}/3`}`);
  },
  DockingRequested(state, e) { pushLog(state, e, 'Atraque solicitado', e.StationName); },
  DockingGranted(state, e) {
    state.docking = { active: true, pad: e.LandingPad ?? null, station: e.StationName || null, stationType: e.StationType || null, at: e.timestamp || null };
    pushLog(state, e, 'Atraque concedido', `${e.StationName} · plataforma ${e.LandingPad}`);
  },
  DockingDenied(state, e) { clearDocking(state); pushLog(state, e, 'Atraque denegado', `${e.StationName} · ${deniedText(e.Reason)}`, 'warn'); },
  DockingCancelled(state, e) { clearDocking(state); pushLog(state, e, 'Atraque cancelado', e.StationName); },
  DockingTimeout(state, e) { clearDocking(state); pushLog(state, e, 'Atraque caducado', e.StationName, 'warn'); },
  Docked(state, e) {
    clearDocking(state);
    setStation(state, e);
    state.location.docked = true;
    state.dockedAt = e.timestamp || null;
    state.location.station = e.StationName || null;
    state.location.stationType = e.StationType || null;
    if (e.StarSystem) state.location.system = e.StarSystem;
    pushLog(state, e, 'Atracado', e.StationName);
  },
  CommunityGoal(state, e) {
    state.communityGoals = (e.CurrentGoals || []).map((g) => ({
      id: g.CGID, title: g.Title, system: g.SystemName, station: g.MarketName, expiry: g.Expiry || null, complete: !!g.IsComplete,
      total: g.CurrentTotal ?? null, contribution: g.PlayerContribution ?? 0, contributors: g.NumContributors ?? null,
      band: g.PlayerPercentileBand ?? null, topTier: g.TopTier ? g.TopTier.Name : null, tier: g.TierReached || null,
    }));
  },
  EngineerProgress(state, e) {
    for (const x of e.Engineers || (e.Engineer ? [e] : [])) state.engineering.ranks[x.Engineer] = { id: x.EngineerID ?? null, rank: x.Rank ?? null, progress: x.Progress || null };
  },
  Materials(state, e) {
    const m = {};
    for (const c of ['Raw', 'Manufactured', 'Encoded']) for (const x of e[c] || []) m[String(x.Name).toLowerCase()] = x.Count || 0;
    state.materials = m;
  },
  MaterialCollected(state, e) {
    addMat(state, e.Name, e.Count);
    if (state.srv && state.srv.type && e.Name) { const k = String(e.Name).toLowerCase(); state.srv.collected[k] = (state.srv.collected[k] || 0) + (Number(e.Count) || 0); }
  },
  MaterialDiscarded(state, e) { addMat(state, e.Name, -(e.Count || 0)); },
  MaterialTrade(state, e) { if (e.Paid) addMat(state, e.Paid.Material, -(e.Paid.Quantity || 0)); if (e.Received) addMat(state, e.Received.Material, e.Received.Quantity); },
  Synthesis(state, e) { for (const x of e.Materials || []) addMat(state, x.Name, -(x.Count || 0)); },
  TechnologyBroker(state, e) { for (const x of e.Materials || []) addMat(state, x.Name, -(x.Count || 0)); },
  ScientificResearch(state, e) { addMat(state, e.Name, -(e.Count || 0)); },
  EngineerContribution(state, e) { if (e.Type === 'Materials') addMat(state, e.Material, -(e.Quantity || 0)); },
  MissionCompleted(state, e) { for (const x of e.MaterialsReward || []) addMat(state, x.Name, x.Count); },
  EngineerCraft(state, e) {
    for (const x of e.Ingredients || []) addMat(state, x.Name, -(x.Count || 0));
    state.engineering.last = { engineer: e.Engineer, blueprint: e.BlueprintName, level: e.Level ?? null, module: e.Slot || e.Module || null, at: e.timestamp || null };
    pushLog(state, e, 'Ingeniería', `${e.Engineer} · ${e.BlueprintName} G${e.Level}`);
  },
  Undocked(state, e) {
    resetMining(state); // la minería con la nave cuenta desde el último despegue
    state.location.docked = false; state.location.station = null; state.location.stationType = null;
    pushLog(state, e, 'Despegue', e.StationName);
  },
  Touchdown(state, e) {
    setApproachFrom(state, e); state.location.landed = true; pushLog(state, e, e.PlayerControlled === false ? 'La nave ha aterrizado' : 'Aterrizaje', e.Body || '');
    if (e.Latitude != null && e.Longitude != null) state.shipSurface = { body: e.Body || null, lat: e.Latitude, lon: e.Longitude, present: true };
  },
  Liftoff(state, e) {
    setApproachFrom(state, e); state.location.landed = false; pushLog(state, e, e.PlayerControlled === false ? 'Nave despedida' : 'Despegue', e.Body || '');
    // despedida desde el SRV: se queda en órbita y vuelve al llamarla; si despegas tú, ya no está aparcada
    if (e.PlayerControlled === false) { if (state.shipSurface) state.shipSurface.present = false; } else state.shipSurface = null;
  },
  FuelScoop(state, e) { pushLog(state, e, 'Recogida de combustible', `${fmtNum(e.Scooped, 1)} t`); },
  RefuelAll(state, e) { pushLog(state, e, 'Repostaje', `${fmtNum(e.Amount, 1)} t`); },
  Interdicted(state, e) { pushLog(state, e, 'Interdicción', e.Submitted ? 'Sometido' : (e.Interdictor || ''), 'warn'); },
  EscapeInterdiction(state, e) { pushLog(state, e, 'Interdicción', 'Evadida', 'warn'); },
  UnderAttack(state, e) { pushLog(state, e, 'Bajo ataque', e.Target || '', 'danger'); },
  // El juego no escribe el casco de tu nave durante el vuelo: solo lo da Loadout (al cargar, atracar o equipar)
  // y, a veces, HullDamage. HullDamage también llega para el caza (Fighter: true): ese no es tu casco.
  HullDamage(state, e) { if (e.PlayerPilot !== false && !e.Fighter && e.Health !== undefined) { state.ship.hull = e.Health; state.ship.hullAt = e.timestamp || null; } },
  RepairAll(state, e) { state.ship.hull = 1; state.ship.hullAt = e.timestamp || null; },
  Repair(state, e) { const it = [].concat(e.Items || e.Item || []).map((x) => String(x).toLowerCase()); if (it.some((x) => x === 'hull' || x === 'all')) { state.ship.hull = 1; state.ship.hullAt = e.timestamp || null; } },
  Died(state, e) { clearDocking(state); pushLog(state, e, 'Nave destruida', e.KillerName || '', 'danger'); },
  NavRoute() { /* el contenido real está en NavRoute.json */ },
  NavRouteClear(state, e) { state.route = []; state.routeFull = []; pushLog(state, e, 'Ruta borrada', ''); },
  Powerplay(state, e) { state.powerplay.power = e.Power || null; state.powerplay.rank = e.Rank ?? null; state.powerplay.merits = e.Merits ?? null; },
  PowerplayMerits(state, e) {
    const pp = state.powerplay;
    pp.merits = e.TotalMerits ?? pp.merits;
    const gained = Number(e.MeritsGained) || 0;
    if (!e._hist) state.session.merits += gained;
    if (gained > 0) {
      // de dónde vienen: la exploración cuenta ÷ 6 en puntos de control; lo demás ÷ 4 (guía de Inara)
      const t = Date.parse(e.timestamp || '');
      const explore = !!(pp.lastExploreSale && t && t - Date.parse(pp.lastExploreSale) < 90000);
      if (!pp.earned) pp.earned = [];
      pp.earned.push({ at: e.timestamp || null, system: e._system || state.location.system || null, merits: gained, kind: explore ? 'explore' : 'other', hist: !!e._hist });
      if (pp.earned.length > 400) pp.earned.splice(0, pp.earned.length - 400);
    }
  },
  PowerplayRank(state, e) { state.powerplay.rank = e.Rank ?? state.powerplay.rank; },
  Bounty(state, e) { state.session.bounties += Number(e.TotalReward || e.Reward) || 0; },
  MiningRefined(state, e) {
    state.session.mined += 1;
    if (state.status.flags && state.status.flags.isInSRV) return; // en el Rhino lo cuenta Skull Mining
    const m = miningTouch(state, e);
    const k = String(e.Type || '').toLowerCase().replace(/^\$/, '').replace(/_name;?$/, '');
    const r = m.refined[k] || (m.refined[k] = { name: e.Type_Localised || k, tonnes: 0 });
    r.tonnes += 1;
  },
  ProspectedAsteroid(state, e) {
    const m = miningTouch(state, e);
    m.prospects.unshift({
      at: e.timestamp || null, content: ({ High: 'Alto', Medium: 'Medio', Low: 'Bajo' })[(/_(High|Medium|Low);?$/.exec(e.Content || '') || [])[1]] || e.Content_Localised || e.Content || null, remaining: e.Remaining ?? null,
      motherlode: e.MotherlodeMaterial_Localised || e.MotherlodeMaterial || null,
      materials: (e.Materials || []).map((x) => ({ name: x.Name_Localised || x.Name, pct: x.Proportion ?? 0 })).sort((a, b) => b.pct - a.pct),
    });
    m.prospects.length = Math.min(m.prospects.length, 12);
    if (e.MotherlodeMaterial) m.motherlodes += 1;
  },
  LaunchDrone(state, e) {
    const m = miningTouch(state, e);
    if (e.Type === 'Prospector') m.drones.prospector += 1;
    else if (e.Type === 'Collection') m.drones.collection += 1;
  },
  AsteroidCracked(state, e) { miningTouch(state, e).cracked += 1; },
  SuitLoadout(state, e) { setSuitLoadout(state, e, true); },
  SwitchSuitLoadout(state, e) { setSuitLoadout(state, e, true); pushLog(state, e, 'Equipo', e.LoadoutName || ''); },
  CreateSuitLoadout(state, e) { setSuitLoadout(state, e, false); },
  RenameSuitLoadout(state, e) { const l = state.onfoot.loadouts[e.LoadoutID]; if (l) l.name = e.LoadoutName || l.name; },
  DeleteSuitLoadout(state, e) { delete state.onfoot.loadouts[e.LoadoutID]; },
  LoadoutEquipModule(state, e) {
    const l = state.onfoot.loadouts[e.LoadoutID]; if (!l) return;
    const w = weaponFrom(e);
    state.onfoot.weapons[w.id] = w;
    l.weapons = [...l.weapons.filter((x) => x.slot !== e.SlotName), { ...w, slot: e.SlotName }].sort((a, b) => a.slot.localeCompare(b.slot));
  },
  LoadoutRemoveModule(state, e) { const l = state.onfoot.loadouts[e.LoadoutID]; if (l) l.weapons = l.weapons.filter((x) => x.slot !== e.SlotName); },
  BuySuit(state, e) { state.onfoot.suits[e.SuitID] = suitFrom(e.Name, e.SuitID, e.SuitMods); pushLog(state, e, 'Traje comprado', suitName(e.Name)); },
  SellSuit(state, e) { delete state.onfoot.suits[e.SuitID]; },
  UpgradeSuit(state, e) {
    const x = state.onfoot.suits[e.SuitID] || (state.onfoot.suits[e.SuitID] = suitFrom(e.Name, e.SuitID, []));
    x.grade = e.Class ?? x.grade;
    for (const l of Object.values(state.onfoot.loadouts)) if (l.suit && l.suit.id === e.SuitID) l.suit.grade = x.grade;
    pushLog(state, e, 'Traje mejorado', `${x.name} · grado ${x.grade}`);
  },
  BuyWeapon(state, e) { const w = weaponFrom({ SuitModuleID: e.SuitModuleID, ModuleName: e.Name, ModuleName_Localised: e.Name_Localised, Class: e.Class, WeaponMods: e.WeaponMods }); state.onfoot.weapons[w.id] = w; pushLog(state, e, 'Arma comprada', w.name); },
  SellWeapon(state, e) { delete state.onfoot.weapons[e.SuitModuleID]; },
  UpgradeWeapon(state, e) {
    const w = state.onfoot.weapons[e.SuitModuleID] || (state.onfoot.weapons[e.SuitModuleID] = weaponFrom({ SuitModuleID: e.SuitModuleID, ModuleName: e.Name, ModuleName_Localised: e.Name_Localised }));
    w.grade = e.Class ?? w.grade;
    for (const l of Object.values(state.onfoot.loadouts)) for (const x of l.weapons) if (x.id === e.SuitModuleID) x.grade = w.grade;
    pushLog(state, e, 'Arma mejorada', `${w.name} · grado ${w.grade}`);
  },
  ShipLocker(state, e) { if (Array.isArray(e.Items)) state.onfoot.locker = lockerFrom(e); },
  Backpack(state, e) { if (Array.isArray(e.Items)) state.onfoot.backpack = lockerFrom(e); },
  // abrir el mercado de mercancías (para el salto automático a Comercio)
  Market(state, e) { state.marketOpenedAt = e.timestamp || null; state.marketOpenedStation = e.StationName || null; },
  LaunchSRV(state, e) {
    if (e.PlayerControlled === false) return;
    state.srv = { type: e.SRVType || null, name: e.SRVType_Localised || null, launchedAt: e.timestamp || null, collected: {} };
    const S = state.status;
    if (!state.shipSurface && S && S.latitude != null) state.shipSurface = { body: S.bodyName || state.location.body || null, lat: S.latitude, lon: S.longitude, present: true };
  },
  DockSRV(state, e) { state.srv = { type: null, name: null, launchedAt: null, collected: {} }; },
  SRVDestroyed(state, e) { state.srv = { type: null, name: null, launchedAt: null, collected: {} }; },
  // vehículos nuevos (p. ej. la Nomad, «lander01»): LaunchVessel / DockVessel / VesselDestroyed
  LaunchVessel(state, e) {
    state.srv = { type: e.VesselType || null, name: e.VesselType_Localised || null, launchedAt: e.timestamp || null, collected: {} };
    const S = state.status;
    if (!state.shipSurface && S && S.latitude != null) state.shipSurface = { body: S.bodyName || state.location.body || null, lat: S.latitude, lon: S.longitude, present: true };
  },
  DockVessel(state, e) { state.srv = { type: null, name: null, launchedAt: null, collected: {} }; },
  VesselDestroyed(state, e) { state.srv = { type: null, name: null, launchedAt: null, collected: {} }; },
  ColonisationConstructionDepot(state, e) {
    const id = String(e.MarketID);
    const prev = state.colonisation.depots[id] || {};
    const req = (e.ResourcesRequired || []).map((r) => ({
      key: commodityKey(r.Name), name: r.Name_Localised || r.Name, required: r.RequiredAmount, provided: r.ProvidedAmount, payment: r.Payment,
    }));
    const required = req.reduce((a, r) => a + (r.required || 0), 0);
    const provided = req.reduce((a, r) => a + (r.provided || 0), 0);
    state.colonisation.depots[id] = {
      marketId: id, name: (state._markets && state._markets[id]) || prev.name || stationNameFor(state, id), system: prev.system || state.location.system,
      type: prev.type || (state.location.docked && state.location.stationType) || null,
      progress: e.ConstructionProgress ?? null, complete: !!e.ConstructionComplete, failed: !!e.ConstructionFailed,
      required, provided, remaining: Math.max(0, required - provided), resources: req, at: e.timestamp || null,
    };
    state.colonisation.current = id;
  },
  ColonisationContribution(state, e) {
    const items = (e.Contributions || []).map((c) => ({ key: commodityKey(c.Name), name: c.Name_Localised || c.Name, amount: c.Amount || 0 }));
    const t = items.reduce((a, c) => a + c.amount, 0);
    state.session.deliveredToConstruction += t;
    const id = String(e.MarketID || '');
    state.colonisation.contributions.unshift({ at: e.timestamp || null, marketId: id, depot: (state.colonisation.depots[id] || {}).name || stationNameFor(state, id), items, total: t });
    if (state.colonisation.contributions.length > 30) state.colonisation.contributions.length = 30;
    pushLog(state, e, 'Entrega a construcción', `${fmtNum(t, 0)} t`);
  },
  CommitCrime(state, e) { pushLog(state, e, 'Delito', loc(e, 'CrimeType') || '', 'warn'); },
  Shutdown(state, e) { pushLog(state, e, 'Juego cerrado', ''); },
};

/** Clave común para un material: "$CMMComposite_name;" y "cmmcomposite" -> "cmmcomposite". */
function bodyEntry(state, name, id) {
  const b = state.bodies[name] || (state.bodies[name] = {});
  if (id != null) b.id = id;
  return b;
}

/** Señales de un cuerpo o anillo: biológicas, geológicas… y puntos calientes de minería. */
function bodySignals(state, name, id, signals) {
  const b = bodyEntry(state, name, id);
  if (!Array.isArray(signals)) return b;
  b.signals = signals.map((x) => {
    const m = /^\$SAA_SignalType_(\w+);?$/.exec(x.Type || '');
    // «$PlanetaryMiningLocation_Name;» -> «planetary mining location» (la misma clave que las señales de Spansh)
    const n = /^\$(\w+?)_Name;?$/.exec(x.Type || '');
    const key = m ? m[1].toLowerCase() : n ? n[1].replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase() : String(x.Type || '').toLowerCase();
    return { key, name: x.Type_Localised || (m ? m[1] : x.Type), count: x.Count || 0 };
  });
  return b;
}

// ---- A pie (Odyssey)
const SUITS = { tacticalsuit: 'Dominator', utilitysuit: 'Maverick', explorationsuit: 'Artemis', flightsuit: 'Traje de vuelo' };
function suitName(raw) {
  const k = String(raw || '').toLowerCase().replace(/_class\d+$/, '');
  return SUITS[k] || String(raw || '');
}
const gradeOf = (raw, cls) => (cls != null ? cls : Number((/_class(\d)/.exec(String(raw || '')) || [])[1]) || null);
/** Suma (o resta) unidades de un material de ingeniería; sin el evento Materials aún no se sabe el total. */
function addMat(state, name, n) {
  if (!state.materials || !name) return;
  const k = String(name).toLowerCase();
  state.materials[k] = Math.max(0, (state.materials[k] || 0) + (Number(n) || 0));
}
// ranuras de aspecto (pintura, cabina, voz…) que no son módulos
/** Cuerpo planetario en el que estás (para buscar su ficha en Spansh) aunque no haya ApproachBody. */
// near: solo es el cuerpo más cercano (SupercruiseExit, Location), no que estés en su órbita; p. ej. al salir del
// supercrucero junto a una estación orbital. No cuenta para el salto automático a Órbita (#27).
function setApproachFrom(state, e, near = false) {
  if (!e.Body || e.BodyID == null) return;
  if (e.BodyType && e.BodyType !== 'Planet') return;
  const a = state.location.approach;
  if (a && a.body === e.Body && a.bodyId != null) { if (!near && a.near) a.near = false; return; }
  state.location.approach = { body: e.Body, bodyId: e.BodyID, systemAddress: e.SystemAddress ?? state.location.systemAddress, near };
}
const COSMETIC = /^(PaintJob|ShipCockpit|CargoHatch|VesselVoice|Decal\d*|ShipName\d*|ShipID\d*|Bobble\d*|WeaponColour|EngineColour|StringLights|ShipKitSpoiler|ShipKitWings|ShipKitTail|ShipKitBumper)$/i;
function suitFrom(raw, id, mods) { return { id, key: String(raw || '').toLowerCase(), name: suitName(raw), grade: gradeOf(raw), mods: mods || [] }; }
function weaponFrom(m) {
  return { id: m.SuitModuleID, key: m.ModuleName || '', name: m.ModuleName_Localised || m.ModuleName || '', grade: m.Class ?? null, mods: m.WeaponMods || [], slot: m.SlotName || null };
}
function setSuitLoadout(state, e, current) {
  const suit = suitFrom(e.SuitName, e.SuitID, e.SuitMods);
  const weapons = (e.Modules || []).map(weaponFrom).sort((a, b) => String(a.slot).localeCompare(String(b.slot)));
  const l = { id: e.LoadoutID, name: e.LoadoutName || '', suit, weapons };
  state.onfoot.loadouts[e.LoadoutID] = l;
  state.onfoot.suits[e.SuitID] = { ...(state.onfoot.suits[e.SuitID] || {}), ...suit };
  for (const w of weapons) state.onfoot.weapons[w.id] = { ...w, slot: null };
  if (current) state.onfoot.loadout = e.LoadoutID;
}
const prettyName = (n) => String(n || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
function lockerFrom(raw) {
  const list = (arr) => {
    const out = {};
    for (const i of arr || []) {
      const k = String(i.Name || '').toLowerCase();
      const x = out[k] || (out[k] = { key: k, name: i.Name_Localised || prettyName(i.Name), count: 0, mission: 0 });
      x.count += i.Count || 0;
      if (i.MissionID) x.mission += i.Count || 0;
    }
    return Object.values(out).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  };
  return { at: raw.timestamp || null, items: list(raw.Items), components: list(raw.Components), consumables: list(raw.Consumables), data: list(raw.Data) };
}
/** ShipLocker.json / Backpack.json (el juego los reescribe con el contenido completo). */
function applyLocker(state, raw, which) {
  if (!raw || !Array.isArray(raw.Items)) return;
  state.onfoot[which === 'backpack' ? 'backpack' : 'locker'] = lockerFrom(raw);
}

function resetMining(state) {
  state.mining = { since: null, lastAt: null, refined: {}, prospects: [], drones: { prospector: 0, collection: 0 }, cracked: 0, motherlodes: 0 };
}
function miningTouch(state, e) {
  const m = state.mining;
  if (!m.since) m.since = e.timestamp || null;
  m.lastAt = e.timestamp || null;
  return m;
}

function commodityKey(name) {
  return String(name || '').toLowerCase().replace(/^\$/, '').replace(/_name;?$/, '').replace(/[^a-z0-9]/g, '');
}

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
  // recordar nombre de estación por MarketID (para las construcciones de colonización)
  if (e.MarketID && e.StationName) {
    state._markets = state._markets || {};
    // el nombre más reciente manda: una construcción cambia de nombre cuando le pones uno (p. ej. «Watabe Depot» -> «Sisters' Pride»)
    const nm = String(e.StationName).replace(/\s+/g, ' ').trim();
    state._markets[String(e.MarketID)] = nm;
    const d = state.colonisation.depots[String(e.MarketID)];
    if (d) d.name = nm;
  }
  if (e.event === 'FSDJump' && state._pendingStarClass) {
    state.location.starClass = state._pendingStarClass;
    state._pendingStarClass = null;
  }
  state.connection.lastEventAt = e.timestamp || state.connection.lastEventAt;
  combat.apply(state, e);
  const xc = exploration.apply(state, e);
  const tc = trade.apply(state, e);
  const cc = require('./cmdr').apply(state, e);
  const fc = require('./carrier').apply(state, e);
  const h = HANDLERS[e.event];
  if (!h) return xc || tc || cc || fc;
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
  S.sampler = /sampletool/i.test(String(raw.SelectedWeapon || '')); // escáner genético en la mano (solo para el salto automático)
  S.bodyName = raw.BodyName || null;
  S.planetRadius = raw.PlanetRadius ?? null;
  S.gravity = raw.Gravity ?? null;
  // a pie: oxígeno y salud (0-1) y temperatura (K)
  S.oxygen = raw.Oxygen ?? null; S.health = raw.Health ?? null; S.temperature = raw.Temperature ?? null;
  if (raw.Balance !== undefined) state.cmdr.credits = raw.Balance;
  state.cmdr.legalState = raw.LegalState || 'Clean';
  state.destination = raw.Destination
    ? { name: raw.Destination.Name_Localised || raw.Destination.Name || null, raw: raw.Destination.Name || null, body: raw.Destination.Body ?? null, system: raw.Destination.System ?? null }
    : { name: null, body: null, system: null };
  if (flags.isDocked !== undefined) state.location.docked = flags.isDocked;
  if (flags.isLanded !== undefined) state.location.landed = flags.isLanded;
  state.connection.status = true;
}

function applyCargo(state, raw) {
  state.cargo = {
    count: raw.Count ?? 0,
    vessel: raw.Vessel || 'Ship',
    inventory: (raw.Inventory || []).map((i) => ({ key: commodityKey(i.Name), name: i.Name_Localised || i.Name, count: i.Count || 0, stolen: i.Stolen || 0, mission: !!i.MissionID })),
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
  state.routeFull = route;
  state.route = i >= 0 ? route.slice(i) : route;
}

module.exports = { ACQ_CAP, recordConflict, applyLocker, suitName, recordJumpFuel, recordControl, createState, applyEvent, applyStatus, applyCargo, applyNavRoute, applyMarket, HANDLERS, fmtNum, commodityKey };
