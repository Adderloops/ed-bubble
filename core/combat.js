'use strict';

/**
 * Combate con la nave: lee del Journal el objetivo fijado (ShipTargeted), la
 * zona de combate o de extracción en la que estás, las bajas (bonos de combate
 * y recompensas), lo que tienes por cobrar, las misiones de masacre y los
 * conflictos del sistema. No usa pips, grupo de fuego ni arma seleccionada.
 */

let SHIPS = null;
function shipName(sym, localised) {
  if (localised && !/^\$/.test(localised)) return localised;
  if (!sym) return null;
  if (!SHIPS) { try { SHIPS = require('./data/shipdata.json').ships || {}; } catch (e) { SHIPS = {}; } }
  const k = String(sym).toLowerCase();
  return (SHIPS[k] && SHIPS[k].n) || sym;
}

const RANK_ES = ['Inofensivo', 'Casi inofensivo', 'Novato', 'Competente', 'Experto', 'Maestro', 'Peligroso', 'Letal', 'Élite'];
const RANK_EN = ['Harmless', 'Mostly Harmless', 'Novice', 'Competent', 'Expert', 'Master', 'Dangerous', 'Deadly', 'Elite'];
const rankEs = (r) => { const i = RANK_EN.indexOf(r); return i >= 0 ? RANK_ES[i] : r || null; };

const LEGAL_ES = { Clean: 'Limpio', Wanted: 'Buscado', Lawless: 'Sin ley', Enemy: 'Enemigo', WantedEnemy: 'Enemigo buscado', Hunter: 'Cazador', Warrant: 'Orden de arresto', Thargoid: 'Thargoid' };
// objetivo que puedes atacar sin cometer delito
const HOSTILE = new Set(['Wanted', 'Lawless', 'Enemy', 'WantedEnemy', 'Thargoid']);

const INTENSITY = { Low: 'Baja', Med: 'Media', High: 'Alta', VeryHigh: 'Muy alta' };
// $MULTIPLAYER_SCENARIOnn_TITLE; (balizas y zonas de extracción)
const SCENARIO = { 14: 'Zona de extracción', 77: 'Zona de extracción · baja', 78: 'Zona de extracción · alta', 79: 'Zona de extracción · peligrosa', 42: 'Baliza de navegación', 80: 'Baliza de navegación comprometida' };

function create() {
  return {
    target: null,
    zone: null,
    session: { since: null, bonds: 0, bondCr: 0, bounties: 0, bountyCr: 0, deaths: 0, interdicted: 0, escaped: 0 },
    kills: [], // últimas bajas
    vouchers: { bonds: {}, bounties: {} }, // por cobrar, por facción: { n, cr }
    massacre: [], // misiones de masacre activas
    conflicts: [], // conflictos del sistema actual
    fighter: null, // caza embarcado fuera: { name, at }
    lastActionAt: null, // último ataque, baja o entrada en zona (para el salto automático)
  };
}

/** Zona en la que caes desde supercrucero (null si no es de combate). */
function zoneFrom(e) {
  const t = String(e.Type || '');
  let m = t.match(/^\$Warzone_PointRace_(\w+?)(?::|;|$)/i);
  if (m) return { kind: 'cz', name: `Zona de conflicto · intensidad ${(INTENSITY[m[1]] || m[1]).toLowerCase()}`, intensity: INTENSITY[m[1]] || m[1] };
  if (/^\$Warzone_TG/i.test(t)) return { kind: 'ax', name: e.Type_Localised || 'Zona de conflicto thargoid' };
  m = t.match(/^\$MULTIPLAYER_SCENARIO(\d+)_TITLE/i);
  if (m && SCENARIO[m[1]]) return { kind: /baliza/i.test(SCENARIO[m[1]]) ? 'beacon' : 'res', name: SCENARIO[m[1]] };
  return null;
}

function touch(c, e) { c.lastActionAt = e.timestamp || c.lastActionAt; }

