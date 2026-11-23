'use strict';

/**
 * ED BUBBLE · combustible de la ruta (naves sin recolector).
 *
 * Consumo de un salto: fuel = k · distancia^p, donde p depende del tamaño
 * del FSD (fórmula del juego: 2 → 2,00 · 3 → 2,15 · 4 → 2,30 · 5 → 2,45 ·
 * 6 → 2,60 · 7 → 2,75 · 8 → 2,90) y k se ajusta con los saltos reales de
 * esta nave (mediana de fuel / distancia^p). Así recoge la masa real, la carga
 * y la ingeniería sin tener que calcularlas.
 */

const POWER = { 2: 2.0, 3: 2.15, 4: 2.3, 5: 2.45, 6: 2.6, 7: 2.75, 8: 2.9 };
const MARGIN = 1.08; // 8 % de margen por variaciones de masa y redondeos

function median(xs) {
  const a = xs.slice().sort((x, y) => x - y);
  return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null;
}

/** Modelo de consumo de la nave actual, o null si aún no hay saltos con ella. */
function fuelModel(state) {
  const ship = state.ship.type;
  const p = POWER[state.ship.fsdSize] || 2.45;
  const samples = (state.jumpFuel || []).filter((j) => j.ship === ship && (j.fsd == null || j.fsd === state.ship.fsdSize)).slice(-15);
  if (samples.length < 2) return null;
  const k = median(samples.map((j) => j.fuel / j.dist ** p));
  return { k, p, samples: samples.length, perJump: (d) => k * d ** p * MARGIN };
}

/**
 * Simula la ruta trazada salto a salto con el combustible del tanque principal.
 * Devuelve null si no aplica (sin ruta, con recolector o sin datos de consumo).
 */
function fuelPlan(state) {
  const route = state.route || [];
  if (state.ship.hasFuelScoop !== false || route.length < 2) return null;
  const m = fuelModel(state);
  if (!m) return null;
  const start = route[0].system === state.location.system ? 1 : 0;
  let fuel = state.status && state.status.fuelMain != null ? state.status.fuelMain : null;
  if (fuel == null) return null;
  const cap = state.ship.fuelCapacity || null;
  const have = fuel;
  const legs = [];
  let shortAt = null; let need = 0;
  for (let i = start; i < route.length; i += 1) {
    const n = m.perJump(route[i].distance || 0);
    need += n;
    fuel -= n;
    legs.push({ index: i, system: route[i].system, need: n, fuelAfter: fuel });
    if (fuel < 0 && shortAt == null) shortAt = i;
  }
  const reachable = shortAt == null ? route.length - 1 : shortAt - 1; // último sistema al que llegas
  return {
    have, need, capacity: cap, spare: have - need, ok: shortAt == null,
    shortAt, shortSystem: shortAt != null ? route[shortAt].system : null,
    reachable, reachableSystem: route[reachable] ? route[reachable].system : null,
    jumpsLeft: route.length - start, jumpsOk: reachable - start + 1,
    // aunque llenes el depósito, ¿cabe toda la ruta?
    fitsFullTank: cap != null ? need <= cap : null,
    legs, model: { k: m.k, p: m.p, samples: m.samples },
  };
}

module.exports = { fuelModel, fuelPlan, POWER };
