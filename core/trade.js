'use strict';
/**
 * Comercio: lo que pagaste por lo que llevas (MarketBuy), lo minado y dónde (MiningRefined), lo ganado en
 * la sesión (MarketSell trae el precio medio pagado) y el rango de comercio. La vista cruza la bodega con
 * el mercado de la estación (Market.json) y con el estado de Powerplay del sistema.
 *
 * Méritos de Powerplay por comercio (guía de Powerplay 2.0 de Inara, logbook 84502; reglas orientativas):
 *  - refuerzo (sistema de tu potencia): vender con al menos un 40 % de margen; da igual dónde se compró.
 *  - socavar (sistema de otra potencia): vender mercancías de menos de 500 CR/t.
 *  - minerales: en refuerzo y socavar, minados y vendidos en el mismo sistema; en adquisición, minados en un
 *    sistema fortificado (a 20 al) o bastión (a 30 al) de tu potencia.
 *  - ética Finanzas: +50 % estimado (según la potencia y el tipo de sistema).
 */
const commodityKey = (name) => String(name || '').toLowerCase().replace(/^\$/, '').replace(/_name;?$/, '').replace(/[^a-z0-9]/g, '');

const create = () => ({
  costs: {}, // { clave: { count, total } } coste de lo que llevas
  mined: {}, // { clave: { system, address, count } } dónde minaste lo que llevas
  sessionStart: null,
  session: { bought: 0, sold: 0, profit: 0, tons: 0, sales: 0 },
  rank: null, progress: null,
});

const MARGIN = 0.4; // margen mínimo para méritos en refuerzo
const CHEAP = 500; // CR/t máximo para méritos al socavar
// Potencias con ética Finanzas, por tipo de sistema (misma guía)
const FINANCE = {
  reinforcement: ['Felicia Winters', 'Aisling Duval', 'Edmund Mahon', 'Li Yong-Rui'],
  acquisition: ['Denton Patreus', 'Zemina Torval', 'Edmund Mahon'],
  undermining: ['Felicia Winters', 'Zemina Torval', 'Li Yong-Rui'],
};
// rangos de comercio 0-13 (Penniless … Elite V); «Distribuidor» y «Mercader» son los nombres del juego en español
const TRADE_RANKS = ['Sin blanca', 'Casi sin blanca', 'Buhonero', 'Distribuidor', 'Mercader', 'Corredor', 'Emprendedor', 'Magnate', 'Élite', 'Élite I', 'Élite II', 'Élite III', 'Élite IV', 'Élite V'];

function inSession(X, e) { return !!(X.sessionStart && e.timestamp && e.timestamp >= X.sessionStart); }

function apply(state, e) {
  const X = state.trade;
  switch (e.event) {
    case 'LoadGame': X.sessionStart = e.timestamp || null; X.session = create().session; return true;
    case 'Rank': if (e.Trade != null) X.rank = e.Trade; return true;
    case 'Progress': if (e.Trade != null) X.progress = e.Trade; return true;
    case 'MarketBuy': {
      const k = commodityKey(e.Type); if (!k) return false;
      const c = X.costs[k] || (X.costs[k] = { count: 0, total: 0 });
      c.count += e.Count || 0; c.total += e.TotalCost || (e.BuyPrice || 0) * (e.Count || 0);
      if (inSession(X, e)) X.session.bought += e.TotalCost || 0;
      return true;
    }
    case 'MiningRefined': {
      const k = commodityKey(e.Type); if (!k) return false;
      const sys = e._system !== undefined ? e._system : state.location.system;
      const addr = e._address !== undefined ? e._address : state.location.systemAddress;
      const m = X.mined[k];
      if (m && m.address === addr) m.count += 1; else X.mined[k] = { system: sys, address: addr, count: 1 };
      return true;
    }
    case 'MarketSell': {
      const k = commodityKey(e.Type); if (!k) return false;
      const n = e.Count || 0;
      const c = X.costs[k];
      if (c && c.count > 0) { const avg = c.total / c.count; c.count = Math.max(0, c.count - n); c.total = avg * c.count; if (!c.count) delete X.costs[k]; }
      const m = X.mined[k]; if (m) { m.count = Math.max(0, m.count - n); if (!m.count) delete X.mined[k]; }
      if (inSession(X, e)) {
        X.session.sold += e.TotalSale || 0; X.session.tons += n; X.session.sales += 1;
        X.session.profit += (e.TotalSale || 0) - (e.AvgPricePaid || 0) * n;
      }
      return true;
    }
    case 'EjectCargo': {
      const k = commodityKey(e.Type); const c = X.costs[k];
      if (c && c.count > 0) { const avg = c.total / c.count; c.count = Math.max(0, c.count - (e.Count || 0)); c.total = avg * c.count; }
      return true;
    }
    default: return false;
  }
}