function addVoucher(map, faction, cr) {
  const k = faction || '';
  const v = map[k] || (map[k] = { n: 0, cr: 0 });
  v.n += 1; v.cr += Number(cr) || 0;
}

/** Una baja cuenta para la primera misión sin terminar de cada facción emisora (como en el juego). */
function countKill(c, victim, at) {
  if (!victim) return;
  const seen = new Set();
  // el juego escribe MissionRedirected justo antes de la baja que completa la misión: esa baja ya está contada
  for (const m of c.massacre) {
    if (m.gap > 0 && m.target === victim && at && m.redirectedAt && Math.abs(Date.parse(at) - Date.parse(m.redirectedAt)) < 5000) { m.gap -= 1; seen.add(m.faction); }
  }
  for (const m of c.massacre.slice().sort((a, b) => String(a.at).localeCompare(String(b.at)))) {
    if (m.done || m.target !== victim || seen.has(m.faction)) continue;
    seen.add(m.faction);
    m.kills += 1;
    if (m.kills >= m.need) m.done = true;
  }
}

function kill(c, e, kind, reward, victim, ship, pilot) {
  const S = c.session;
  if (kind === 'bond') { S.bonds += 1; S.bondCr += reward; } else { S.bounties += 1; S.bountyCr += reward; }
  if (c.zone) { if (kind === 'bond') { c.zone.bonds += 1; c.zone.bondCr += reward; } else { c.zone.bounties += 1; c.zone.bountyCr += reward; } }
  c.kills.unshift({ at: e.timestamp || null, kind, reward, faction: victim || null, ship: ship || null, pilot: pilot || null });
  if (c.kills.length > 30) c.kills.length = 30;
  countKill(c, victim, e.timestamp);
  touch(c, e);
}

/** Nave del último objetivo, si era de la facción de la víctima y hace menos de 2 minutos. */
function lastShipOf(c, faction, at) {
  const t = c.lastTargetSeen;
  if (!t || (faction && t.faction && t.faction !== faction)) return null;
  if (at && t.at && Date.parse(at) - Date.parse(t.at) > 120000) return null;
  return t.ship;
}

