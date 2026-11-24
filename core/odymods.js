'use strict';
/**
 * Mejoras de ingeniero de Odyssey (módulos de traje y de arma) y los ingenieros que las montan.
 * Materiales y cantidades comprobados a mano en Odyssey Materials Helper; ingenieros, sitios y
 * requisitos de desbloqueo según su ficha de ingenieros. Son datos del juego (Frontier Developments).
 * Las mejoras de arma marcadas por tipo piden materiales distintos según el daño del arma:
 * cinética (Kinematic), láser (Takada) o plasma (Manticore).
 */
const MODS = [
  {"id": "suit_increasedmeleedamage", "kind": "suit", "en": "Added Melee Damage", "es": "Más daño cuerpo a cuerpo", "mats": [["epinephrine", 5], ["microthrusters", 8], ["combattrainingmaterial", 5], ["combatantperformance", 5]]},
  {"id": "suit_adsmovementspeed", "kind": "suit", "en": "Combat Movement Speed", "es": "Movilidad en combate", "mats": [["epinephrine", 5], ["phneutraliser", 8], ["evacuationprotocols", 5], ["geneticresearch", 3]]},
  {"id": "suit_improvedarmourrating", "kind": "suit", "en": "Damage Resistance", "es": "Resistencia al daño", "mats": [["carbonfibreplating", 3], ["epoxyadhesive", 8], ["titaniumplating", 3], ["ballisticsdata", 5], ["weaponinventory", 5]]},
  {"id": "suit_improvedradar", "kind": "suit", "en": "Enhanced Tracking", "es": "Seguimiento mejorado", "mats": [["circuitboard", 3], ["transmitter", 3], ["spectralanalysisdata", 5], ["stellaractivitylogs", 5], ["topographicalsurveys", 5]]},
  {"id": "suit_quieterfootsteps", "kind": "suit", "en": "Quieter Footsteps", "es": "Pasos silenciosos", "mats": [["microhydraulics", 3], ["viscoelasticpolymer", 8], ["patrolroutes", 5], ["settlementassaultplans", 3], ["tacticalplans", 5]]},
  {"id": "suit_increasedammoreserves", "kind": "suit", "en": "Extra Ammo Capacity", "es": "Más munición", "mats": [["weaponcomponent", 3], ["productionreports", 5], ["recyclinglogs", 8], ["weapontestdata", 5]]},
  {"id": "suit_backpackcapacity", "kind": "suit", "en": "Extra Backpack Capacity", "es": "Mochila ampliada", "mats": [["epoxyadhesive", 5], ["memorychip", 3], ["chemicalinventory", 5], ["digitaldesigns", 5], ["weaponinventory", 5]]},
  {"id": "suit_improvedbatterycapacity", "kind": "suit", "en": "Improved Battery Capacity", "es": "Batería ampliada", "mats": [["electricalwiring", 5], ["ionbattery", 3], ["microsupercapacitor", 5], ["maintenancelogs", 8], ["reactoroutputreview", 5]]},
  {"id": "suit_increasedshieldregen", "kind": "suit", "en": "Faster Shield Regen", "es": "Escudo más rápido", "mats": [["electricalwiring", 8], ["ionbattery", 3], ["microtransformer", 8], ["reactoroutputreview", 5]]},
  {"id": "suit_reducedtoolbatteryconsumption", "kind": "suit", "en": "Reduced Tool Battery Consumption", "es": "Herramientas con menos consumo", "mats": [["electricalfuse", 3], ["electricalwiring", 8], ["microtransformer", 5], ["reactoroutputreview", 5]]},
  {"id": "suit_improvedjumpassist", "kind": "suit", "en": "Improved Jump Assist", "es": "Salto asistido mejorado", "mats": [["gmeds", 5], ["microthrusters", 3], ["motor", 5], ["topographicalsurveys", 5]]},
  {"id": "suit_increasedo2capacity", "kind": "suit", "en": "Increased Air Reserves", "es": "Más reserva de aire", "mats": [["oxygenicbacteria", 5], ["phneutraliser", 8], ["airqualityreports", 8], ["pharmaceuticalpatents", 3]]},
  {"id": "suit_increasedsprintduration", "kind": "suit", "en": "Increased Sprint Duration", "es": "Sprint más largo", "mats": [["chemicalcatalyst", 8], ["oxygenicbacteria", 5], ["medicaltrialrecords", 3], ["genesequencingdata", 3], ["troopdeploymentrecords", 3]]},
  {"id": "suit_nightvision", "kind": "suit", "en": "Night Vision", "es": "Visión nocturna", "mats": [["surveillanceequipment", 5], ["circuitswitch", 5], ["nocdata", 3], ["radioactivitydata", 3], ["surveilleancelogs", 3]]},
  {"id": "weapon_headshotdamage", "kind": "weapon", "en": "Headshot Damage", "es": "Daño en la cabeza", "variants": {"plasma": [["electromagnet", 10], ["ionbattery", 10], ["microsupercapacitor", 15], ["bloodtestresults", 5], ["chemicalexperimentdata", 10]], "kinetic": [["chemicalcatalyst", 10], ["rdx", 15], ["weaponcomponent", 5], ["medicalrecords", 5], ["weapontestdata", 10]], "laser": [["ionbattery", 5], ["opticallens", 3], ["scrambler", 5], ["biometricdata", 3], ["spectralanalysisdata", 5]]}},
  {"id": "weapon_clipsize", "kind": "weapon", "en": "Magazine Size", "es": "Cargador ampliado", "mats": [["metalcoil", 5], ["tungstencarbide", 3], ["weaponcomponent", 3], ["securityexpenses", 3], ["weapontestdata", 5]]},
  {"id": "weapon_backpackreloading", "kind": "weapon", "en": "Stowed Reloading", "es": "Recarga guardada", "mats": [["circuitboard", 3], ["encryptedmemorychip", 8], ["digitaldesigns", 5], ["operationalmanual", 5], ["productionschedule", 5]]},
  {"id": "weapon_scope", "kind": "weapon", "en": "Scope", "es": "Mira", "mats": [["opticalfibre", 3], ["opticallens", 5], ["biometricdata", 3], ["spectralanalysisdata", 5]]},
  {"id": "weapon_suppression_pressurised", "kind": "weapon", "en": "Noise Suppressor", "es": "Silenciador", "mats": [["viscoelasticpolymer", 8], ["weaponcomponent", 3], ["atmosphericdata", 5], ["mininganalytics", 5]]},
  {"id": "weapon_suppression_unpressurised", "kind": "weapon", "en": "Audio Masking", "es": "Sonido amortiguado", "mats": [["circuitboard", 3], ["scrambler", 5], ["transmitter", 8], ["audiologs", 3], ["patrolroutes", 5]]},
  {"id": "weapon_handling", "kind": "weapon", "en": "Faster Handling", "es": "Manejo rápido", "mats": [["viscoelasticpolymer", 3], ["combattrainingmaterial", 5], ["combatantperformance", 5], ["operationalmanual", 5]]},
  {"id": "weapon_range", "kind": "weapon", "en": "Greater Range", "es": "Más alcance", "variants": {"plasma": [["electricalfuse", 5], ["electromagnet", 10], ["motor", 5], ["chemicalformulae", 10], ["mineralsurvey", 15]], "kinetic": [["weaponcomponent", 5], ["metalcoil", 10], ["rdx", 10], ["ballisticsdata", 10], ["topographicalsurveys", 10]], "laser": [["circuitboard", 3], ["microtransformer", 8], ["opticallens", 3], ["riskassessments", 8], ["stellaractivitylogs", 5]]}},
  {"id": "weapon_reloadspeed", "kind": "weapon", "en": "Reload Speed", "es": "Recarga rápida", "mats": [["electromagnet", 5], ["microhydraulics", 5], ["combattrainingmaterial", 5], ["operationalmanual", 5], ["productionreports", 5]]},
  {"id": "weapon_stability", "kind": "weapon", "en": "Stability", "es": "Estabilidad", "mats": [["microhydraulics", 5], ["viscoelasticpolymer", 5], ["mininganalytics", 5], ["riskassessments", 8]]},
  {"id": "weapon_accuracy", "kind": "weapon", "en": "Improved Hip Fire Accuracy", "es": "Precisión sin apuntar", "variants": {"plasma": [["chemicalcatalyst", 10], ["electromagnet", 10], ["metalcoil", 10], ["chemicalpatents", 5], ["combatantperformance", 10]], "kinetic": [["rdx", 10], ["viscoelasticpolymer", 10], ["biometricdata", 5], ["combatantperformance", 10], ["extractionyielddata", 10]], "laser": [["electricalwiring", 8], ["metalcoil", 5], ["opticallens", 3], ["combatantperformance", 5], ["radioactivitydata", 3]]}},
];
const MAT_NAMES = {"airqualityreports": "Air Quality Reports", "atmosphericdata": "Atmospheric Data", "audiologs": "Audio Logs", "ballisticsdata": "Ballistics Data", "biometricdata": "Biometric Data", "bloodtestresults": "Blood Test Results", "carbonfibreplating": "Carbon Fibre Plating", "chemicalcatalyst": "Chemical Catalyst", "chemicalexperimentdata": "Chemical Experiment Data", "chemicalformulae": "Chemical Formulae", "chemicalinventory": "Chemical Inventory", "chemicalpatents": "Chemical Patents", "circuitboard": "Circuit Board", "circuitswitch": "Circuit Switch", "combatantperformance": "Combatant Performance", "combattrainingmaterial": "Combat Training Material", "digitaldesigns": "Digital Designs", "electricalfuse": "Electrical Fuse", "electricalwiring": "Electrical Wiring", "electromagnet": "Electromagnet", "encryptedmemorychip": "Encrypted Memory Chip", "epinephrine": "Epinephrine", "epoxyadhesive": "Epoxy Adhesive", "evacuationprotocols": "Evacuation Protocols", "extractionyielddata": "Extraction Yield Data", "genesequencingdata": "Gene Sequencing Data", "geneticresearch": "Genetic Research", "gmeds": "G-Meds", "ionbattery": "Ion Battery", "maintenancelogs": "Maintenance Logs", "medicalrecords": "Medical Records", "medicaltrialrecords": "Clinical Trial Records", "memorychip": "Memory Chip", "metalcoil": "Metal Coil", "microhydraulics": "Micro Hydraulics", "microsupercapacitor": "Micro Supercapacitor", "microthrusters": "Micro Thrusters", "microtransformer": "Micro Transformer", "mineralsurvey": "Mineral Survey", "mininganalytics": "Mining Analytics", "motor": "Motor", "nocdata": "NOC Data", "operationalmanual": "Operational Manual", "opticalfibre": "Optical Fibre", "opticallens": "Optical Lens", "oxygenicbacteria": "Oxygenic Bacteria", "patrolroutes": "Patrol Routes", "pharmaceuticalpatents": "Pharmaceutical Patents", "phneutraliser": "pH Neutraliser", "productionreports": "Production Reports", "productionschedule": "Production Schedule", "radioactivitydata": "Radioactivity Data", "rdx": "RDX", "reactoroutputreview": "Reactor Output Review", "recyclinglogs": "Recycling Logs", "riskassessments": "Risk Assessments", "scrambler": "Scrambler", "securityexpenses": "Security Expenses", "settlementassaultplans": "Settlement Assault Plans", "spectralanalysisdata": "Spectral Analysis Data", "stellaractivitylogs": "Stellar Activity Logs", "surveillanceequipment": "Surveillance Equipment", "surveilleancelogs": "Surveillance Logs", "tacticalplans": "Tactical Plans", "titaniumplating": "Titanium Plating", "topographicalsurveys": "Topographical Surveys", "transmitter": "Transmitter", "troopdeploymentrecords": "Troop Deployment Records", "tungstencarbide": "Tungsten Carbide", "viscoelasticpolymer": "Viscoelastic Polymer", "weaponcomponent": "Weapon Component", "weaponinventory": "Weapon Inventory", "weapontestdata": "Weapon Test Data"};

