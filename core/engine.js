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
    this.navroute = new JsonFileWatcher(path.join(this.folder, 'NavRoute.json'), 1000, (j) => { model.applyNavRoute(this.state, j); this.changed(); });

    this.tailer.on('event', (e) => { if (model.applyEvent(this.state, e)) this.changed(); });
    this.tailer.on('file-changed', (file) => {
      this.state.connection.journal = true;
      this.state.connection.journalFile = path.basename(file);
      this.changed();
    });
    this.tailer.on('error', (err) => { this.state.connection.journal = false; this.emit('warning', err.message); this.changed(); });
  }

  start() {
    this.tailer.start();
    this.status.start((decoded) => { model.applyStatus(this.state, decoded.raw, decoded); this.changed(); });
    this.cargo.start();
    this.navroute.start();
  }

  stop() { this.tailer.stop(); this.status.stop(); this.cargo.stop(); this.navroute.stop(); }

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
