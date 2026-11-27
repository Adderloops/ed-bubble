'use strict';

/**
 * ED BUBBLE · CMDR: rangos, progreso, reputación con las superpotencias,
 * escuadrón, estadísticas y flota.
 *
 * Eventos: Rank, Progress, Reputation y Statistics (al cargar la partida),
 * Promotion (al subir de rango), SquadronStartup, StoredShips (al abrir el
 * astillero: naves aquí y en otras estaciones) y los cambios de nave
 * (ShipyardSwap, ShipyardBuy, ShipyardSell, ShipyardTransfer, SellShipOnRebuy,
 * SetUserShipName) para tener la flota al día entre visitas al astillero.
 */

const RANKS = {
  Combat: ['Inofensivo', 'Casi inofensivo', 'Novato', 'Competente', 'Experto', 'Maestro', 'Peligroso', 'Letal', 'Élite'],
  Trade: ['Sin blanca', 'Casi sin blanca', 'Buhonero', 'Distribuidor', 'Mercader', 'Corredor', 'Emprendedor', 'Magnate', 'Élite'],
  Explore: ['Sin rumbo', 'Casi sin rumbo', 'Batidor', 'Topógrafo', 'Abrecaminos', 'Rastreador', 'Guardabosques', 'Pionero', 'Élite'],
  Soldier: ['Indefenso', 'Casi indefenso', 'Recluta', 'Soldado', 'Pistolero', 'Guerrero', 'Gladiador', 'Tirador certero', 'Élite'],
  Exobiologist: ['Sin rumbo fijo', 'Casi sin rumbo fijo', 'Recopilador', 'Coleccionista', 'Catalogador', 'Taxónomo', 'Ecólogo', 'Genetista', 'Élite'],
  CQC: ['Indefenso', 'Casi indefenso', 'Aficionado', 'Semiprofesional', 'Profesional', 'Campeón', 'Héroe', 'Leyenda', 'Élite'],
  Empire: ['Ninguno', 'Forastero', 'Siervo', 'Señor', 'Escudero', 'Caballero', 'Lord', 'Barón', 'Vizconde', 'Conde', 'Earl', 'Marqués', 'Duque', 'Príncipe', 'Rey'],
  Federation: ['Ninguno', 'Recluta', 'Cadete', 'Guardiamarina', 'Suboficial', 'Suboficial mayor', 'Subteniente', 'Alférez', 'Teniente', 'Capitán de corbeta', 'Capitán de fragata', 'Capitán de navío', 'Contraalmirante', 'Vicealmirante', 'Almirante'],
};
const RANK_LABEL = { Combat: 'Combate', Trade: 'Comercio', Explore: 'Exploración', Soldier: 'Mercenario', Exobiologist: 'Exobiología', CQC: 'CQC', Empire: 'Imperio', Federation: 'Federación' };

function rankName(kind, n) {
  const list = RANKS[kind];
  if (!list || n == null) return null;
  if (n < list.length) return list[n];
  return `Élite ${['I', 'II', 'III', 'IV', 'V'][n - list.length] || n - list.length + 1}`; // Élite I-V (rangos 9-13)
}

/** Nivel de reputación con una superpotencia (-100..100), con los umbrales habituales del juego. */
function repLevel(v) {
  if (v == null) return null;
  if (v >= 90) return 'Aliado';
  if (v >= 35) return 'Amistoso';
  if (v >= 4) return 'Cordial';
  if (v > -35) return 'Neutral';
  if (v > -90) return 'Poco amistoso';
  return 'Hostil';
}

function create() {
  return { ranks: null, progress: null, reputation: null, stats: null, statsAt: null, squadron: null, fleet: null, fleetAt: null, fleetStation: null };
}

const fleetOf = (st) => st.cmdr.extra || (st.cmdr.extra = create());

