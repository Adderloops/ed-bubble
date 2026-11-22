'use strict';

const { t, getLanguage } = require('../i18n');

const defs = require('../../definitions/category-powerplay');
const { getPowerplayColor, getMeritsToNextRank } = require('../services/powerplay-ranks');
const { formatThousands } = require('../services/format');
const control = require('../services/powerplay-control');

/**
 * A diferencia del proyecto ElitePowerPlayTracker original (que releía el
 * Journal entero cada 2s buscando "Powerplay"), aquí escuchamos los
 * eventos del Journal directamente según van llegando por el tailer
 * incremental: más ligero y sin límite de tamaño de journal.
 *
 * Se soportan tanto los eventos "clásicos" (Powerplay, al inicio de sesión)
 * como los añadidos en el relanzamiento de Powerplay 2.0 (PowerplayMerits,
 * PowerplayRank), que la librería Java de referencia todavía no tenía
 * registrados en su lista de eventos conocidos.
 */
module.exports = function registerPowerplayHandlers(router, ctx) {
  const { state, session } = ctx;

  function applyMerits(power, rank, totalMerits) {
    if (power !== undefined) {
      state.set(defs.states.name.id, power);
      state.set(defs.states.color.id, getPowerplayColor(power));
    }
    if (rank !== undefined) {
      state.set(defs.states.rank.id, rank);
      const next = getMeritsToNextRank(rank, totalMerits || 0);
      state.set(defs.states.nextRank.id, next.nextRank);
      state.set(defs.states.remainingMerits.id, formatThousands(next.remainingMerits === null ? t('missionRequired') : next.remainingMerits));
    }
    if (totalMerits !== undefined) {
      if (session.powerplay.meritsAtReset === null) session.powerplay.meritsAtReset = totalMerits;
      state.set(defs.states.totalMerits.id, formatThousands(totalMerits));
      state.set(defs.states.gainedMerits.id, formatThousands(totalMerits - session.powerplay.meritsAtReset));
    }
    state.set(defs.states.status.id, t('connected'));
  }

  // Evento de arranque de sesión (schema "clásico")
  router.on('Powerplay', (e) => {
    applyMerits(e.Power, e.Rank, e.Merits);
  });

  // Eventos del relanzamiento Powerplay 2.0
  router.on('PowerplayMerits', (e) => {
    applyMerits(e.Power, undefined, e.TotalMerits !== undefined ? e.TotalMerits : e.Merits);
  });
  router.on('PowerplayRank', (e) => {
    const rank = e.Rank !== undefined ? e.Rank : e.NewRank !== undefined ? e.NewRank : e.NewRating;
    applyMerits(e.Power, rank, undefined);
  });

  router.on('PowerplayJoin', (e) => applyMerits(e.Power, 0, 0));
  router.on('PowerplayLeave', () => applyMerits('', 0, 0));
  router.on('PowerplayDefect', (e) => applyMerits(e.ToPower, 0, 0));

  // ---------------------------------------------------------------------
  // Control del SISTEMA (barra hacia el siguiente estado, como el panel del juego).
  // El Journal solo escribe estos datos al aparecer en un sistema (Location) o
  // al saltar a él (FSDJump): el valor mostrado es el último que vio el juego.
  // ---------------------------------------------------------------------
  const systems = new Map(); // nombre en minúsculas -> { name, timestamp, rawState, ctl }
  let currentSystem = '';
  let trackedSystem = '';

  const key = (name) => String(name || '').trim().toLowerCase();
  const stateLabel = (raw) => {
    const map = {
      Unoccupied: 'ppUnoccupied',
      Exploited: 'ppExploited',
      Fortified: 'ppFortified',
      Stronghold: 'ppStronghold',
    };
    return map[raw] ? t(map[raw]) : raw;
  };
  const signed = (n) => (n > 0 ? '+' : '') + formatThousands(n);
  const percent = (progress) => {
    const text = (Math.min(progress, 9.999) * 100).toFixed(1);
    return (getLanguage() === 'es' ? text.replace('.', ',') : text) + '%';
  };
  const two = (n) => String(n).padStart(2, '0');
  function asOfText(timestamp) {
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return '-';
    const clock = `${two(d.getHours())}:${two(d.getMinutes())}`;
    const today = new Date();
    const sameDay = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    return `${t('ppAsOf')} ${sameDay ? '' : `${two(d.getDate())}/${two(d.getMonth() + 1)} `}${clock}`;
  }

  function renderControl() {
    const shownName = trackedSystem || currentSystem;
    const rec = shownName ? systems.get(key(shownName)) : undefined;
    const ctl = rec ? rec.ctl : null;
    const D = defs.states;
    const pairs = [];
    const dash = '-';

    pairs.push({ id: D.sysName.id, value: rec ? rec.name : shownName || dash });

    if (ctl) {
      pairs.push(
        { id: D.sysState.id, value: stateLabel(ctl.state) },
        { id: D.sysNextState.id, value: ctl.nextState ? stateLabel(ctl.nextState) : t('ppMax') },
        { id: D.sysProgress.id, value: percent(ctl.progress) },
        { id: D.sysCp.id, value: `${formatThousands(ctl.totalCp)} / ${formatThousands(ctl.cap)}` },
        { id: D.sysRemaining.id, value: ctl.reached ? t('ppReached') : formatThousands(ctl.remaining) },
        { id: D.sysReinforcement.id, value: formatThousands(ctl.reinforcement) },
        { id: D.sysUndermining.id, value: formatThousands(ctl.undermining) },
        { id: D.sysNet.id, value: signed(ctl.net) },
        { id: D.sysAsOf.id, value: asOfText(rec.timestamp) }
      );
      control.segmentStates(ctl.baseProgress, ctl.progress).forEach((v, i) => {
        pairs.push({ id: D[`seg${two(i + 1)}`].id, value: v });
      });
    } else {
      const label = rec ? (rec.rawState ? stateLabel(rec.rawState) : t('ppNoPowerplay')) : t('noData');
      pairs.push(
        { id: D.sysState.id, value: label },
        { id: D.sysNextState.id, value: dash },
        { id: D.sysProgress.id, value: dash },
        { id: D.sysCp.id, value: dash },
        { id: D.sysRemaining.id, value: dash },
        { id: D.sysReinforcement.id, value: dash },
        { id: D.sysUndermining.id, value: dash },
        { id: D.sysNet.id, value: dash },
        { id: D.sysAsOf.id, value: rec ? asOfText(rec.timestamp) : dash }
      );
      for (let i = 1; i <= control.SEGMENT_COUNT; i += 1) pairs.push({ id: D[`seg${two(i)}`].id, value: control.SEG_EMPTY });
    }
    state.setMany(pairs);
  }

  function onSystemEvent(e) {
    if (!e.StarSystem) return;
    currentSystem = e.StarSystem;
    systems.set(key(e.StarSystem), {
      name: e.StarSystem,
      timestamp: e.timestamp,
      rawState: e.PowerplayState || '',
      ctl: control.computeControl(e),
    });
    renderControl();
  }
  router.on('Location', onSystemEvent);
  router.on('FSDJump', onSystemEvent);

  // API para plugin.js: ajuste "Tracked system" de Touch Portal (vacío = sistema actual).
  ctx.powerplay = {
    setTrackedSystem(name) {
      if (name === undefined) return;
      trackedSystem = String(name).trim();
      renderControl();
    },
    render: renderControl,
  };

  router.on('PowerplayVoucher', (e) => {
    const amount = Array.isArray(e.Systems) ? e.Systems.length : e.Amount || 0;
    state.set(defs.states.lastVoucherAmount.id, formatThousands(amount));
  });
  router.on('PowerplaySalary', (e) => {
    if (e.Amount !== undefined) state.set(defs.states.lastVoucherAmount.id, formatThousands(e.Amount));
  });
};