// Otros nombres con los que puede aparecer la misma mejora en el diario.
const ALIASES = { suit_increasedbatterycapacity: 'suit_improvedbatterycapacity', suit_improvedmeleedamage: 'suit_increasedmeleedamage', suit_enhancedtracking: 'suit_improvedradar', weapon_stowedreloading: 'weapon_backpackreloading', weapon_audiomasking: 'weapon_suppression_unpressurised', weapon_noisesuppressor: 'weapon_suppression_pressurised' };

const ENGINEERS = [
  { name: 'Domino Green', site: 'The Jackrabbit', system: 'Orishis', suit: ['suit_improvedradar', 'suit_backpackcapacity', 'suit_reducedtoolbatteryconsumption'], weapon: ['weapon_range', 'weapon_stability'] },
  { name: 'Kit Fowler', site: 'The Last Call', system: 'Capoya', suit: ['suit_increasedmeleedamage', 'suit_increasedammoreserves', 'suit_increasedshieldregen'], weapon: ['weapon_clipsize', 'weapon_backpackreloading'] },
  { name: 'Yarden Bond', site: 'Salamander Bank', system: 'Bayan', suit: ['suit_adsmovementspeed', 'suit_improvedjumpassist', 'suit_quieterfootsteps'], weapon: ['weapon_suppression_unpressurised', 'weapon_handling', 'weapon_accuracy'], unlock: 'Vender 5 Smear Campaign Plans a camareros (referida por Kit Fowler)' },
  { name: 'Hero Ferrari', site: 'Nevermore Terrace', system: 'Siris', suit: ['suit_improvedjumpassist', 'suit_increasedo2capacity', 'suit_increasedsprintduration'], weapon: ['weapon_handling', 'weapon_suppression_pressurised'] },
  { name: 'Wellington Beck', site: 'Beck Facility', system: 'Jolapa', suit: ['suit_backpackcapacity', 'suit_improvedbatterycapacity', 'suit_reducedtoolbatteryconsumption'], weapon: ['weapon_range', 'weapon_scope'] },
  { name: 'Uma Laszlo', site: "Laszlo's Resolve", system: 'Xuane', suit: ['suit_improvedarmourrating', 'suit_increasedshieldregen'], weapon: ['weapon_headshotdamage', 'weapon_reloadspeed', 'weapon_backpackreloading'] },
  { name: 'Jude Navarro', site: "Marshall's Drift", system: 'Aurai', suit: ['suit_increasedmeleedamage', 'suit_improvedarmourrating', 'suit_increasedammoreserves'], weapon: ['weapon_clipsize', 'weapon_reloadspeed'], unlock: 'Completar 10 misiones a pie de restauración o reactivación' },
  { name: 'Terra Velasquez', site: "Rascal's Choice", system: 'Shou Xing', suit: ['suit_adsmovementspeed', 'suit_increasedo2capacity', 'suit_increasedsprintduration'], weapon: ['weapon_accuracy', 'weapon_suppression_pressurised'], unlock: 'Dar 5 Genetic Repair Meds a Jude Navarro y completar 6 misiones a pie de robo o golpe encubierto' },
  { name: 'Oden Geiger', site: "Ankh's Promise", system: 'Candiaei', suit: ['suit_improvedradar', 'suit_improvedbatterycapacity', 'suit_nightvision'], weapon: ['weapon_scope', 'weapon_stability'], unlock: 'Dar 15 Financial Projections a Terra Velasquez y vender 20 Biological Sample, Employee Genetic Data o Genetic Research a camareros' },
  { name: 'Baltanos', site: 'The Divine Apparatus', system: 'Deriso', colonia: true, suit: ['suit_adsmovementspeed', 'suit_improvedjumpassist', 'suit_increasedo2capacity', 'suit_increasedsprintduration'], weapon: ['weapon_handling', 'weapon_accuracy', 'weapon_suppression_pressurised'], unlock: 'Reputación amistosa con el Colonia Council' },
  { name: 'Rosa Dayette', site: "Rosa's Shop", system: 'Kojeara', colonia: true, suit: ['suit_improvedradar', 'suit_backpackcapacity', 'suit_improvedbatterycapacity', 'suit_reducedtoolbatteryconsumption'], weapon: ['weapon_range', 'weapon_scope', 'weapon_stability'], unlock: 'Vender 10 Culinary Recipes o Cocktail Recipes en estaciones de Colonia' },
  { name: 'Eleanor Bresa', site: 'Bresa Modifications', system: 'Desy', colonia: true, suit: ['suit_increasedmeleedamage', 'suit_improvedarmourrating', 'suit_increasedammoreserves', 'suit_increasedshieldregen'], weapon: ['weapon_clipsize', 'weapon_reloadspeed', 'weapon_backpackreloading'], unlock: 'Atracar y bajar en 5 asentamientos del sistema Colonia' },
  { name: 'Yi Shen', site: 'Eidolon Hold', system: 'Einheriar', colonia: true, suit: ['suit_nightvision', 'suit_quieterfootsteps'], weapon: ['weapon_suppression_unpressurised', 'weapon_headshotdamage'], unlock: 'Encargos de Baltanos (10 Faction Associates), Rosa Dayette (10 Manufacturing Instructions) y Eleanor Bresa (10 Digital Designs)' },
];