function apply(state, e) {
  const X = fleetOf(state);
  switch (e.event) {
    case 'Rank': X.ranks = pick(e); return true;
    case 'Progress': X.progress = pick(e); return true;
    case 'Promotion': {
      X.ranks = X.ranks || {};
      for (const k of Object.keys(RANKS)) if (e[k] != null) { X.ranks[k] = e[k]; if (X.progress) X.progress[k] = 0; }
      return true;
    }
    case 'Reputation': X.reputation = { Empire: e.Empire ?? null, Federation: e.Federation ?? null, Alliance: e.Alliance ?? null, Independent: e.Independent ?? null }; return true;
    case 'Statistics': { const { timestamp, event, ...rest } = e; X.stats = rest; X.statsAt = timestamp || null; return true; }
    case 'SquadronStartup': case 'JoinedSquadron': case 'SquadronPromotion': case 'SquadronDemotion':
      X.squadron = { name: e.SquadronName || (X.squadron && X.squadron.name) || null, rank: e.CurrentRankName || e.NewRankName || (X.squadron && X.squadron.rank) || null };
      return true;
    case 'LeftSquadron': case 'KickedFromSquadron': case 'DisbandedSquadron': X.squadron = null; return true;
    case 'StoredShips': {
      const here = (e.ShipsHere || []).map((s) => ship(s, { system: e.StarSystem, station: e.StationName }));
      const remote = (e.ShipsRemote || []).map((s) => ship(s, { system: s.StarSystem || null, station: null, inTransit: !!s.InTransit }));
      X.fleet = [...here, ...remote];
      X.fleetAt = e.timestamp || null; X.fleetStation = e.StationName || null;
      return true;
    }
    case 'ShipyardSwap': {
      if (!X.fleet) return false;
      // la nave que dejas se queda en esta estación; la que coges pasa a ser la actual
      const loc = { system: state.location.system, station: state.location.station };
      const old = X.fleet.find((s) => s.id === e.StoreShipID);
      if (old) Object.assign(old, loc, { inTransit: false });
      else if (e.StoreShipID != null) X.fleet.push({ id: e.StoreShipID, type: e.StoreOldShip, typeName: null, name: null, value: null, ...loc });
      X.fleet = X.fleet.filter((s) => s.id !== e.ShipID);
      return true;
    }
    case 'ShipyardBuy': {
      if (!X.fleet || e.StoreShipID == null) return false;
      const loc = { system: state.location.system, station: state.location.station };
      if (!X.fleet.some((s) => s.id === e.StoreShipID)) X.fleet.push({ id: e.StoreShipID, type: e.StoreOldShip, typeName: null, name: null, value: null, ...loc });
      return true;
    }
    case 'ShipyardSell': case 'SellShipOnRebuy': if (X.fleet) X.fleet = X.fleet.filter((s) => s.id !== (e.SellShipID ?? e.SellShipId)); return true;
    case 'ShipyardTransfer': {
      const s = X.fleet && X.fleet.find((x) => x.id === e.ShipID);
      if (s) Object.assign(s, { system: state.location.system, station: state.location.station, inTransit: true });
      return true;
    }
    case 'SetUserShipName': { const s = X.fleet && X.fleet.find((x) => x.id === e.ShipID); if (s) s.name = e.UserShipName || s.name; return true; }
    default: return false;
  }
}

function pick(e) {
  const o = {};
  for (const k of Object.keys(RANKS)) if (e[k] != null) o[k] = e[k];
  return o;
}
function ship(s, loc) {
  return { id: s.ShipID, type: s.ShipType, typeName: s.ShipType_Localised || null, name: s.Name || null, value: s.Value ?? null, hot: !!s.Hot, ...loc };
}

