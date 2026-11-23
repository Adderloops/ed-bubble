'use strict';

/**
 * ED BUBBLE · posición de las plataformas de atraque, comprobadas en el juego.
 *
 * Referencia del esquema: estación vista DESDE FUERA, al entrar, con la luz
 * verde de la entrada a las 3 y la roja a las 9. (Vista desde dentro se
 * refleja: la hora h pasa a ser 12 - h.) La posición es la hora del reloj (1-12)
 * en la que está la plataforma (admite medias horas: 1.5 = la 1:30). Para las que no están en la tabla se usa la
 * regla general (plataforma n -> hora (n - 1) mod 12), que coincide con lo
 * comprobado en el juego; la tabla corrige las que se desvían.
 */
const KNOWN = {
  // Macgregor's Progress (Pegasi Sector IH-V c2-28), 2026-11-22
  // pad 27: 2026-11-23, a la 1:30 (la regla la ponía a las 2)
  Coriolis: { 9: 8, 27: 1.5 },
  // Cleopatra Vista (Pegasi Sector JN-S b4-7), 2026-11-22: captura desde dentro
  // con el holograma "32" (a las 4 vista desde dentro -> a las 8 al entrar)
  // Pad 17: captura desde dentro, nave abajo a la izquierda con la cúpula de la
  // entrada (lado verde) a la izquierda (~7:40 desde dentro -> ~4 al entrar)
  Dodec: { 17: 4, 32: 8 },
};

const ALIAS = { Bernal: 'Ocellus' };

/** Hora (0 a <12, 0 = las 12; puede ser media hora) de la plataforma: comprobada o por la regla general. */
function padHour(stationType, pad) {
  const n = Number(pad);
  if (!n) return null;
  const t = ALIAS[stationType] || stationType;
  const h = KNOWN[t] && KNOWN[t][n];
  return (h != null ? h : n - 1) % 12;
}

module.exports = { KNOWN, padHour };
