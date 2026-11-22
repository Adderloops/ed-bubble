'use strict';

/**
 * ED BUBBLE · posición de las plataformas de atraque, comprobadas en el juego.
 *
 * Referencia del esquema: estación vista DESDE DENTRO, con la luz verde de la
 * entrada a las 9 y la roja a las 3. La posición es la hora del reloj (1-12)
 * en la que está la plataforma. Solo se añaden plataformas comprobadas: si no
 * está aquí, la app no marca ninguna casilla.
 */
const KNOWN = {
  // Macgregor's Progress (Pegasi Sector IH-V c2-28), 2026-11-22
  Coriolis: { 9: 4 },
  // Cleopatra Vista (Pegasi Sector JN-S b4-7), 2026-11-22: captura con el holograma "32"
  Dodec: { 32: 4 },
};

const ALIAS = { Bernal: 'Ocellus' };

/** Hora (1-12) de la plataforma, o null si no está comprobada. */
function padHour(stationType, pad) {
  const t = ALIAS[stationType] || stationType;
  const h = KNOWN[t] && KNOWN[t][Number(pad)];
  return h || null;
}

module.exports = { KNOWN, padHour };