const H = {
  LoadGame(c, e) { c.session = { ...create().session, since: e.timestamp || null }; c.target = null; c.zone = null; c.fighter = null; },
  ShipTargeted(c, e) {
    if (e.TargetLocked === false) { c.target = null; return; }
    const prev = c.target && c.target.sym === e.Ship ? c.target : null;
    const t = {
      sym: e.Ship || null,
      ship: shipName(e.Ship, e.Ship_Localised),
      stage: e.ScanStage ?? 0,
      pilot: e.PilotName_Localised || (prev && prev.pilot) || null,
      rank: e.PilotRank ? rankEs(e.PilotRank) : (prev && prev.rank) || null,
      faction: e.Faction || (prev && prev.faction) || null,
      legal: e.LegalStatus || (prev && prev.legal) || null,
      bounty: e.Bounty ?? (prev && prev.bounty) ?? null,
      shield: e.ShieldHealth ?? (prev && prev.shield) ?? null,
      hull: e.HullHealth ?? (prev && prev.hull) ?? null,
      subsystem: e.Subsystem_Localised || e.Subsystem || null,
      subSym: e.Subsystem || null,
      subHealth: e.SubsystemHealth ?? null,
      power: e.Power || (prev && prev.power) || null,
      at: e.timestamp || null,
    };
    c.targetSeq = (c.targetSeq || 0) + 1; t.seq = c.targetSeq;
    t.legalEs = t.legal ? (LEGAL_ES[t.legal] || t.legal) : null;
    t.hostile = t.legal ? HOSTILE.has(t.legal) : null;
    c.target = t;
    if (t.faction) c.lastTargetSeen = { ship: t.ship, faction: t.faction, at: t.at };
  },
  SupercruiseDestinationDrop(c, e) {
    const z = zoneFrom(e);
    c.zone = z ? { ...z, at: e.timestamp || null, side: null, enemy: null, bonds: 0, bondCr: 0, bounties: 0, bountyCr: 0 } : null;
    if (z) touch(c, e);
  },
  SupercruiseEntry(c) { c.zone = null; c.target = null; },
  FSDJump(c, e) { c.zone = null; c.target = null; c.conflicts = conflictsFrom(e); },
  Location(c, e) { c.conflicts = conflictsFrom(e); },
  Docked(c) { c.zone = null; c.target = null; },
  UnderAttack(c, e) { if (!e.Target || e.Target === 'You') touch(c, e); },
  FactionKillBond(c, e) {
    const r = Number(e.Reward) || 0;
    if (c.zone && !c.zone.side) { c.zone.side = e.AwardingFaction || null; c.zone.enemy = e.VictimFaction || null; }
    addVoucher(c.vouchers.bonds, e.AwardingFaction, r);
    kill(c, e, 'bond', r, e.VictimFaction, lastShipOf(c, e.VictimFaction, e.timestamp), null);
  },
  CapShipBond(c, e) {
    const r = Number(e.Reward) || 0;
    addVoucher(c.vouchers.bonds, e.AwardingFaction, r);
    kill(c, e, 'bond', r, e.VictimFaction, 'Nave capital', null);
  },
  Bounty(c, e) {
    const r = Number(e.TotalReward ?? e.Reward) || 0;
    if (Array.isArray(e.Rewards)) for (const x of e.Rewards) addVoucher(c.vouchers.bounties, x.Faction, x.Reward);
    else addVoucher(c.vouchers.bounties, e.Faction, r);
    kill(c, e, 'bounty', r, e.VictimFaction, shipName(e.Target, e.Target_Localised), e.PilotName_Localised || null);
  },
  RedeemVoucher(c, e) {
    const t = String(e.Type || '').toLowerCase();
    if (t === 'combatbond') {
      if (e.Faction) delete c.vouchers.bonds[e.Faction]; else c.vouchers.bonds = {};
    } else if (t === 'bounty') {
      const list = Array.isArray(e.Factions) ? e.Factions : [{ Faction: e.Faction }];
      // en un Interstellar Factors la facción viene vacía: se cobra todo
      if (list.some((x) => !x.Faction)) c.vouchers.bounties = {};
      else for (const x of list) delete c.vouchers.bounties[x.Faction];
    }
  },
  Died(c, e) {
    c.vouchers = { bonds: {}, bounties: {} }; // al morir se pierden
    c.session.deaths += 1; c.zone = null; c.target = null; c.fighter = null; touch(c, e);
  },
  Interdicted(c, e) { c.session.interdicted += 1; touch(c, e); },
  EscapeInterdiction(c, e) { c.session.escaped += 1; touch(c, e); },
  LaunchFighter(c, e) { c.fighter = { name: e._Localised || e.Loadout || 'Caza', crew: e.PlayerControlled === false, at: e.timestamp || null }; },
  DockFighter(c) { c.fighter = null; },
  FighterDestroyed(c) { c.fighter = null; },
  MissionAccepted(c, e) {
    if (!/massacre/i.test(e.Name || '') || !e.KillCount) return;
    c.massacre.push({
      id: e.MissionID, faction: e.Faction || null, target: e.TargetFaction || null, need: Number(e.KillCount) || 0, kills: 0,
      reward: Number(e.Reward) || 0, expiry: e.Expiry || null, wing: !!e.Wing, at: e.timestamp || null, done: false,
      system: e.DestinationSystem || null, station: e.DestinationStation || null, name: e.LocalisedName || null,
    });
  },
  MissionRedirected(c, e) { const m = c.massacre.find((x) => x.id === e.MissionID); if (m) { m.gap = Math.max(0, m.need - m.kills); m.redirectedAt = e.timestamp || null; m.done = true; m.kills = Math.max(m.kills, m.need); } },
  MissionCompleted(c, e) { c.massacre = c.massacre.filter((x) => x.id !== e.MissionID); },
  MissionAbandoned(c, e) { c.massacre = c.massacre.filter((x) => x.id !== e.MissionID); },
  MissionFailed(c, e) { c.massacre = c.massacre.filter((x) => x.id !== e.MissionID); },
  Missions(c, e) {
    if (!Array.isArray(e.Active)) return;
    const ids = new Set(e.Active.map((x) => x.MissionID));
    c.massacre = c.massacre.filter((x) => ids.has(x.id));
  },
};