/** Relación del sistema actual con tu potencia: refuerzo, socavar, adquisición o nada. */
function ppRelation(state) {
  const power = state.powerplay && state.powerplay.power;
  const L = state.location;
  if (!power) return { power: null, kind: null };
  const ctl = L.controllingPower || null;
  const st = L.powerplayState || null;
  if (ctl && ctl === power) return { power, kind: 'reinforcement', state: st };
  if (ctl && ctl !== power) return { power, kind: 'undermining', state: st, enemy: ctl };
  if (/unoccupied|contested/i.test(st || '') || (!ctl && L.population > 0)) return { power, kind: 'acquisition', state: st };
  return { power, kind: null, state: st };
}

/** Si vender una mercancía aquí daría méritos, y por qué (o por qué no). */
function meritFor(rel, item, paid, minedHere, mined) {
  if (!rel.kind) return { ok: false, why: rel.power ? 'Este sistema no es de ninguna potencia' : 'No estás jurado a ninguna potencia' };
  if (rel.kind === 'reinforcement') {
    if (minedHere) return { ok: true, why: 'Minado y vendido en este sistema' };
    if (paid == null) return { ok: null, why: 'No sé lo que pagaste' };
    const margin = paid > 0 ? item.sell / paid - 1 : Infinity;
    return margin >= MARGIN ? { ok: true, why: `Margen ${Math.round(margin * 100)} %`, margin } : { ok: false, why: `Margen ${Math.round(margin * 100)} % (hace falta 40 %)`, margin };
  }
  if (rel.kind === 'undermining') {
    if (minedHere) return { ok: true, why: 'Minado y vendido en este sistema' };
    return item.sell > 0 && item.sell < CHEAP ? { ok: true, why: 'Menos de 500 CR/t' } : { ok: false, why: 'Para socavar: menos de 500 CR/t' };
  }
  if (rel.kind === 'acquisition') return mined ? { ok: null, why: 'Méritos si lo minaste en un sistema fortificado (a 20 al) o bastión (a 30 al) de tu potencia' } : { ok: false, why: '' };
  return { ok: false, why: '' };
}

function view(state) {
  const X = state.trade;
  const L = state.location;
  const rel = ppRelation(state);
  const finance = rel.kind && rel.power ? (FINANCE[rel.kind] || []).includes(rel.power) : false;
  const inv = (state.cargo && state.cargo.inventory) || [];
  const m = state.market && L.docked && (!state.market.station || !L.station || state.market.station === L.station) ? state.market : null;
  const byKey = m ? new Map(m.items.map((i) => [i.key, i])) : new Map();
  const cargo = inv.map((c) => {
    const cost = X.costs[c.key];
    const paid = cost && cost.count > 0 ? cost.total / cost.count : null;
    const mined = X.mined[c.key] || null;
    const it = byKey.get(c.key) || null;
    const minedHere = !!(mined && mined.address != null && mined.address === L.systemAddress);
    const merit = it && it.sell > 0 ? meritFor(rel, it, paid, minedHere, !!mined) : null;
    return { key: c.key, name: c.name, count: c.count, stolen: !!c.stolen, mission: !!c.mission, paid, mined,
      sell: it ? it.sell : null, demand: it ? it.demand : null, mean: it ? it.mean : null,
      total: it ? it.sell * c.count : null, profit: it && paid != null ? (it.sell - paid) * c.count : null, merit };
  }).sort((a, b) => (b.total || 0) - (a.total || 0));
  let market = null;
  if (m) {
    const items = m.items.filter((i) => !i.rare || true);
    const cheap = items.filter((i) => i.buy > 0 && i.stock > 0 && i.mean > 0 && i.buy < i.mean * 0.85)
      .map((i) => ({ ...i, off: 1 - i.buy / i.mean })).sort((a, b) => b.off - a.off).slice(0, 12);
    const demand = items.filter((i) => i.sell > 0 && i.demand > 0 && i.mean > 0 && i.sell > i.mean * 1.1)
      .map((i) => ({ ...i, over: i.sell / i.mean - 1 })).sort((a, b) => b.over - a.over).slice(0, 12);
    const cheapPP = rel.kind === 'undermining' ? items.filter((i) => i.buy > 0 && i.stock > 0 && i.buy < CHEAP).sort((a, b) => b.stock - a.stock).slice(0, 8) : [];
    market = { station: m.station, at: m.at, count: m.items.length, cheap, demand, cheapPP };
  }
  return {
    docked: !!L.docked, station: L.station || null, market, cargo,
    cargoValue: cargo.reduce((n, c) => n + (c.total || 0), 0),
    pp: { ...rel, finance, meritCount: cargo.filter((c) => c.merit && c.merit.ok).length },
    session: X.session, rank: X.rank, rankName: X.rank != null ? TRADE_RANKS[X.rank] || `Rango ${X.rank}` : null, progress: X.progress,
  };
}

module.exports = { create, apply, view, ppRelation, meritFor, FINANCE, MARGIN, CHEAP, TRADE_RANKS };
