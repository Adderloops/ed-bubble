'use strict';

/**
 * Motor de datos de ED BUBBLE. Sigue en vivo el Journal y los JSON del juego,
 * mantiene un único estado (model.js) y avisa de cada cambio con 'update'
 * (agrupando cambios seguidos para no saturar la interfaz).
 *
 *   const engine = new Engine({ folder });
 *   engine.on('update', ({ state, view }) => …);
 *   engine.start();
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

const { JournalTailer, getJournalFolder } = require('../src/services/journal-tailer');
const StatusReader = require('../src/services/status-reader');
const model = require('./model');
const derive = require('./derive');

class JsonFileWatcher {
  constructor(file, intervalMs, onData) {
    this.file = file; this.intervalMs = intervalMs; this.onData = onData; this._last = null; this._timer = null;
  }
  start() { this.tick(); this._timer = setInterval(() => this.tick(), this.intervalMs); }
  stop() { if (this._timer) clearInterval(this._timer); this._timer = null; }
  tick() {
    let raw;
    try { raw = fs.readFileSync(this.file, 'utf8'); } catch (e) { return; }
    if (raw === this._last) return;
    let json;
    try { json = JSON.parse(raw); } catch (e) { return; } // a medio escribir: se reintenta
    this._last = raw;
    this.onData(json);
  }
}

class Engine extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.folder = opts.folder || getJournalFolder();
    this.throttleMs = opts.throttleMs ?? 150;
    this.state = model.createState();
    this._pending = null;
    this.tailer = new JournalTailer(this.folder, opts.journalPollMs || 400);
    this.status = new StatusReader(this.folder, opts.statusPollMs || 400);
    this.cargo = new JsonFileWatcher(path.join(this.folder, 'Cargo.json'), 1000, (j) => { model.applyCargo(this.state, j); this.changed(); });
    this.locker = new JsonFileWatcher(path.join(this.folder, 'ShipLocker.json'), 1500, (j) => { model.applyLocker(this.state, j, 'locker'); this.changed(); });
    this.backpack = new JsonFileWatcher(path.join(this.folder, 'Backpack.json'), 1500, (j) => { model.applyLocker(this.state, j, 'backpack'); this.changed(); });
    this.market = new JsonFileWatcher(path.join(this.folder, 'Market.json'), 1500, (j) => { model.applyMarket(this.state, j); this.changed(); });
    this.navroute = new JsonFileWatcher(path.join(this.folder, 'NavRoute.json'), 1000, (j) => { model.applyNavRoute(this.state, j); this.changed(); });

    this.tailer.on('event', (e) => { if (model.applyEvent(this.state, e)) this.changed(); });
    this.tailer.on('file-changed', (file) => {
      this.state.connection.journal = true;
      this.state.connection.journalFile = path.basename(file);
      this.changed();
    });
    this.tailer.on('error', (err) => { this.state.connection.journal = false; this.emit('warning', err.message); this.changed(); });
  }

  /**
   * Historial: repasa los Journals anteriores (últimas semanas) solo para
   * recuperar lo que no está en la sesión actual: construcciones de colonización,
   * última estación atracada e ingenieros. Lo demás sale del Journal en curso.
   */
  loadHistory({ maxFiles = 25, maxDays = 45, maxBytes = 60 * 1024 * 1024 } = {}) {
    const KEEP = ['Location', 'Docked', 'Undocked', 'ColonisationConstructionDepot', 'EngineerProgress', 'EngineerCraft', 'FSDJump', 'Powerplay', 'Loadout',
      // a pie: equipos, trajes y armas (no hay evento con todo lo que tienes)
      'SuitLoadout', 'SwitchSuitLoadout', 'CreateSuitLoadout', 'RenameSuitLoadout', 'DeleteSuitLoadout', 'LoadoutEquipModule', 'LoadoutRemoveModule', 'BuySuit', 'SellSuit', 'UpgradeSuit', 'BuyWeapon', 'SellWeapon', 'UpgradeWeapon',
      // materiales de ingeniería de nave: el total al arrancar el juego y lo que cambia después
      'Materials', 'MaterialCollected', 'MaterialDiscarded', 'MaterialTrade', 'Synthesis', 'TechnologyBroker', 'ScientificResearch', 'EngineerContribution', 'MissionCompleted',
      // combate: bonos y recompensas por cobrar, y misiones de masacre en curso
      'MissionAccepted', 'MissionRedirected', 'MissionAbandoned', 'MissionFailed', 'Missions', 'Bounty', 'FactionKillBond', 'CapShipBond', 'RedeemVoucher', 'Died',
      // exploración: datos sin vender desde la última venta (cartografía y exobiología)
      'Scan', 'SAAScanComplete', 'ScanOrganic', 'SellOrganicData', 'SellExplorationData', 'MultiSellExplorationData', 'FSSDiscoveryScan', 'FSSAllBodiesFound', 'FSSBodySignals', 'SAASignalsFound'];
    // (si al arrancar sigues en el último sistema del historial, sus cuerpos ya escaneados se conservan)
    const EXPLORE = new Set(['Scan', 'SAAScanComplete', 'ScanOrganic', 'SellOrganicData', 'SellExplorationData', 'MultiSellExplorationData', 'FSSDiscoveryScan', 'FSSAllBodiesFound', 'FSSBodySignals', 'SAASignalsFound']);
    let files;
    try { files = fs.readdirSync(this.folder).filter((f) => /^Journal\..*\.log$/.test(f)).sort(); } catch (e) { return 0; }
    files = files.slice(0, -1); // el último lo lee el tailer en vivo
    const since = Date.now() - maxDays * 86400000;
    const picked = [];
    let bytes = 0;
    for (const f of files.reverse()) {
      if (picked.length >= maxFiles) break;
      let st; try { st = fs.statSync(path.join(this.folder, f)); } catch (e) { continue; }
      if (st.mtimeMs < since || bytes + st.size > maxBytes) break;
      picked.unshift(f); bytes += st.size;
    }
    let n = 0;
    for (const f of picked) {
      let text; try { text = fs.readFileSync(path.join(this.folder, f), 'utf8'); } catch (e) { continue; }
      for (const line of text.split(/\r?\n/)) {
        if (!line || !KEEP.some((k) => line.includes(`"${k}"`))) continue;
        let e; try { e = JSON.parse(line); } catch (x) { continue; }
        if (!KEEP.includes(e.event)) continue;
        // de los saltos antiguos solo interesa el control de Powerplay (no cuentan como sesión)
        // de los sistemas antiguos solo cuenta lo que queda sin vender (no los cuerpos del sistema actual)
        if (EXPLORE.has(e.event)) require('./exploration').apply(this.state, e);
        if (EXPLORE.has(e.event)) { n += 1; continue; }
        if (e.event === 'FSDJump') { require('./exploration').apply(this.state, e); model.recordControl(this.state, e); model.recordJumpFuel(this.state, e); }
        else model.applyEvent(this.state, e);
        n += 1;
      }
    }
    // lo de sesiones pasadas no es "sesión" ni "ahora"
    this.state.log = [];
    this.state.location.docked = false;
    this.state.colonisation.current = null;
    this.state.session.bounties = 0;
    require('./combat').afterHistory(this.state);
    return n;
  }

  start() {
    try { this.historyEvents = this.loadHistory(); } catch (e) { this.emit('warning', `historial: ${e.message}`); }
    this.tailer.start();
    this.status.start((decoded) => { model.applyStatus(this.state, decoded.raw, decoded); this.changed(); });
    this.cargo.start();
    this.navroute.start();
    this.market.start(); this.locker.start(); this.backpack.start();
  }

  stop() { this.tailer.stop(); this.status.stop(); this.cargo.stop(); this.navroute.stop(); this.market.stop(); this.locker.stop(); this.backpack.stop(); }

  /** Sistema de Powerplay que se sigue (se mantiene aunque saltes a otro). */
  setTrackedSystem(name) { this.state.powerplay.tracked = name || null; this.changed(); }

  /** Posiciones de las muestras biológicas guardadas (el diario no las tiene): se recuperan al reabrir la app en el mismo sistema. */
  restoreBioSamples(saved) {
    let n = 0;
    for (const [body, byGenus] of Object.entries(saved || {})) {
      for (const [g, x] of Object.entries(byGenus || {})) {
        const cur = this.state.bio[body] && this.state.bio[body][g];
        if (cur && x && cur.speciesKey === x.speciesKey && (!cur.samples || !cur.samples.length) && Array.isArray(x.samples) && x.samples.length) { cur.samples = x.samples.slice(0, cur.step); n += 1; }
      }
    }
    if (n) this.changed();
  }

  /** Ruta de neutrones de Spansh (o null para quitarla). */
  setNeutronRoute(r) { this.state.neutron = r || null; this.changed(); }

  /** Cuerpos del sistema según Spansh (volcado), para Exploración. bodies null: Spansh no lo tiene. */
  setSpanshSystem(address, bodies, error) { this.state.exploration.spansh = { address, bodies: bodies || null, error: error || null, at: Date.now() }; this.changed(); }

  /** Especies posibles de cada cuerpo con señales biológicas del sistema actual: { bodyId: [{ genus, species }] }. */
  setSystemBio(address, bodies) { this.state.exploration.sysBio = { address, bodies: bodies || {} }; this.changed(); }

  /** Valores de especies biológicas aprendidos de Spansh o guardados. */
  learnBioValues(map) { if (require('./exploration').learnBioValues(this.state, map)) this.changed(); }

  /** Fija (o quita, con null) las coordenadas de destino en un planeta. */
  setSurfaceTarget(t) { this.state.surfaceTarget = t || null; this.changed(); }

  snapshot() {
    this.state.updatedAt = new Date().toISOString();
    return { state: this.state, view: derive.view(this.state) };
  }

  changed() {
    if (this._pending) return;
    this._pending = setTimeout(() => { this._pending = null; this.emit('update', this.snapshot()); }, this.throttleMs);
  }
}

module.exports = { Engine, getJournalFolder };