/* Estadísticas (evento Statistics): las cifras más útiles, con su nombre en español */
const STAT_GROUPS = [
  ['banco', 'Banco', 'Bank_Account', [['Current_Wealth', 'Patrimonio total', 'cr'], ['Owned_Ship_Count', 'Naves'], ['Spent_On_Ships', 'Gastado en naves', 'cr'], ['Spent_On_Outfitting', 'Gastado en equipamiento', 'cr'], ['Spent_On_Repairs', 'Reparaciones', 'cr'], ['Spent_On_Insurance', 'Seguros', 'cr'], ['Insurance_Claims', 'Reclamaciones al seguro'], ['Suits_Owned', 'Trajes'], ['Weapons_Owned', 'Armas'], ['Spent_On_Fuel', 'Combustible', 'cr']]],
  ['combate', 'Combate', 'Combat', [['Bounties_Claimed', 'Recompensas cobradas'], ['Bounty_Hunting_Profit', 'Beneficio de recompensas', 'cr'], ['Combat_Bonds', 'Bonos de combate'], ['Combat_Bond_Profits', 'Beneficio de bonos', 'cr'], ['Assassinations', 'Asesinatos por encargo'], ['Assassination_Profits', 'Beneficio de asesinatos', 'cr'], ['Highest_Single_Reward', 'Mayor recompensa', 'cr'], ['OnFoot_Combat_Bonds', 'Bonos a pie'], ['Dropships_Taken', 'Naves de desembarco'], ['ConflictZone_Total', 'Zonas de conflicto']]],
  ['comercio', 'Comercio', 'Trading', [['Market_Profits', 'Beneficio en mercados', 'cr'], ['Markets_Traded_With', 'Mercados'], ['Resources_Traded', 'Toneladas comerciadas'], ['Average_Profit', 'Beneficio medio', 'cr'], ['Highest_Single_Transaction', 'Mayor operación', 'cr'], ['Data_Sold', 'Datos vendidos'], ['Goods_Sold', 'Bienes vendidos'], ['Assets_Sold', 'Activos vendidos']]],
  ['exploracion', 'Exploración', 'Exploration', [['Systems_Visited', 'Sistemas visitados'], ['Exploration_Profits', 'Beneficio de exploración', 'cr'], ['Planets_Scanned_To_Level_3', 'Planetas escaneados (detalle)'], ['Efficient_Scans', 'Mapeos eficientes'], ['Highest_Payout', 'Mayor venta', 'cr'], ['Total_Hyperspace_Jumps', 'Saltos'], ['Total_Hyperspace_Distance', 'Distancia saltada', 'ly'], ['Greatest_Distance_From_Start', 'Máxima distancia al inicio', 'ly'], ['Time_Played', 'Tiempo jugado', 'time'], ['OnFoot_Distance_Travelled', 'Distancia a pie', 'm']]],
  ['exobio', 'Exobiología', 'Exobiology', [['Organic_Data_Profits', 'Beneficio de exobiología', 'cr'], ['Organic_Data', 'Datos vendidos'], ['Organic_Genus_Encountered', 'Géneros encontrados'], ['Organic_Species_Encountered', 'Especies encontradas'], ['Organic_Variant_Encountered', 'Variantes encontradas'], ['First_Logged', 'Primeros registros'], ['First_Logged_Profits', 'Beneficio de primeros registros', 'cr'], ['Organic_Systems', 'Sistemas con vida'], ['Organic_Planets', 'Planetas con vida']]],
  ['mineria', 'Minería', 'Mining', [['Mining_Profits', 'Beneficio de minería', 'cr'], ['Quantity_Mined', 'Toneladas minadas'], ['Materials_Collected', 'Materiales recogidos']]],
  ['delitos', 'Delitos', 'Crime', [['Notoriety', 'Notoriedad'], ['Fines', 'Multas'], ['Total_Fines', 'Total en multas', 'cr'], ['Bounties_Received', 'Recompensas por ti'], ['Total_Bounties', 'Total en recompensas', 'cr'], ['Highest_Bounty', 'Mayor recompensa por ti', 'cr'], ['Total_Murders', 'Asesinatos'], ['Goods_Stolen', 'Bienes robados'], ['Data_Stolen', 'Datos robados']]],
  ['rescate', 'Pasaje y rescate', null, [['Passengers.Passengers_Missions_Delivered', 'Pasajeros entregados'], ['Passengers.Passengers_Missions_Accepted', 'Misiones de pasaje'], ['Search_And_Rescue.SearchRescue_Count', 'Rescates entregados'], ['Search_And_Rescue.SearchRescue_Profit', 'Beneficio de rescate', 'cr'], ['Smuggling.Resources_Smuggled', 'Toneladas de contrabando'], ['Smuggling.Black_Markets_Profits', 'Beneficio en mercado negro', 'cr']]],
  ['ingenieria', 'Ingeniería', null, [['Crafting.Count_Of_Used_Engineers', 'Ingenieros usados'], ['Crafting.Recipes_Generated', 'Mejoras hechas'], ['Crafting.Recipes_Generated_Rank_5', 'Mejoras de grado 5'], ['Crafting.Suit_Mods_Applied', 'Mejoras de traje'], ['Crafting.Weapon_Mods_Applied', 'Mejoras de arma'], ['Material_Trader_Stats.Trades_Completed', 'Cambios de materiales'], ['Material_Trader_Stats.Materials_Traded', 'Materiales cambiados'], ['Crew.NpcCrew_TotalWages', 'Sueldos de tripulación', 'cr']]],
  ['carrier', 'Carrier', 'FLEETCARRIER', [['FLEETCARRIER_TOTAL_JUMPS', 'Saltos del carrier'], ['FLEETCARRIER_DISTANCE_TRAVELLED', 'Distancia del carrier', 'ly'], ['FLEETCARRIER_TRADEPROFIT_TOTAL', 'Beneficio del mercado', 'cr'], ['FLEETCARRIER_EXPORT_TOTAL', 'Toneladas vendidas'], ['FLEETCARRIER_IMPORT_TOTAL', 'Toneladas compradas'], ['FLEETCARRIER_REARM_TOTAL', 'Rearmes'], ['FLEETCARRIER_REFUEL_TOTAL', 'Repostajes'], ['FLEETCARRIER_REPAIRS_TOTAL', 'Reparaciones']]],
];

