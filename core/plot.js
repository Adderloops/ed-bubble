'use strict';

/**
 * ED BUBBLE · Trazar ruta en el mapa galáctico.
 *
 * Secuencia (idea tomada del análisis de Elite AI Bridge / COVAS:NEXT;
 * implementación propia):
 *   1. Copiar el nombre del sistema al portapapeles.
 *   2. Traer el juego al frente y abrir el mapa galáctico; esperar a que
 *      Status.json diga GuiFocus = mapa galáctico (máx. 5 s).
 *   3. Acercar cámara, subir al buscador, seleccionarlo, pegar (Ctrl+V), Intro.
 *   4. Derecha, esperar 0,5 s, seleccionar el resultado y alejar la cámara.
 *   5. Esperar a que el mapa viaje al sistema: 3 s + 1 s por cada 1.000 al.
 *   6. Mantener "Seleccionar" 1 s (trazar ruta).
 *   7. Comprobar en NavRoute.json / FSDTarget que la ruta va a ese sistema
 *      (máx. 30 s) y cerrar el mapa.
 * Si el juego pierde el foco en cualquier paso, se detiene.
 */

const { canSend, pressOps } = require('./keysender');

const NEEDED = ['GalaxyMapOpen', 'CamZoomIn', 'CamZoomOut', 'UI_Up', 'UI_Right', 'UI_Select'];
const T = { travelBase: 3000, travelPer1000: 1000, poll: 150, settle: 700, step: 180, afterSearchSelect: 450, afterPaste: 350, afterEnter: 900, afterRight: 500, mapOpenTimeout: 5000, verifyTimeout: 30000, hold: 1000 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

function missingBinds(binds) {
  return NEEDED.filter((n) => !binds || !canSend(binds[n]));
}

/** Espera de viaje del mapa según la distancia (s). */
function travelWait(distanceLy) {
  return distanceLy > 0 ? T.travelBase + Math.floor(distanceLy / 1000) * T.travelPer1000 : T.travelBase + 2 * T.travelPer1000;
}

/**
 * Traza la ruta. `ctx`:
 *   keys       KeySender
 *   binds      controles de teclado
 *   getState() estado actual del motor
 *   clipboard  { writeText }
 *   onStep(text) progreso para la ventana
 *   isCancelled() true si el comandante canceló
 */
async function plotRoute(target, distanceLy, ctx) {
  const { keys, binds, getState, clipboard, onStep = () => {}, isCancelled = () => false } = ctx;
  const missing = missingBinds(binds);
  if (missing.length) return { ok: false, error: 'no-key', missing };

  const press = (name, holdMs) => pressOps(binds[name], holdMs);
  const raw = (key, mods = []) => pressOps({ key, modifiers: mods });
  const run = async (ops, step) => {
    if (isCancelled()) throw Object.assign(new Error('cancelled'), { code: 'cancelled', step });
    const r = await keys.run(ops);
    if (!r.ok) throw Object.assign(new Error(r.error), { code: r.error, step });
  };
  const guiFocus = () => (getState().status || {}).guiFocus;
  const waitFor = async (cond, timeout) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (isCancelled()) return false;
      if (cond()) return true;
      await sleep(T.poll);
    }
    return cond();
  };

  try {
    await clipboard.writeText(target); // en Electron 45 es asíncrono

    // Si el mapa ya está abierto, se cierra para empezar siempre igual.
    if (guiFocus() === 'GalaxyMap') {
      onStep('Cerrando el mapa galáctico abierto');
      await run([{ op: 'focus' }, { op: 'sleep', ms: 150 }, ...press('GalaxyMapOpen')], 'close-open-map');
      await waitFor(() => guiFocus() !== 'GalaxyMap', 3000);
      await sleep(600);
    }

    onStep('Abriendo el mapa galáctico');
    await run([{ op: 'focus' }, { op: 'sleep', ms: 150 }, ...press('GalaxyMapOpen')], 'open-map');
    const opened = await waitFor(() => guiFocus() === 'GalaxyMap', T.mapOpenTimeout);
    if (isCancelled()) throw Object.assign(new Error('cancelled'), { code: 'cancelled' });
    if (!opened) onStep('El mapa no lo confirma Status.json; sigo igualmente');
    await sleep(T.settle);

    onStep(`Buscando ${target}`);
    await run([
      ...press('CamZoomIn'), { op: 'sleep', ms: T.step },
      ...press('UI_Up'), { op: 'sleep', ms: T.step },
      ...press('UI_Select'), { op: 'sleep', ms: T.afterSearchSelect },
      ...raw('Key_V', ['Key_LeftControl']), { op: 'sleep', ms: T.afterPaste },
      ...raw('Key_Enter'), { op: 'sleep', ms: T.afterEnter },
    ], 'search');

    onStep('Seleccionando el resultado');
    await run([
      ...press('UI_Right'), { op: 'sleep', ms: T.afterRight },
      ...press('UI_Select'), { op: 'sleep', ms: T.step },
      ...press('CamZoomOut'),
    ], 'select');

    const wait = travelWait(distanceLy);
    onStep(`Esperando a que el mapa llegue al sistema (${Math.round(wait / 1000)} s)`);
    const until = Date.now() + wait;
    while (Date.now() < until) { if (isCancelled()) throw Object.assign(new Error('cancelled'), { code: 'cancelled' }); await sleep(Math.min(200, T.poll)); }

    onStep('Trazando la ruta');
    await run(press('UI_Select', T.hold), 'plot');

    onStep('Comprobando la ruta');
    const ok = await waitFor(() => {
      const s = getState();
      const r = s.route || [];
      return (r.length && same(r[r.length - 1].system, target)) || same(s.fsdTarget && s.fsdTarget.name, target);
    }, T.verifyTimeout);

    if (guiFocus() === 'GalaxyMap') {
      try { await run(press('GalaxyMapOpen'), 'close-map'); } catch (e) { /* el mapa se queda abierto */ }
    }
    if (isCancelled()) return { ok: false, error: 'cancelled' };
    return ok ? { ok: true } : { ok: false, error: 'not-confirmed' };
  } catch (e) {
    return { ok: false, error: e.code || e.message, step: e.step };
  }
}

module.exports = { plotRoute, missingBinds, travelWait, NEEDED, T };
