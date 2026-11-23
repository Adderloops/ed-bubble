'use strict';

/**
 * ED BUBBLE · posición de las plataformas de atraque.
 *
 * Referencia del esquema: estación vista DESDE FUERA, al entrar, con la luz
 * verde de la entrada a las 3 y la roja a las 9. La posición es la hora del
 * reloj (0 = las 12).
 *
 * Coriolis, Orbis y Ocellus (puertos estelares de 45 plataformas): 12 líneas a
 * lo largo del hangar, numeradas de delante hacia atrás y luego en sentido
 * horario; la 1 queda bajo la ranura y la 24 encima. Mapa de plataformas
 * (línea, profundidad 0-4 desde la entrada, tamaño 1-3) tomado de
 * ed-landing-pads (https://github.com/rdnt/ed-landing-pads, MIT,
 * © 2018 Tasos Papalyras). Línea n -> hora (n + 5) mod 12, comprobado en el
 * juego con las plataformas 9, 25 y 27 de una Coriolis.
 *
 * Otros tipos (Dodec…): plataformas comprobadas a mano y, si no, la regla
 * general (n - 1) mod 12.
 */

// plataforma: [línea 1-12, profundidad 0-4, tamaño 1=S 2=M 3=L]
const STARPORT = { 1: [1, 0, 1], 2: [1, 1, 1], 3: [1, 2, 2], 4: [1, 4, 1], 5: [2, 0, 1], 6: [2, 1, 1], 7: [2, 2, 2], 8: [2, 4, 1], 9: [3, 0, 2], 10: [3, 2, 3], 11: [4, 0, 1], 12: [4, 1, 1], 13: [4, 2, 1], 14: [4, 3, 1], 15: [4, 4, 1], 16: [5, 0, 1], 17: [5, 1, 1], 18: [5, 2, 2], 19: [5, 4, 1], 20: [6, 0, 1], 21: [6, 1, 1], 22: [6, 2, 2], 23: [6, 4, 1], 24: [7, 0, 2], 25: [7, 2, 3], 26: [8, 0, 1], 27: [8, 1, 1], 28: [8, 2, 1], 29: [8, 3, 1], 30: [8, 4, 1], 31: [9, 0, 1], 32: [9, 1, 1], 33: [9, 2, 2], 34: [9, 4, 1], 35: [10, 0, 1], 36: [10, 1, 1], 37: [10, 2, 2], 38: [10, 4, 1], 39: [11, 0, 2], 40: [11, 2, 3], 41: [12, 0, 1], 42: [12, 1, 1], 43: [12, 2, 1], 44: [12, 3, 1], 45: [12, 4, 1] };
const STARPORT_TYPES = new Set(['Coriolis', 'Orbis', 'Ocellus', 'Bernal']);

// Comprobadas en el juego (vista al entrar), para tipos sin mapa.
const KNOWN = {
  // Cleopatra Vista (Pegasi Sector JN-S b4-7), 2026-11-22: capturas con el holograma
  Dodec: { 17: 4, 32: 8 },
};

/** Posición de una plataforma: { hour (0-11), depth (0-4 o null), size ('S'|'M'|'L'|null), source }. */
function padInfo(stationType, pad) {
  const n = Number(pad);
  if (!n) return null;
  if (STARPORT_TYPES.has(stationType) && STARPORT[n]) {
    const [line, depth, len] = STARPORT[n];
    return { hour: (line + 5) % 12, depth, size: 'SML'[len - 1], source: 'mapa' };
  }
  const h = KNOWN[stationType] && KNOWN[stationType][n];
  if (h != null) return { hour: h % 12, depth: null, size: null, source: 'comprobada' };
  return { hour: (n - 1) % 12, depth: null, size: null, source: 'regla' };
}

/** Hora (0-11) de la plataforma. */
function padHour(stationType, pad) {
  const i = padInfo(stationType, pad);
  return i ? i.hour : null;
}

module.exports = { STARPORT, KNOWN, padInfo, padHour };
