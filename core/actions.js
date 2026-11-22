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

module.exports = { ACTIONS, describe, build };
