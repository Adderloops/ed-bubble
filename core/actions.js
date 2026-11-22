'use strict';

/**
 * ED BUBBLE · acciones que la app puede ejecutar en el juego.
 * Cada acción es una lista de pasos: una acción del .binds que pulsar, o una
 * espera. Al ejecutar se trae el juego al frente y se pulsan las teclas que el
 * comandante tiene asignadas en SU preset de controles.
 */

const { bindLabel } = require('./binds');
const { canSend, pressOps } = require('./keysender');

const press = (bind) => ({ press: bind });
const wait = (ms) => ({ wait: ms });

const ACTIONS = {
  // Interruptores (su estado viene de Status.json)
  gear:        { label: 'Tren de aterrizaje', steps: [press('LandingGearToggle')] },
  fa:          { label: 'Asistencia de vuelo', steps: [press('ToggleFlightAssist')] },
  hardpoints:  { label: 'Armamento', steps: [press('DeployHardpointToggle')] },
  lights:      { label: 'Luces', steps: [press('ShipSpotLightToggle')] },
  scoop:       { label: 'Recolector de carga', steps: [press('ToggleCargoScoop')] },
  nightvision: { label: 'Visión nocturna', steps: [press('NightVisionToggle')] },
  // Acciones
  heatsink:    { label: 'Disipador de calor', steps: [press('DeployHeatSink')] },
  silent:      { label: 'Modo silencioso', steps: [press('ToggleButtonUpInput')] },
  eject:       { label: 'Expulsar toda la carga', steps: [press('EjectAllCargo')], confirm: true },
  nextsys:     { label: 'Siguiente sistema de la ruta', steps: [press('TargetNextRouteSystem')] },
  // Macro de la página Vuelo de Touch Portal: panel izquierdo → pestaña de
  // contactos → solicitar atraque.
  dock:        { label: 'Solicitar atraque', steps: [press('FocusLeftPanel'), wait(450), press('CyclePreviousPanel'), wait(250), press('CyclePreviousPanel'), wait(300), press('UI_Right'), wait(250), press('UI_Select')] },
};

// Controles del juego que ED BUBBLE necesita, agrupados por lo que los usa.
// Nombres como en el menú de controles del juego (aproximados).
const BIND_NAMES = {
  LandingGearToggle: 'Tren de aterrizaje', ToggleFlightAssist: 'Asistencia de vuelo', DeployHardpointToggle: 'Desplegar armamento',
  ShipSpotLightToggle: 'Luces', ToggleCargoScoop: 'Recolector de carga', NightVisionToggle: 'Visión nocturna',
  DeployHeatSink: 'Disipador de calor', ToggleButtonUpInput: 'Modo silencioso', EjectAllCargo: 'Expulsar toda la carga',
  TargetNextRouteSystem: 'Siguiente sistema de la ruta', FocusLeftPanel: 'Panel izquierdo', CyclePreviousPanel: 'Pestaña anterior',
  UI_Up: 'Interfaz: arriba', UI_Right: 'Interfaz: derecha', UI_Select: 'Interfaz: seleccionar', UI_Back: 'Interfaz: atrás',
  GalaxyMapOpen: 'Mapa galáctico', CamZoomIn: 'Cámara: acercar', CamZoomOut: 'Cámara: alejar',
};
const CHECK_GROUPS = [
  { name: 'Vuelo', binds: ['LandingGearToggle', 'ToggleFlightAssist', 'DeployHardpointToggle', 'ShipSpotLightToggle', 'ToggleCargoScoop', 'NightVisionToggle', 'DeployHeatSink', 'ToggleButtonUpInput', 'EjectAllCargo', 'TargetNextRouteSystem', 'FocusLeftPanel', 'CyclePreviousPanel', 'UI_Right', 'UI_Select'] },
  { name: 'Trazar ruta', binds: require('./plot').NEEDED },
];

const chord = (b) => `${[...b.modifiers].sort().join('+')}|${b.key}`;

/**
 * Revisión de controles: por grupo, cuántos están listos, y la lista de
 * problemas (sin asignar, solo en mando, tecla que no se puede enviar, o
 * tecla compartida entre dos acciones que usa ED BUBBLE).
 */
function checkControls(controls) {
  const kb = (controls && controls.binds) || {};
  const other = (controls && controls.otherDevices) || new Set();
  const all = [...new Set(CHECK_GROUPS.flatMap((g) => g.binds))];
  const byChord = {};
  for (const a of all) if (kb[a]) (byChord[chord(kb[a])] = byChord[chord(kb[a])] || []).push(a);
  const statusOf = (a) => {
    const b = kb[a];
    if (!b) return other.has(a) ? { status: 'hotas' } : { status: 'unbound' };
    if (!canSend(b)) return { status: 'unsupported', key: bindLabel(b) };
    const shared = byChord[chord(b)].filter((x) => x !== a);
    if (shared.length) return { status: 'shared', key: bindLabel(b), with: shared.map((x) => BIND_NAMES[x] || x) };
    return { status: 'ok', key: bindLabel(b) };
  };
  const st = Object.fromEntries(all.map((a) => [a, statusOf(a)]));
  const groups = CHECK_GROUPS.map((g) => ({ name: g.name, soon: !!g.soon, total: g.binds.length, ready: g.binds.filter((a) => st[a].status === 'ok').length }));
  const problems = [];
  for (const a of all) {
    if (st[a].status === 'ok') continue;
    problems.push({ action: a, label: BIND_NAMES[a] || a, groups: CHECK_GROUPS.filter((g) => g.binds.includes(a)).map((g) => g.name), ...st[a] });
  }
  return { groups, problems, total: all.length, ready: all.filter((a) => st[a].status === 'ok').length };
}

/** Estado de cada acción con los controles cargados: tecla que se usará, o por qué no se puede. */
function describe(binds) {
  const out = {};
  for (const [id, a] of Object.entries(ACTIONS)) {
    const needed = a.steps.filter((s) => s.press).map((s) => s.press);
    const missing = binds ? needed.filter((n) => !canSend(binds[n])) : needed;
    const first = binds && binds[needed[0]];
    out[id] = {
      label: a.label,
      confirm: !!a.confirm,
      macro: needed.length > 1,
      key: needed.length > 1 ? 'macro' : bindLabel(first),
      available: !!binds && missing.length === 0,
      missing,
    };
  }
  return out;
}

/** Operaciones de teclado para una acción, o { error }. */
function build(id, binds) {
  const a = ACTIONS[id];
  if (!a) return { error: 'unknown-action' };
  if (!binds) return { error: 'no-binds' };
  const ops = [{ op: 'focus' }, { op: 'sleep', ms: 120 }];
  for (const s of a.steps) {
    if (s.wait) { ops.push({ op: 'sleep', ms: s.wait }); continue; }
    const b = binds[s.press];
    if (!canSend(b)) return { error: 'no-key', action: s.press };
    ops.push(...pressOps(b));
  }
  return { ops };
}

module.exports = { ACTIONS, CHECK_GROUPS, BIND_NAMES, describe, build, checkControls };
