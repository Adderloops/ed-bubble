'use strict';
/**
 * Mercancías que pide cada tipo de construcción de colonización (para planificar antes de colocarla).
 *
 * Datos: colonization-costs2.json de SrvSurvey (https://github.com/njthomson/SrvSurvey), del autor de
 * Raven Colonial, bajo GPLv3; copiado sin cambios en core/data/colonization-costs.json.
 * Son valores de referencia: el juego puede pedir algo más o algo menos (y el puerto primario cuesta más),
 * así que en cuanto la construcción existe, ED BUBBLE usa lo que dice el juego (ColonisationConstructionDepot).
 */
const RAW = require('./data/colonization-costs.json');
const { NAMES } = require('./commodities');

const ES = {
  'Coriolis Starport': 'Puerto estelar Coriolis', 'Asteroid Base': 'Base de asteroide', 'Dodec Starport': 'Puerto estelar Dodec',
  'Ocellus Starport': 'Puerto estelar Ocellus', 'Orbis Starport': 'Puerto estelar Orbis',
  'Commercial Outpost': 'Puesto avanzado comercial', 'Industrial Outpost': 'Puesto avanzado industrial', 'Pirate Outpost': 'Puesto avanzado pirata',
  'Civilian Outpost': 'Puesto avanzado civil', 'Scientific Outpost': 'Puesto avanzado científico', 'Military Outpost': 'Puesto avanzado militar',
  'Satellite Installation': 'Instalación de satélites', 'Comms Installation': 'Instalación de comunicaciones', 'Agricultural Installation': 'Instalación agrícola',
  'Pirate Installation': 'Instalación pirata', 'Industrial Installation': 'Instalación industrial', 'Relay Installation': 'Instalación de retransmisión',
  'Military Installation': 'Instalación militar', 'Security Installation': 'Instalación de seguridad', 'Government Installation': 'Instalación gubernamental',
  'Medical Installation': 'Instalación médica', 'Research Installation': 'Instalación de investigación', 'Tourist Installation': 'Instalación turística',
  'Space Bar': 'Bar espacial',
  'Civilian Settlement': 'Asentamiento civil', 'Industrial Settlement': 'Asentamiento industrial', 'Scientific Settlement': 'Asentamiento científico',
  'Port Surface Outpost': 'Puerto de superficie',
  'Extraction Hub': 'Centro de extracción', 'Civilian Hub': 'Centro civil', 'Exploration Hub': 'Centro de exploración', 'Outpost Hub': 'Centro de puesto avanzado',
  'Scientific Hub': 'Centro científico', 'Military Hub': 'Centro militar', 'Refinery Hub': 'Centro de refinería', 'High Tech Hub': 'Centro de alta tecnología',
  'Industrial Hub': 'Centro industrial',
};
const SETTLEMENT = { Agricultural: 'agrícola', Extraction: 'de extracción', Industrial: 'industrial', Military: 'militar', Bio: 'biológico', Tourism: 'turístico' };
const SIZE = { Small: 'pequeño', Medium: 'mediano', Large: 'grande' };

function esName(en) {
  if (ES[en]) return ES[en];
  const m = /^(\w+) Settlement - (Small|Medium|Large)$/.exec(en);
  if (m && SETTLEMENT[m[1]]) return `Asentamiento ${SETTLEMENT[m[1]]} ${SIZE[m[2]]}`;
  return en;
}

/** Lista de tipos de construcción con sus mercancías (de más a menos toneladas) y el total. */
function costList() {
  return RAW.map((b) => {
    const cargo = Object.entries(b.cargo).map(([key, t]) => ({ key, name: NAMES[key] || key, t })).sort((a, c) => c.t - a.t);
    return {
      key: b.buildType, name: esName(b.displayName), en: b.displayName, category: b.category, tier: b.tier,
      location: b.location, layouts: b.layouts || [], cargo, total: cargo.reduce((a, x) => a + x.t, 0),
    };
  });
}

/** Viajes con una bodega de cierta capacidad (toneladas). */
const tripsFor = (total, capacity) => (capacity > 0 ? Math.ceil(total / capacity) : null);

module.exports = { costList, tripsFor, esName };
