'use strict';

/**
 * ED BUBBLE · mejora de grado de trajes y armas (Odyssey).
 *
 * Costes por grado según Elite Dangerous Wiki (fandom): Dominator Suit, Artemis Suit,
 * TK Aphelion y Karma AR-50 (consultados el 24-11-2026). Todos siguen el mismo patrón:
 * 1/2/4/5 de los tres primeros materiales y 2/5/9/12 de los dos propios del modelo o
 * del fabricante. Los materiales propios del Maverick (Titanium Plating y Graphene) y de
 * Manticore (Ionised Gas, Chemical Superbase, Microelectrode) salen de la tabla de un
 * jugador en el foro de Frontier; las cantidades se asumen iguales a las del resto.
 * Créditos: trajes 0,6 / 2,25 / 4,5 / 7,5 M; armas 0,5 / 1,875 / 3,75 M y G5 sin dato.
 */

const QTY = { 2: [1, 2], 3: [2, 5], 4: [4, 9], 5: [5, 12] }; // [comunes, propios]
const SUIT_CR = { 2: 600000, 3: 2250000, 4: 4500000, 5: 7500000 };
const WEAPON_CR = { 2: 500000, 3: 1875000, 4: 3750000, 5: null };

const SUIT_MATS = {
  common: ['suitschematic', 'healthmonitor', 'manufacturinginstructions'],
  tacticalsuit: ['titaniumplating', 'graphene'], // Dominator
  utilitysuit: ['titaniumplating', 'graphene'], // Maverick (sin confirmar en la wiki)
  explorationsuit: ['aerogel', 'graphene'], // Artemis
};
const WEAPON_MATS = {
  kinematic: { common: ['weaponschematic', 'compressionliquefiedgas', 'manufacturinginstructions'], own: ['tungstencarbide', 'weaponcomponent'] },
  takada: { common: ['weaponschematic', 'ionisedgas', 'manufacturinginstructions'], own: ['microelectrode', 'opticalfibre'] },
  manticore: { common: ['weaponschematic', 'ionisedgas', 'manufacturinginstructions'], own: ['chemicalsuperbase', 'microelectrode'] },
};
const NAMES = {
  suitschematic: 'Suit Schematic', healthmonitor: 'Health Monitor', manufacturinginstructions: 'Manufacturing Instructions',
  titaniumplating: 'Titanium Plating', graphene: 'Graphene', aerogel: 'Aerogel', weaponschematic: 'Weapon Schematic',
  compressionliquefiedgas: 'Compression-Liquefied Gas', tungstencarbide: 'Tungsten Carbide', weaponcomponent: 'Weapon Component',
  ionisedgas: 'Ionised Gas', microelectrode: 'Microelectrode', opticalfibre: 'Optical Fibre', chemicalsuperbase: 'Chemical Superbase',
};

/** Fabricante de un arma por su nombre interno: plasma = Manticore, láser = Takada, el resto Kinematic. */
function weaponMaker(key) {
  const k = String(key || '').toLowerCase();
  if (k.includes('plasma')) return 'manticore';
  if (k.includes('laser')) return 'takada';
  return 'kinematic';
}

/** Cuántas unidades tienes de un material en la taquilla. */
function haveOf(locker, key) {
  if (!locker) return 0;
  for (const g of ['items', 'components', 'data', 'consumables']) {
    const x = (locker[g] || []).find((i) => i.key === key);
    if (x) return x.count - (x.mission || 0);
  }
  return 0;
}

/**
 * Lo que hace falta para subir un traje o arma al siguiente grado.
 * kind: 'suit' | 'weapon'; key: nombre interno; grade: grado actual.
 * Devuelve null en grado máximo o si no se sabe.
 */
function nextUpgrade(kind, key, grade, locker) {
  const g = Number(grade);
  if (!g || g >= 5) return null;
  const to = g + 1;
  let mats;
  if (kind === 'suit') {
    const model = String(key || '').toLowerCase().replace(/_class\d+$/, '');
    if (!SUIT_MATS[model]) return null;
    mats = [...SUIT_MATS.common.map((k) => [k, QTY[to][0]]), ...SUIT_MATS[model].map((k) => [k, QTY[to][1]])];
  } else {
    const m = WEAPON_MATS[weaponMaker(key)];
    mats = [...m.common.map((k) => [k, QTY[to][0]]), ...m.own.map((k) => [k, QTY[to][1]])];
  }
  const list = mats.map(([k, need]) => { const have = haveOf(locker, k); return { key: k, name: NAMES[k] || k, need, have, ok: have >= need }; });
  return { to, credits: (kind === 'suit' ? SUIT_CR : WEAPON_CR)[to], materials: list, ready: list.every((x) => x.ok), missing: list.reduce((a, x) => a + Math.max(0, x.need - x.have), 0) };
}

module.exports = { nextUpgrade, weaponMaker, haveOf, QTY, SUIT_MATS, WEAPON_MATS };