const byId = Object.fromEntries(MODS.map((m) => [m.id, m]));
const canon = (id) => ALIASES[String(id || '').toLowerCase()] || String(id || '').toLowerCase();
const modInfo = (id) => byId[canon(id)] || null;

/** Tipo de daño de un arma por su nombre interno: plasma (Manticore), laser (Takada) o kinetic (Kinematic). */
function damageType(key) { const k = String(key || '').toLowerCase(); return k.includes('plasma') ? 'plasma' : k.includes('laser') ? 'laser' : 'kinetic'; }

/** Acceso a un ingeniero de Odyssey según EngineerProgress: «Invited» ya da acceso en Odyssey. */
function access(ranks, name) {
  const p = ranks && ranks[name] && ranks[name].progress;
  return p === 'Unlocked' || p === 'Invited' ? 'yes' : p === 'Known' ? 'known' : 'no';
}

const haveOf = (locker, key) => {
  if (!locker) return 0;
  let n = 0;
  for (const cat of ['items', 'components', 'data', 'consumables']) for (const x of locker[cat] || []) if (x.key === key) n += x.count - (x.mission || 0);
  return Math.max(0, n);
};

/**
 * Mejoras posibles para un traje o arma del equipo.
 * kind: 'suit' | 'weapon'; item: {key, grade, mods}; ranks: state.engineering.ranks.
 */
