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
  // Combate. «Fijar planta de energía»: como el botón de la página Combate de Touch Portal,
  // 6 pulsaciones de «subsistema anterior» (en el juego no hay tecla directa para la planta).
  powerplant:  { label: 'Fijar planta de energía', steps: [press('CyclePreviousSubsystem'), wait(40), press('CyclePreviousSubsystem'), wait(40), press('CyclePreviousSubsystem'), wait(40), press('CyclePreviousSubsystem'), wait(40), press('CyclePreviousSubsystem'), wait(40), press('CyclePreviousSubsystem')] },
  wing1:       { label: 'Fijar objetivo de mi compañero', steps: [press('TargetWingman0'), wait(250), press('SelectTargetsTarget')] },
  wing2:       { label: 'Objetivo del compañero 2', steps: [press('TargetWingman1'), wait(250), press('SelectTargetsTarget')] },
  wing3:       { label: 'Objetivo del compañero 3', steps: [press('TargetWingman2'), wait(250), press('SelectTargetsTarget')] },
  wingtarget:  { label: 'Objetivo del compañero fijado', steps: [press('SelectTargetsTarget')] },
  // Órdenes al caza
  f_orders:    { label: 'Abrir órdenes del caza', steps: [press('OpenOrders')] },
  f_defend:    { label: 'Caza: defenderme', steps: [press('OrderDefensiveBehaviour')] },
  f_attack:    { label: 'Caza: atacar a discreción', steps: [press('OrderAggressiveBehaviour')] },
  f_focus:     { label: 'Caza: atacar mi objetivo', steps: [press('OrderFocusTarget')] },
  f_hold:      { label: 'Caza: alto el fuego', steps: [press('OrderHoldFire')] },
  f_pos:       { label: 'Caza: mantener posición', steps: [press('OrderHoldPosition')] },
  f_follow:    { label: 'Caza: seguirme', steps: [press('OrderFollow')] },
  f_dock:      { label: 'Caza: volver a la nave', steps: [press('OrderRequestDock')] },
  // SRV (Scarab, Scorpion, Nomad, Rhino)
  srv_brake:    { label: 'Freno de mano', steps: [press('AutoBreakBuggyButton')] },
  srv_assist:   { label: 'Asistencia a la conducción', steps: [press('ToggleDriveAssist')] },
  srv_turret:   { label: 'Vista de torreta', steps: [press('ToggleBuggyTurretButton')] },
  srv_lights:   { label: 'Faros', steps: [press('HeadlightsBuggyButton')] },
  srv_scoop:    { label: 'Recolector de carga (SRV)', steps: [press('ToggleCargoScoop_Buggy')] },
  srv_analysis: { label: 'Modo análisis (SRV)', steps: [press('PlayerHUDModeToggle_Buggy')] },
  srv_ship:     { label: 'Llamar o despedir la nave', steps: [press('RecallDismissShip')] },
  srv_sysmap:   { label: 'Mapa del sistema (SRV)', steps: [press('SystemMapOpen_Buggy')] },
  srv_galmap:   { label: 'Mapa galáctico (SRV)', steps: [press('GalaxyMapOpen_Buggy')] },
  srv_target:   { label: 'Fijar objetivo (SRV)', steps: [press('SelectTarget_Buggy')] },
  srv_eject:    { label: 'Expulsar toda la carga (SRV)', steps: [press('EjectAllCargo_Buggy')], confirm: true },
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
  CyclePreviousSubsystem: 'Subsistema anterior', TargetWingman0: 'Compañero 1', TargetWingman1: 'Compañero 2', TargetWingman2: 'Compañero 3', SelectTargetsTarget: 'Objetivo del compañero',
  OpenOrders: 'Órdenes del caza', OrderDefensiveBehaviour: 'Caza: defender', OrderAggressiveBehaviour: 'Caza: agresivo', OrderFocusTarget: 'Caza: atacar mi objetivo',
  OrderHoldFire: 'Caza: alto el fuego', OrderHoldPosition: 'Caza: mantener posición', OrderFollow: 'Caza: seguirme', OrderRequestDock: 'Caza: volver a la nave',
  GalaxyMapOpen: 'Mapa galáctico', CamZoomIn: 'Cámara: acercar', CamZoomOut: 'Cámara: alejar',
  AutoBreakBuggyButton: 'SRV: freno de mano', ToggleDriveAssist: 'SRV: asistencia a la conducción', ToggleBuggyTurretButton: 'SRV: torreta', HeadlightsBuggyButton: 'SRV: faros',
  ToggleCargoScoop_Buggy: 'SRV: recolector de carga', PlayerHUDModeToggle_Buggy: 'SRV: modo análisis', RecallDismissShip: 'Llamar / despedir la nave', SystemMapOpen_Buggy: 'SRV: mapa del sistema',
  GalaxyMapOpen_Buggy: 'SRV: mapa galáctico', SelectTarget_Buggy: 'SRV: fijar objetivo', EjectAllCargo_Buggy: 'SRV: expulsar carga',
};
const CHECK_GROUPS = [
  { name: 'Vuelo', binds: ['LandingGearToggle', 'ToggleFlightAssist', 'DeployHardpointToggle', 'ShipSpotLightToggle', 'ToggleCargoScoop', 'NightVisionToggle', 'DeployHeatSink', 'ToggleButtonUpInput', 'EjectAllCargo', 'TargetNextRouteSystem', 'FocusLeftPanel', 'CyclePreviousPanel', 'UI_Right', 'UI_Select'] },
  { name: 'Combate', binds: ['CyclePreviousSubsystem', 'TargetWingman0', 'TargetWingman1', 'TargetWingman2', 'SelectTargetsTarget'] },
  { name: 'Caza', binds: ['OpenOrders', 'OrderDefensiveBehaviour', 'OrderAggressiveBehaviour', 'OrderFocusTarget', 'OrderHoldFire', 'OrderHoldPosition', 'OrderFollow', 'OrderRequestDock'] },
  { name: 'SRV', binds: ['AutoBreakBuggyButton', 'ToggleDriveAssist', 'ToggleBuggyTurretButton', 'HeadlightsBuggyButton', 'ToggleCargoScoop_Buggy', 'PlayerHUDModeToggle_Buggy', 'RecallDismissShip', 'SystemMapOpen_Buggy', 'GalaxyMapOpen_Buggy', 'SelectTarget_Buggy', 'EjectAllCargo_Buggy'] },
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
  const items = all.map((a) => ({ action: a, label: BIND_NAMES[a] || a, groups: CHECK_GROUPS.filter((g) => g.binds.includes(a)).map((g) => g.name), ...st[a] }));
  return { groups, problems, items, total: all.length, ready: all.filter((a) => st[a].status === 'ok').length };
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