function statGroups(stats) {
  if (!stats) return [];
  return STAT_GROUPS.map(([id, label, base, rows]) => ({
    id, label,
    rows: rows.map(([path, name, unit]) => {
      const parts = base ? [base, path] : path.split('.');
      let v = stats; for (const p of parts) v = v && typeof v === 'object' ? v[p] : undefined;
      return v == null ? null : { name, value: Number(v), unit: unit || null };
    }).filter(Boolean),
  })).filter((g) => g.rows.length);
}

function view(state) {
  const X = state.cmdr.extra || create();
  const ranks = X.ranks ? Object.keys(RANKS).filter((k) => X.ranks[k] != null).map((k) => ({
    kind: k, label: RANK_LABEL[k], rank: X.ranks[k], name: rankName(k, X.ranks[k]),
    next: X.ranks[k] + 1 < (['Empire', 'Federation'].includes(k) ? RANKS[k].length : RANKS[k].length + 5) ? rankName(k, X.ranks[k] + 1) : null,
    progress: X.progress && X.progress[k] != null ? X.progress[k] : null,
  })) : [];
  const rep = X.reputation ? [['Federation', 'Federación'], ['Empire', 'Imperio'], ['Alliance', 'Alianza'], ['Independent', 'Independientes']].map(([k, label]) => ({ kind: k, label, value: X.reputation[k], level: repLevel(X.reputation[k]) })) : [];
  const B = X.stats && X.stats.Bank_Account;
  const time = X.stats && X.stats.Exploration && X.stats.Exploration.Time_Played;
  const current = state.ship && state.ship.type ? { current: true, id: state.ship.loadout && state.ship.loadout.ShipID, type: state.ship.type, typeName: state.ship.typeLocalised, name: state.ship.name, value: state.ship.loadout ? (state.ship.loadout.HullValue || 0) + (state.ship.loadout.ModulesValue || 0) : null, system: state.location.system, station: state.location.docked ? state.location.station : null } : null;
  const fleet = [...(current ? [current] : []), ...((X.fleet || []).filter((s) => !current || s.id !== current.id))];
  return {
    name: state.cmdr.name, credits: state.cmdr.credits, legalState: state.cmdr.legalState,
    wealth: B ? B.Current_Wealth : null, timePlayed: time || null, statsAt: X.statsAt,
    squadron: X.squadron, ranks, rep, stats: statGroups(X.stats),
    fleet, fleetAt: X.fleetAt, fleetStation: X.fleetStation, fleetValue: fleet.reduce((t, s) => t + (s.value || 0), 0),
  };
}

module.exports = { create, apply, view, rankName, repLevel, RANKS };
