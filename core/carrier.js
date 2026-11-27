'use strict';

/**
 * ED BUBBLE · Carrier: tu fleet carrier (y el del escuadrón, si lo hay).
 *
 * Eventos: CarrierLocation (al cargar la partida: dónde está cada carrier),
 * CarrierStats (al abrir la gestión del carrier: combustible, espacio,
 * finanzas, tripulación), CarrierJumpRequest / CarrierJumpCancelled /
 * CarrierJump, CarrierDepositFuel, CarrierFinance, CarrierBankTransfer,
 * CarrierCrewServices, CarrierDockingPermission y CarrierNameChange.
 */

const ROLE = {
  Captain: 'Capitán', Refuel: 'Repostaje', Repair: 'Reparaciones', Rearm: 'Rearme', Commodities: 'Mercado de mercancías',
  VoucherRedemption: 'Oficina de canje', Exploration: 'Cartografía universal', Shipyard: 'Astillero', Outfitting: 'Equipamiento',
  CarrierFuel: 'Depósito de tritio', VistaGenomics: 'Vista Genomics', PioneerSupplies: 'Pioneer Supplies', Bartender: 'Bar',
  BlackMarket: 'Mercado negro',
};
const ACCESS = { all: 'Todos', none: 'Nadie', friends: 'Amigos', squadron: 'Escuadrón', squadronfriends: 'Escuadrón y amigos' };
const FUEL_MAX = 1000; // toneladas de tritio en el depósito

function create() {
  return { own: null, location: null, squadron: null, jump: null, lastJump: null, log: [] };
}
const C = (state) => state.carrier || (state.carrier = create());
const own = (X, e) => X.own || (X.own = { id: e.CarrierID ?? null, callsign: null, name: null, docking: null, notorious: null, fuel: null, jumpRange: null, space: null, finance: null, crew: [], at: null });
const isSquadron = (e) => /squadron/i.test(String(e.CarrierType || ''));
function log(X, e, text) {
  // el historial puede repasar eventos que ya estaban en carrier.json
  if (X.log.some((x) => x.at === (e.timestamp || null) && x.text === text)) return;
  X.log.push({ at: e.timestamp || null, text });
  X.log.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  if (X.log.length > 30) X.log.splice(0, X.log.length - 30);
}

function apply(state, e) {
  if (!/^Carrier/.test(e.event || '')) return false;
  const X = C(state);
  const sq = isSquadron(e);
  // los eventos del carrier del escuadrón solo cuentan para su ubicación
  if (sq) {
    if (e.event === 'CarrierLocation') X.squadron = { id: e.CarrierID ?? null, system: e.StarSystem || null, address: e.SystemAddress ?? null, at: e.timestamp || null };
    return true;
  }
  switch (e.event) {
    case 'CarrierLocation':
      X.location = { system: e.StarSystem || null, address: e.SystemAddress ?? null, bodyId: e.BodyID ?? null, at: e.timestamp || null };
      if (X.jump && X.jump.system === e.StarSystem) X.jump = null;
      own(X, e);
      return true;
    case 'CarrierStats': {
      const O = own(X, e);
      Object.assign(O, {
        id: e.CarrierID ?? O.id, callsign: e.Callsign || O.callsign, name: e.Name || O.name, docking: e.DockingAccess || null, notorious: !!e.AllowNotorious,
        fuel: e.FuelLevel ?? null, jumpRange: e.JumpRangeCurr ?? null, jumpRangeMax: e.JumpRangeMax ?? null, decommission: !!e.PendingDecommission,
        space: e.SpaceUsage || null, finance: e.Finance || null,
        crew: (e.Crew || []).map((c) => ({ role: c.CrewRole, name: c.CrewName || null, active: !!c.Activated, enabled: c.Enabled !== false })),
        at: e.timestamp || null,
      });
      return true;
    }
    case 'CarrierJumpRequest':
      X.jump = { system: e.SystemName || null, body: e.Body || null, address: e.SystemAddress ?? null, departure: e.DepartureTime || null, requestedAt: e.timestamp || null };
      log(X, e, `Salto programado a ${e.SystemName || '—'}`);
      return true;
    case 'CarrierJumpCancelled':
      if (X.jump) log(X, e, `Salto a ${X.jump.system || '—'} cancelado`);
      X.jump = null;
      return true;
    case 'CarrierJump':
      // también llega al saltar a bordo del carrier de otro: solo cuenta si es el tuyo
      if (X.own && X.own.id != null && e.MarketID != null && e.MarketID !== X.own.id) return true;
      X.location = { system: e.StarSystem || null, address: e.SystemAddress ?? null, bodyId: e.BodyID ?? null, at: e.timestamp || null };
      X.lastJump = { system: e.StarSystem || null, at: e.timestamp || null };
      X.jump = null;
      log(X, e, `Saltó a ${e.StarSystem || '—'}`);
      return true;
    case 'CarrierDepositFuel': {
      const O = own(X, e);
      O.fuel = e.Total ?? O.fuel;
      log(X, e, `Tritio cargado: ${e.Amount} t (total ${e.Total} t)`);
      return true;
    }
    case 'CarrierFinance': {
      const O = own(X, e);
      O.finance = { ...(O.finance || {}), CarrierBalance: e.CarrierBalance, ReserveBalance: e.ReserveBalance, AvailableBalance: e.AvailableBalance, ReservePercent: e.ReservePercent };
      return true;
    }
    case 'CarrierBankTransfer': {
      const O = own(X, e);
      O.finance = { ...(O.finance || {}), CarrierBalance: e.CarrierBalance };
      log(X, e, e.Deposit ? `Ingreso de ${e.Deposit} CR` : `Retirada de ${e.Withdraw} CR`);
      return true;
    }
    case 'CarrierCrewServices': {
      const O = own(X, e);
      const c = O.crew.find((x) => x.role === e.CrewRole) || (O.crew.push({ role: e.CrewRole, name: null, active: false, enabled: true }), O.crew[O.crew.length - 1]);
      if (e.Operation === 'Activate') { c.active = true; c.enabled = true; }
      if (e.Operation === 'Deactivate') { c.active = false; }
      if (e.Operation === 'Pause') c.enabled = false;
      if (e.Operation === 'Resume') c.enabled = true;
      if (e.CrewName) c.name = e.CrewName;
      log(X, e, `${ROLE[e.CrewRole] || e.CrewRole}: ${({ Activate: 'activado', Deactivate: 'desactivado', Pause: 'en pausa', Resume: 'reanudado', Replace: 'tripulante nuevo' })[e.Operation] || e.Operation}`);
      return true;
    }
    case 'CarrierDockingPermission': { const O = own(X, e); O.docking = e.DockingAccess || O.docking; O.notorious = !!e.AllowNotorious; return true; }
    case 'CarrierNameChange': { const O = own(X, e); O.name = e.Name || O.name; O.callsign = e.Callsign || O.callsign; return true; }
    case 'CarrierDecommission': { const O = own(X, e); O.decommission = true; return true; }
    case 'CarrierCancelDecommission': { const O = own(X, e); O.decommission = false; return true; }
    default: return true;
  }
}