const WAR_ES = { war: 'Guerra', civilwar: 'Guerra civil', election: 'Elecciones' };
function conflictsFrom(e) {
  return (e.Conflicts || []).map((x) => ({
    type: WAR_ES[String(x.WarType || '').toLowerCase()] || x.WarType || '—',
    status: x.Status === 'active' ? 'En curso' : x.Status === 'pending' ? 'Pendiente' : x.Status ? x.Status : 'Terminado',
    a: { name: (x.Faction1 || {}).Name || '—', stake: (x.Faction1 || {}).Stake || '', won: (x.Faction1 || {}).WonDays ?? 0 },
    b: { name: (x.Faction2 || {}).Name || '—', stake: (x.Faction2 || {}).Stake || '', won: (x.Faction2 || {}).WonDays ?? 0 },
  }));
}

/** Aplica un evento del Journal al combate (si le interesa). */
function apply(state, e) {
  const h = H[e.event];
  if (!h) return;
  if (!state.combat) state.combat = create();
  h(state.combat, e);
}

/** Tras leer los diarios antiguos: solo se conserva lo que sigue vigente. */
function afterHistory(state) {
  const c = state.combat || (state.combat = create());
  const fresh = create();
  c.target = null; c.zone = null; c.fighter = null; c.lastActionAt = null; c.lastTargetSeen = null;
  c.session = fresh.session; c.kills = [];
}

const sum = (map) => Object.values(map).reduce((a, v) => a + v.cr, 0);

/** Datos para la pantalla. */
function view(state, nowMs) {
  const c = state.combat || create();
  const now = nowMs || Date.now();
  const list = (map) => Object.entries(map).map(([faction, v]) => ({ faction: faction || 'Sin facción', n: v.n, cr: v.cr })).sort((a, b) => b.cr - a.cr);
  const massacre = c.massacre.filter((m) => !m.expiry || Date.parse(m.expiry) > now);
  // por facción objetivo: bajas que aún hacen falta (la pila más larga manda)
  const stacks = {};
  for (const m of massacre) {
    const s = stacks[m.target] || (stacks[m.target] = { target: m.target, issuers: {}, reward: 0, missions: 0, done: 0 });
    s.issuers[m.faction] = (s.issuers[m.faction] || 0) + Math.max(0, m.need - m.kills);
    s.reward += m.reward; s.missions += 1; if (m.done) s.done += 1;
  }
  const stackList = Object.values(stacks).map((s) => ({ ...s, left: Math.max(0, ...Object.values(s.issuers)) })).sort((a, b) => b.left - a.left);
  return {
    target: c.target,
    zone: c.zone,
    session: c.session,
    kills: c.kills,
    bonds: list(c.vouchers.bonds), bondsTotal: sum(c.vouchers.bonds),
    bounties: list(c.vouchers.bounties), bountiesTotal: sum(c.vouchers.bounties),
    massacre: massacre.slice().sort((a, b) => String(a.target).localeCompare(String(b.target)) || String(a.at).localeCompare(String(b.at))),
    stacks: stackList,
    conflicts: c.conflicts,
    fighter: c.fighter,
    recent: !!(c.lastActionAt && now - Date.parse(c.lastActionAt) < 90000),
  };
}

module.exports = { create, apply, afterHistory, view, zoneFrom, rankEs, LEGAL_ES, EVENTS: Object.keys(H) };