function modsFor(kind, item, locker, ranks) {
  if (!item) return null;
  const slots = Math.max(0, (Number(item.grade) || 1) - 1);
  const installed = (item.mods || []).map(canon);
  const type = kind === 'weapon' ? damageType(item.key) : null;
  const order = { yes: 0, known: 1, no: 2 };
  const list = MODS.filter((m) => m.kind === kind).map((m) => {
    const pairs = m.variants ? m.variants[type] : m.mats;
    const materials = pairs.map(([key, need]) => { const have = haveOf(locker, key); return { key, name: MAT_NAMES[key] || key, need, have, ok: have >= need }; });
    const engineers = ENGINEERS.filter((e) => e[kind].includes(m.id))
      .map((e) => ({ name: e.name, site: e.site, system: e.system, colonia: !!e.colonia, unlock: e.unlock || null, access: access(ranks, e.name) }))
      .sort((a, b) => order[a.access] - order[b.access] || a.colonia - b.colonia);
    return {
      id: m.id, name: m.es, en: m.en + (m.variants ? ` (${{ kinetic: 'Kinetic', laser: 'Laser', plasma: 'Plasma' }[type]})` : ''),
      installed: installed.includes(m.id), materials, ready: materials.every((x) => x.ok),
      missing: materials.reduce((a, x) => a + Math.max(0, x.need - x.have), 0),
      engineers, reachable: engineers.some((e) => e.access === 'yes'),
    };
  }).sort((a, b) => a.installed - b.installed || b.ready - a.ready || b.reachable - a.reachable || a.missing - b.missing);
  return { kind, type, slots, used: installed.length, free: Math.max(0, slots - installed.length), list };
}

module.exports = { MODS, MAT_NAMES, ENGINEERS, modsFor, modInfo, damageType, access, canon };