function view(state, now = Date.now()) {
  const X = state.carrier || create();
  const O = X.own;
  let jump = null;
  if (X.jump) {
    const dep = Date.parse(X.jump.departure || '');
    jump = { ...X.jump, left: dep ? Math.max(0, dep - now) : null, done: dep ? now >= dep : false };
  }
  // si la hora de salida ya pasó y no estabas a bordo, el carrier ya está en el sistema nuevo
  const location = jump && jump.done ? { system: jump.system, address: jump.address, at: jump.departure, assumed: true } : X.location;
  const space = O && O.space ? { total: O.space.TotalCapacity, crew: O.space.Crew, cargo: O.space.Cargo, reserved: O.space.CargoSpaceReserved, ships: O.space.ShipPacks, modules: O.space.ModulePacks, free: O.space.FreeSpace } : null;
  const fin = O && O.finance ? { balance: O.finance.CarrierBalance ?? null, reserve: O.finance.ReserveBalance ?? null, available: O.finance.AvailableBalance ?? null, reservePct: O.finance.ReservePercent ?? null, taxes: { rearm: O.finance.TaxRate_rearm, refuel: O.finance.TaxRate_refuel, repair: O.finance.TaxRate_repair } } : null;
  const crew = O ? O.crew.filter((c) => c.role !== 'Captain').map((c) => ({ ...c, label: ROLE[c.role] || c.role })).sort((a, b) => Number(b.active) - Number(a.active) || a.label.localeCompare(b.label)) : [];
  const here = state.location.system;
  return {
    has: !!(O || X.location), name: O && O.name, callsign: O && O.callsign, docking: O && O.docking ? ACCESS[O.docking] || O.docking : null, notorious: O ? O.notorious : null,
    fuel: O ? O.fuel : null, fuelMax: FUEL_MAX, jumpRange: O ? O.jumpRange : null, decommission: !!(O && O.decommission), statsAt: O && O.at,
    location, here: !!(location && here && location.system === here), jump: jump && !jump.done ? jump : null, lastJump: X.lastJump,
    space, finance: fin, crew, captain: O && (O.crew.find((c) => c.role === 'Captain') || {}).name, log: X.log.slice().reverse(),
    squadron: X.squadron,
  };
}

module.exports = { create, apply, view, ROLE, FUEL_MAX };
