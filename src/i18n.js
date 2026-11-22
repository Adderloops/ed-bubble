'use strict';

/**
 * Language of the live values the plugin writes to Touch Portal
 * (Buy/Sell, module names, "No data yet", number format...).
 * Chosen in Touch Portal: Settings > Plug-ins > ED Touch Portal Plugin > Language (en / es).
 * Texts in the Touch Portal editor (entry.tp) stay in English.
 */

const STRINGS = {
  en: {
    buy: 'Buy',
    sell: 'Sell',
    holdEmpty: 'Hold empty',
    total: 'Total',
    unknown: 'Unknown',
    missionRequired: 'MISSION_REQUIRED',
    grade: 'grade',
    connected: 'CONNECTED',
    noData: 'NO_DATA',
    recallShip: 'RECALL\nSHIP',
    dismissShip: 'DISMISS\nSHIP',
    noDataYet: 'No data yet',
    noneEquipped: 'None equipped',
    emptySlot: '— empty —',
    shipCargoWaiting: 'No data yet (board your ship or move cargo)',
    srvCargoWaiting: 'No data yet (board the SRV or move cargo)',
    ppUnoccupied: 'UNOCCUPIED',
    ppExploited: 'EXPLOITED',
    ppFortified: 'FORTIFIED',
    ppStronghold: 'STRONGHOLD',
    ppMax: 'MAX',
    ppReached: 'REACHED',
    ppNoPowerplay: 'NO POWERPLAY',
    ppAsOf: 'DATA AS OF',
  },
  es: {
    buy: 'Compra',
    sell: 'Venta',
    holdEmpty: 'Bodega vacía',
    total: 'Total',
    unknown: 'Desconocido',
    missionRequired: 'MISIÓN REQUERIDA',
    grade: 'grado',
    connected: 'CONECTADO',
    noData: 'SIN DATOS',
    recallShip: 'LLAMAR\nNAVE',
    dismissShip: 'DESPEDIR\nNAVE',
    noDataYet: 'Sin datos todavía',
    noneEquipped: 'Nada equipado',
    emptySlot: '— vacío —',
    shipCargoWaiting: 'Sin datos todavía (sube a la nave o mueve carga)',
    srvCargoWaiting: 'Sin datos todavía (entra al SRV o mueve carga)',
    ppUnoccupied: 'SIN OCUPAR',
    ppExploited: 'EXPLOTADO',
    ppFortified: 'FORTIFICADO',
    ppStronghold: 'BASTIÓN',
    ppMax: 'MÁX',
    ppReached: 'ALCANZADO',
    ppNoPowerplay: 'SIN POWERPLAY',
    ppAsOf: 'DATOS DE LAS',
  },
};

let lang = 'en';

function normalize(value) {
  const v = String(value || '').trim().toLowerCase();
  if (['es', 'esp', 'spa', 'spanish', 'español', 'espanol', 'castellano'].includes(v)) return 'es';
  return 'en';
}

function setLanguage(value) {
  const next = normalize(value);
  const changed = next !== lang;
  lang = next;
  return changed;
}

function getLanguage() {
  return lang;
}

function t(key) {
  return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
}

/** True if `value` is `key` in any language (for state comparisons). */
function isAny(value, key) {
  return Object.values(STRINGS).some((s) => s[key] === value);
}

/** Reads the Language value from Touch Portal's settings payload (array of {name: value} or object). */
function languageFromSettings(settings) {
  const list = Array.isArray(settings) ? settings : [settings];
  for (const entry of list) {
    if (entry && typeof entry === 'object') {
      for (const [k, v] of Object.entries(entry)) {
        if (k.toLowerCase().startsWith('language')) return v;
      }
    }
  }
  return undefined;
}

module.exports = { t, isAny, setLanguage, getLanguage, languageFromSettings, STRINGS };
