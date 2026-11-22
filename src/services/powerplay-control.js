'use strict';

/**
 * Powerplay 2.0: progreso de control de un SISTEMA (no confundir con los
 * méritos del piloto, que están en powerplay-ranks.js).
 *
 * Los eventos Location y FSDJump del Journal traen, para un sistema con
 * Powerplay:
 *   PowerplayState                   Unoccupied | Exploited | Fortified | Stronghold
 *   PowerplayStateControlProgress    0..1 (puede pasar de 1.0 antes del corte semanal)
 *   PowerplayStateReinforcement      CP de refuerzo del ciclo actual
 *   PowerplayStateUndermining        CP de undermining del ciclo actual
 *
 * Fórmula (ajuste empírico sobre ~80 pares de datos de 14 Journals reales,
 * oct 2026, y comprobada con un cambio real Fortified -> Stronghold):
 *
 *   ControlProgress = CP_de_la_banda / tope_de_la_banda
 *   topes: Exploited 350.000 | Fortified 650.000 | Stronghold 1.000.000
 *
 * Al pasar de 1.0 el sistema sube de estado en el siguiente corte semanal y
 * el sobrante se arrastra (AD Leonis: Fortified 1.384615 = 900.000 CP ->
 * Stronghold con 250.000 de arrastre + 19.208 netos = 0.269208 sobre 1M).
 *
 * Reinforcement y Undermining se ponen a 0 en cada corte; el progreso no.
 * La barra del juego dibuja: marca blanca = progreso al empezar el ciclo
 * (progreso - neto/tope), triángulo amarillo = progreso actual.
 */

const BAND_CAPS = { Exploited: 350000, Fortified: 650000, Stronghold: 1000000 };
const NEXT_STATE = { Exploited: 'Fortified', Fortified: 'Stronghold', Stronghold: null };

const SEGMENT_COUNT = 12;
const SEG_EMPTY = 0;
const SEG_BASE = 1; // progreso que ya había al empezar el ciclo
const SEG_GAIN = 2; // ganado en este ciclo
const SEG_LOSS = 3; // perdido en este ciclo (undermining > refuerzo)

function clamp01(x) {
  if (!(x > 0)) return 0;
  return x > 1 ? 1 : x;
}

/**
 * Calcula las cifras de control a partir de un evento Location/FSDJump.
 * Devuelve null si el sistema no tiene datos de control utilizables
 * (sin Powerplay, Unoccupied o campos ausentes).
 */
function computeControl(e) {
  if (!e || typeof e !== 'object') return null;
  const state = e.PowerplayState;
  const cap = BAND_CAPS[state];
  const progress = e.PowerplayStateControlProgress;
  if (!cap || typeof progress !== 'number' || Number.isNaN(progress)) return null;

  const reinforcement = Number(e.PowerplayStateReinforcement) || 0;
  const undermining = Number(e.PowerplayStateUndermining) || 0;
  const net = reinforcement - undermining;
  const totalCp = Math.round(progress * cap);
  const baseProgress = (totalCp - net) / cap;

  return {
    state,
    nextState: NEXT_STATE[state],
    cap,
    progress,
    totalCp,
    reinforcement,
    undermining,
    net,
    baseProgress,
    remaining: Math.max(0, cap - totalCp),
    reached: progress >= 1,
  };
}

/**
 * Reparte el progreso en `count` celdas para la barra de Touch Portal.
 *  - Las celdas cubiertas hasta el punto más bajo (progreso al empezar el
 *    ciclo o progreso actual, el menor) se pintan "base".
 *  - Desde ahí hasta el punto más alto se pintan "ganado" (o "perdido" si el
 *    undermining supera al refuerzo). Cualquier avance dentro de una celda la
 *    enciende, para que un avance pequeño no desaparezca en una barra de 12.
 */
function segmentStates(baseProgress, progress, count = SEGMENT_COUNT) {
  const base = clamp01(baseProgress);
  const now = clamp01(progress);
  const lo = Math.min(base, now);
  const hi = Math.max(base, now);
  const delta = now >= base ? SEG_GAIN : SEG_LOSS;
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const start = i / count;
    const mid = (i + 0.5) / count;
    if (mid <= lo) out.push(SEG_BASE);
    else if (start < hi && hi > lo) out.push(delta);
    else if (start < hi) out.push(SEG_BASE); // hi == lo: sin cambio en el ciclo
    else out.push(SEG_EMPTY);
  }
  return out;
}

/** Lee el ajuste "Tracked system ..." del payload de ajustes de Touch Portal. */
function trackedSystemFromSettings(settings) {
  const list = Array.isArray(settings) ? settings : [settings];
  for (const entry of list) {
    if (entry && typeof entry === 'object') {
      for (const [k, v] of Object.entries(entry)) {
        if (k.toLowerCase().startsWith('tracked')) return String(v === undefined || v === null ? '' : v).trim();
      }
    }
  }
  return undefined;
}

module.exports = {
  BAND_CAPS,
  NEXT_STATE,
  SEGMENT_COUNT,
  SEG_EMPTY,
  SEG_BASE,
  SEG_GAIN,
  SEG_LOSS,
  computeControl,
  segmentStates,
  trackedSystemFromSettings,
};
