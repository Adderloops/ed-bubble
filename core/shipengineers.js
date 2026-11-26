'use strict';
/**
 * Ingenieros de naves (Horizons): sitio, sistema, módulos que mejoran con su grado máximo y, de los
 * que salían bloqueados, cómo se desbloquean. Transcrito a mano de la ficha de ingenieros de Odyssey
 * Materials Helper del usuario; son datos del juego (Frontier Developments).
 * arbol: posición en la cadena de presentaciones (A presenta a A1, A2, A3; A3 a A3A…).
 * rep: cómo se sube la reputación (mejoras de módulos, venta de datos de exploración o de mercancías).
 */
const CATS = {"H": "Anclajes", "U": "Apoyo", "C": "Internos principales", "O": "Internos opcionales"};
const MODULES = {
  "Abrasion Blaster": { cat: 'H', es: "Desintegrador abrasivo" },
  "Beam Laser": { cat: 'H', es: "Láser de haz" },
  "Burst Laser": { cat: 'H', es: "Láser de ráfagas" },
  "Cannon": { cat: 'H', es: "Cañón" },
  "Enzyme Missile Rack": { cat: 'H', es: "Lanzamisiles de enzimas" },
  "Fragment Cannon": { cat: 'H', es: "Cañón de fragmentación" },
  "Guardian Gauss Cannon": { cat: 'H', es: "Cañón Gauss guardián" },
  "Guardian Plasma Charger": { cat: 'H', es: "Cargador de plasma guardián" },
  "Guardian Shard Cannon": { cat: 'H', es: "Cañón de esquirlas guardián" },
  "Mine Launcher": { cat: 'H', es: "Lanzaminas" },
  "Mining Laser": { cat: 'H', es: "Láser de minería" },
  "Missile Rack (Dumbfire)": { cat: 'H', es: "Lanzamisiles sin guía" },
  "Missile Rack (Seeker)": { cat: 'H', es: "Lanzamisiles buscadores" },
  "Multi Cannon": { cat: 'H', es: "Multicañón" },
  "Plasma Accelerator": { cat: 'H', es: "Acelerador de plasma" },
  "Pulse Laser": { cat: 'H', es: "Láser de pulsos" },
  "Rail Gun": { cat: 'H', es: "Cañón de raíl" },
  "Torpedo Pylon": { cat: 'H', es: "Lanzatorpedos" },
  "Caustic Sink Launcher": { cat: 'U', es: "Disipador cáustico" },
  "Chaff Launcher": { cat: 'U', es: "Lanzador de señuelos" },
  "Electronic Countermeasure": { cat: 'U', es: "Contramedidas electrónicas" },
  "Frame Shift Wake Scanner": { cat: 'U', es: "Escáner de estela FSD" },
  "Heat Sink Launcher": { cat: 'U', es: "Disipador térmico" },
  "Kill Warrant Scanner": { cat: 'U', es: "Escáner de órdenes de busca" },
  "Manifest Scanner": { cat: 'U', es: "Escáner de carga" },
  "Point Defence": { cat: 'U', es: "Defensa puntual" },
  "Shield Booster": { cat: 'U', es: "Amplificador de escudo" },
  "Armour": { cat: 'C', es: "Blindaje" },
  "Frame Shift Drive": { cat: 'C', es: "Motor FSD" },
  "Life Support": { cat: 'C', es: "Soporte vital" },
  "Power Distributor": { cat: 'C', es: "Distribuidor de energía" },
  "Power Plant": { cat: 'C', es: "Planta de energía" },
  "Sensors": { cat: 'C', es: "Sensores" },
  "Thrusters": { cat: 'C', es: "Propulsores" },
  "Guardian Power Distributor": { cat: 'C', es: "Distribuidor de energía guardián" },
  "Guardian Power Plant": { cat: 'C', es: "Planta de energía guardián" },
  "Auto Field Maintenance Unit": { cat: 'O', es: "Unidad de mantenimiento" },
  "Cargo Rack": { cat: 'O', es: "Bodega de carga" },
  "Collector Limpet Controller": { cat: 'O', es: "Drones recolectores" },
  "Detailed Surface Scanner": { cat: 'O', es: "Escáner de superficie detallado" },
  "Frame Shift Drive Interdictor": { cat: 'O', es: "Interdictor FSD" },
  "Fuel Scoop": { cat: 'O', es: "Recolector de combustible" },
  "Fuel Transfer Limpet Controller": { cat: 'O', es: "Drones de combustible" },
  "Guardian Frame Shift Drive Booster": { cat: 'O', es: "Potenciador FSD guardián" },
  "Guardian Hull Reinforcement Package": { cat: 'O', es: "Refuerzo de casco guardián" },
  "Guardian Module Reinforcement Package": { cat: 'O', es: "Refuerzo de módulos guardián" },
  "Guardian Shield Reinforcement Package": { cat: 'O', es: "Refuerzo de escudo guardián" },
  "Hatch Breaker Limpet Controller": { cat: 'O', es: "Drones rompe-escotillas" },
  "Hull Reinforcement Package": { cat: 'O', es: "Refuerzo de casco" },
  "Module Reinforcement Package": { cat: 'O', es: "Refuerzo de módulos" },
  "Prospector Limpet Controller": { cat: 'O', es: "Drones prospectores" },
  "Refinery": { cat: 'O', es: "Refinería" },
  "Shield Cell Bank": { cat: 'O', es: "Banco de células de escudo" },
  "Shield Generator": { cat: 'O', es: "Generador de escudo" },
};
const ENGINEERS = [
  {"name": "Elvira Martuuk", "site": "Long Sight Base", "system": "Khun", "mods": [["Frame Shift Drive", 5], ["Thrusters", 2], ["Shield Generator", 3], ["Shield Cell Bank", 1]], "unlock": "Conocer: lo conoces desde el principio. Acceso: viajar al menos 300 ly desde tu sistema de inicio. Desbloqueo: 3 t de Soontill Relics (se compran en Cheranovsky City, en Ngurii)", "arbol": "A", "rep": ["mejoras", "exploracion"]},
  {"name": "Zacariah Nemo", "site": "Nemo Cyber Party Base", "system": "Yoru", "mods": [["Fragment Cannon", 5], ["Multi Cannon", 3], ["Plasma Accelerator", 2]], "unlock": "Conocer: nivel 3 y 33% con Elvira Martuuk. Acceso: invitación de Party of Yoru (subir la reputación con Party of Yoru, en el sistema Yoru, hasta amistoso; luego misión de invitación). Desbloqueo: donar 25 t de Xihe Biomorphic Companions (se compran en Zhen Dock, en Xihe)", "arbol": "A2", "rep": ["mejoras", "mercancias"]},
  {"name": "Marco Qwent", "site": "Qwent Research Base", "system": "Sirius", "permit": true, "mods": [["Missile Rack (Seeker)", 3], ["Power Plant", 4], ["Power Distributor", 3]], "unlock": "Conocer: nivel 3 y 33% con Elvira Martuuk. Acceso: invitación de Sirius Corporation (subir la reputación con Sirius Corporation, en el sistema Sirius, hasta amistoso; luego misión especial de invitación). Desbloqueo: 25 Modular Terminals (recompensa de misiones)", "arbol": "A3", "rep": ["mejoras", "mercancias"]},
  {"name": "Professor Palin", "site": "Abel Laboratory", "system": "Arque", "mods": [["Thrusters", 5], ["Frame Shift Drive", 3]], "unlock": "Conocer: nivel 3 y 33% con Marco Qwent. Acceso: visitar un sistema a 5000 ly o más de tu sistema de inicio. Desbloqueo: 25 Sensor Fragments (de naves thargoid estrelladas)", "arbol": "A3A", "rep": ["mejoras", "exploracion"]},
  {"name": "Lori Jameson", "site": "Jameson Base", "system": "Shinrarta Dezhra", "permit": true, "mods": [["Frame Shift Wake Scanner", 3], ["Kill Warrant Scanner", 3], ["Manifest Scanner", 3], ["Sensors", 5], ["Life Support", 4], ["Detailed Surface Scanner", 5], ["Auto Field Maintenance Unit", 4], ["Fuel Scoop", 4], ["Refinery", 4], ["Shield Cell Bank", 3]], "unlock": "Conocer: nivel 3 y 33% con Marco Qwent. Acceso: rango de combate Dangerous o más. Desbloqueo: 25 t de Kongga Ale", "arbol": "A3B", "rep": ["mejoras", "exploracion"]},
  {"name": "Chloe Sedesi", "site": "Cinder Dock", "system": "Shenve", "mods": [["Thrusters", 5], ["Frame Shift Drive", 3]], "unlock": "Conocer: nivel 3 y 33% de reputación con Marco Qwent. Acceso: visitar un sistema a 5000 ly o más de tu sistema de inicio. Desbloqueo: 25 Sensor Fragments (de naves thargoid estrelladas)", "arbol": "A3C", "rep": ["mejoras", "exploracion"]},
  {"name": "The Dweller", "site": "Black Hide", "system": "Wyrd", "mods": [["Pulse Laser", 4], ["Beam Laser", 3], ["Burst Laser", 3], ["Power Distributor", 5]], "unlock": "Conocer: lo conoces desde el principio. Acceso: comerciar en al menos 5 mercados negros. Desbloqueo: donar 500.000 CR", "arbol": "B", "rep": ["mejoras", "mercancias"]},
  {"name": "Lei Cheung", "site": "Trader's Rest", "system": "Laksak", "mods": [["Shield Booster", 3], ["Sensors", 5], ["Detailed Surface Scanner", 5], ["Shield Generator", 5]], "unlock": "Conocer: nivel 3 y 33% con The Dweller. Acceso: comprar o vender en 50 estaciones distintas. Desbloqueo: 200 t de oro (se compra o se mina)", "arbol": "B2", "rep": ["mejoras", "mercancias"]},
  {"name": "Ram Tah", "site": "Phoenix Base", "system": "Meene", "mods": [["Guardian Gauss Cannon", 1], ["Guardian Plasma Charger", 1], ["Guardian Shard Cannon", 1], ["Caustic Sink Launcher", 5], ["Chaff Launcher", 5], ["Electronic Countermeasure", 5], ["Heat Sink Launcher", 5], ["Point Defence", 5], ["Guardian Power Distributor", 1], ["Guardian Power Plant", 1], ["Cargo Rack", 4], ["Collector Limpet Controller", 4], ["Fuel Transfer Limpet Controller", 4], ["Prospector Limpet Controller", 4], ["Hatch Breaker Limpet Controller", 3], ["Guardian Frame Shift Drive Booster", 1], ["Guardian Hull Reinforcement Package", 1], ["Guardian Module Reinforcement Package", 1], ["Guardian Shield Reinforcement Package", 1]]},
  {"name": "Felicity Farseer", "site": "Farseer Inc", "system": "Deciat", "mods": [["Shield Booster", 1], ["Frame Shift Drive", 5], ["Sensors", 3], ["Thrusters", 3], ["Power Plant", 1], ["Detailed Surface Scanner", 3], ["Frame Shift Drive Interdictor", 1]]},
  {"name": "Juri Ishmaak", "site": "Pater's Memorial", "system": "Giryak", "mods": [["Abrasion Blaster", 5], ["Enzyme Missile Rack", 5], ["Mine Launcher", 5], ["Mining Laser", 5], ["Missile Rack (Dumbfire)", 3], ["Missile Rack (Seeker)", 3], ["Torpedo Pylon", 3], ["Frame Shift Wake Scanner", 3], ["Kill Warrant Scanner", 3], ["Manifest Scanner", 3], ["Sensors", 5], ["Detailed Surface Scanner", 5]]},
  {"name": "Colonel Bris Dekker", "site": "Dekker's Yard", "system": "Sol", "permit": true, "mods": [["Frame Shift Drive", 3], ["Frame Shift Drive Interdictor", 4]]},
  {"name": "The Sarge", "site": "The Beach", "system": "Beta-3 Tucani", "mods": [["Cannon", 5], ["Rail Gun", 3], ["Collector Limpet Controller", 5], ["Fuel Transfer Limpet Controller", 5], ["Hatch Breaker Limpet Controller", 5], ["Prospector Limpet Controller", 5]]},
  {"name": "Tod 'The Blaster' McQuinn", "site": "Trophy Camp", "system": "Wolf 397", "mods": [["Multi Cannon", 5], ["Rail Gun", 5], ["Fragment Cannon", 3], ["Cannon", 2]]},
  {"name": "Selene Jean", "site": "Prospector's Rest", "system": "Kuk", "mods": [["Armour", 5], ["Hull Reinforcement Package", 5], ["Module Reinforcement Package", 5]]},
  {"name": "Didi Vatermann", "site": "Vaterman LLC", "system": "Leesti", "mods": [["Shield Booster", 5], ["Shield Generator", 3]]},
  {"name": "Bill Turner", "site": "Turner Metallics Inc", "system": "Alioth", "permit": true, "mods": [["Plasma Accelerator", 5], ["Frame Shift Wake Scanner", 3], ["Kill Warrant Scanner", 3], ["Manifest Scanner", 3], ["Sensors", 5], ["Life Support", 3], ["Detailed Surface Scanner", 5], ["Cargo Rack", 4], ["Auto Field Maintenance Unit", 3], ["Fuel Scoop", 3], ["Refinery", 3]]},
  {"name": "Liz Ryder", "site": "Demolition Unlimited", "system": "Eurybia", "mods": [["Missile Rack (Dumbfire)", 5], ["Missile Rack (Seeker)", 5], ["Torpedo Pylon", 5], ["Abrasion Blaster", 3], ["Enzyme Missile Rack", 3], ["Mine Launcher", 3], ["Mining Laser", 3], ["Armour", 1], ["Hull Reinforcement Package", 1]]},
  {"name": "Hera Tani", "site": "The Jet's Hole", "system": "Kuwemaki", "mods": [["Power Plant", 5], ["Power Distributor", 3], ["Sensors", 3], ["Detailed Surface Scanner", 5]]},
  {"name": "Broo Tarquin", "site": "Broo's Legacy", "system": "Muang", "mods": [["Beam Laser", 5], ["Burst Laser", 5], ["Pulse Laser", 5]]},
  {"name": "Tiana Fortune", "site": "Fortune's Loss", "system": "Achenar", "permit": true, "mods": [["Frame Shift Wake Scanner", 5], ["Kill Warrant Scanner", 5], ["Manifest Scanner", 5], ["Sensors", 5], ["Collector Limpet Controller", 5], ["Fuel Transfer Limpet Controller", 5], ["Hatch Breaker Limpet Controller", 5], ["Prospector Limpet Controller", 5], ["Cargo Rack", 4], ["Detailed Surface Scanner", 3], ["Frame Shift Drive Interdictor", 3]]},
  {"name": "Mel Brandon", "site": "The Brig", "system": "Luchtaine", "colonia": true, "mods": [["Beam Laser", 5], ["Burst Laser", 5], ["Pulse Laser", 5], ["Shield Booster", 5], ["Frame Shift Drive", 5], ["Thrusters", 5], ["Frame Shift Drive Interdictor", 5], ["Shield Generator", 5], ["Shield Cell Bank", 4]], "unlock": "Conocer: nivel 3 y 33% con Elvira Martuuk. Acceso: invitación del Colonia Council (misiones del Colonia Council en el sistema Colonia hasta amistoso; luego misión especial de invitación). Desbloqueo: entregar 100.000 CR en vales de recompensa", "arbol": "A1", "rep": ["mejoras"]},
  {"name": "Marsha Hicks", "site": "The Watchtower", "system": "Tir", "colonia": true, "mods": [["Cannon", 5], ["Fragment Cannon", 5], ["Multi Cannon", 5], ["Collector Limpet Controller", 5], ["Fuel Scoop", 5], ["Fuel Transfer Limpet Controller", 5], ["Hatch Breaker Limpet Controller", 5], ["Prospector Limpet Controller", 5], ["Refinery", 5]], "unlock": "Conocer: nivel 3 y 33% con The Dweller. Acceso: rango de exploración Surveyor o más. Desbloqueo: minar 10 t de osmio", "arbol": "B1", "rep": ["mejoras"]},
  {"name": "Petra Olmanova", "site": "Sanctuary", "system": "Asura", "colonia": true, "mods": [["Mine Launcher", 5], ["Missile Rack (Dumbfire)", 5], ["Missile Rack (Seeker)", 5], ["Torpedo Pylon", 5], ["Caustic Sink Launcher", 5], ["Chaff Launcher", 5], ["Electronic Countermeasure", 5], ["Heat Sink Launcher", 5], ["Point Defence", 5], ["Armour", 5], ["Auto Field Maintenance Unit", 5], ["Hull Reinforcement Package", 5], ["Module Reinforcement Package", 5]]},
  {"name": "Etienne Dorn", "site": "Kraken's Retreat", "system": "Los", "colonia": true, "mods": [["Plasma Accelerator", 5], ["Rail Gun", 5], ["Frame Shift Wake Scanner", 5], ["Kill Warrant Scanner", 5], ["Manifest Scanner", 5], ["Life Support", 5], ["Power Distributor", 5], ["Power Plant", 5], ["Sensors", 5], ["Detailed Surface Scanner", 5]], "unlock": "Conocer: nivel 3 y 33% con Liz Ryder. Acceso: rango de comercio Dealer o más. Desbloqueo: entregar 25 Occupied Escape Pods"},
];

const slug = (n) => String(n).toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Estado de un ingeniero de nave según EngineerProgress: en Horizons «Invited» aún pide el contrato. */
function shipStatus(ranks, name) {
  const r = ranks && ranks[name];
  const p = r && r.progress;
  if (p === 'Unlocked') return { key: 'unlocked', rank: r.rank ?? null };
  if (p === 'Invited') return { key: 'invited', rank: null };
  if (p === 'Known') return { key: 'known', rank: null };
  return { key: 'none', rank: null };
}

/**
 * Lista de ingenieros de nave para la pantalla. module: nombre en inglés del módulo para filtrar (o null).
 * Orden: los que hacen el módulo con más grado, luego desbloqueados, luego el resto; Colonia al final.
 */
function shipList(ranks, module) {
  const order = { unlocked: 0, invited: 1, known: 2, none: 3 };
  return ENGINEERS
    .filter((e) => !module || e.mods.some(([m]) => m === module))
    .map((e) => {
      const st = shipStatus(ranks, e.name);
      const grade = module ? e.mods.find(([m]) => m === module)[1] : null;
      return { ...e, slug: slug(e.name), status: st.key, rank: st.rank, grade,
        mods: e.mods.map(([m, g]) => ({ key: m, name: (MODULES[m] || {}).es || m, cat: (MODULES[m] || {}).cat || 'O', grade: g })) };
    })
    .sort((a, b) => (b.grade || 0) - (a.grade || 0) || order[a.status] - order[b.status] || !!a.colonia - !!b.colonia || a.name.localeCompare(b.name));
}

/** Módulos agrupados por categoría (para el filtro), solo los que algún ingeniero mejora. */
function moduleIndex() {
  const used = new Set(ENGINEERS.flatMap((e) => e.mods.map(([m]) => m)));
  const out = {};
  for (const [k, v] of Object.entries(MODULES)) if (used.has(k)) (out[v.cat] = out[v.cat] || []).push({ key: k, name: v.es });
  for (const c of Object.keys(out)) out[c].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return out;
}

module.exports = { CATS, MODULES, ENGINEERS, shipStatus, shipList, moduleIndex, slug };
