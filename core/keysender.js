'use strict';

/**
 * ED BUBBLE · envío de teclas al juego.
 * En Windows mantiene abierto keysender.ps1 (PowerShell, sin instalar nada) y
 * le pasa secuencias de teclas por código físico (scancode), que es lo que
 * lee Elite. En otros sistemas funciona en "simulación": registra las teclas
 * sin enviarlas (sirve para las pruebas).
 */

const path = require('path');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');

// Scancodes "set 1". ext = tecla extendida (prefijo E0).
const SC = {
  Key_Escape: 0x01, Key_1: 0x02, Key_2: 0x03, Key_3: 0x04, Key_4: 0x05, Key_5: 0x06, Key_6: 0x07, Key_7: 0x08, Key_8: 0x09, Key_9: 0x0A, Key_0: 0x0B,
  Key_Minus: 0x0C, Key_Equals: 0x0D, Key_Backspace: 0x0E, Key_Tab: 0x0F,
  Key_Q: 0x10, Key_W: 0x11, Key_E: 0x12, Key_R: 0x13, Key_T: 0x14, Key_Y: 0x15, Key_U: 0x16, Key_I: 0x17, Key_O: 0x18, Key_P: 0x19,
  Key_LeftBracket: 0x1A, Key_RightBracket: 0x1B, Key_Enter: 0x1C, Key_LeftControl: 0x1D,
  Key_A: 0x1E, Key_S: 0x1F, Key_D: 0x20, Key_F: 0x21, Key_G: 0x22, Key_H: 0x23, Key_J: 0x24, Key_K: 0x25, Key_L: 0x26,
  Key_SemiColon: 0x27, Key_Apostrophe: 0x28, Key_Grave: 0x29, Key_LeftShift: 0x2A, Key_BackSlash: 0x2B,
  Key_Z: 0x2C, Key_X: 0x2D, Key_C: 0x2E, Key_V: 0x2F, Key_B: 0x30, Key_N: 0x31, Key_M: 0x32,
  Key_Comma: 0x33, Key_Period: 0x34, Key_Slash: 0x35, Key_RightShift: 0x36, Key_Numpad_Multiply: 0x37,
  Key_LeftAlt: 0x38, Key_Space: 0x39, Key_CapsLock: 0x3A,
  Key_F1: 0x3B, Key_F2: 0x3C, Key_F3: 0x3D, Key_F4: 0x3E, Key_F5: 0x3F, Key_F6: 0x40, Key_F7: 0x41, Key_F8: 0x42, Key_F9: 0x43, Key_F10: 0x44,
  Key_NumLock: 0x45, Key_ScrollLock: 0x46,
  Key_Numpad_7: 0x47, Key_Numpad_8: 0x48, Key_Numpad_9: 0x49, Key_Numpad_Subtract: 0x4A, Key_Numpad_4: 0x4B, Key_Numpad_5: 0x4C, Key_Numpad_6: 0x4D,
  Key_Numpad_Add: 0x4E, Key_Numpad_1: 0x4F, Key_Numpad_2: 0x50, Key_Numpad_3: 0x51, Key_Numpad_0: 0x52, Key_Numpad_Decimal: 0x53,
  Key_LessThan: 0x56, Key_F11: 0x57, Key_F12: 0x58,
};
const SC_EXT = {
  Key_Numpad_Enter: 0x1C, Key_RightControl: 0x1D, Key_Numpad_Divide: 0x35, Key_RightAlt: 0x38,
  Key_Home: 0x47, Key_UpArrow: 0x48, Key_PageUp: 0x49, Key_LeftArrow: 0x4B, Key_RightArrow: 0x4D,
  Key_End: 0x4F, Key_DownArrow: 0x50, Key_PageDown: 0x51, Key_Insert: 0x52, Key_Delete: 0x53,
};

function scancode(key) {
  if (key in SC) return { sc: SC[key], ext: false };
  if (key in SC_EXT) return { sc: SC_EXT[key], ext: true };
  return null;
}

/** ¿Se puede reproducir esta asignación (tecla y modificadores conocidos)? */
function canSend(bind) {
  return !!bind && !!scancode(bind.key) && bind.modifiers.every((m) => !!scancode(m));
}

/** Operaciones para pulsar una asignación: modificadores abajo, tecla, y soltar en orden inverso. */
function pressOps(bind, holdMs = 70) {
  const mods = bind.modifiers.map(scancode);
  const k = scancode(bind.key);
  const ops = [];
  for (const m of mods) ops.push({ op: 'down', ...m }, { op: 'sleep', ms: 20 });
  ops.push({ op: 'down', ...k }, { op: 'sleep', ms: holdMs }, { op: 'up', ...k });
  for (const m of mods.slice().reverse()) ops.push({ op: 'sleep', ms: 15 }, { op: 'up', ...m });
  return ops;
}

class KeySender extends EventEmitter {
  constructor({ simulate = process.platform !== 'win32' } = {}) {
    super();
    this.simulate = simulate;
    this.proc = null;
    this.ready = false;
    this.seq = 0;
    this.pending = new Map();
    this.buf = '';
    this.queue = Promise.resolve();
    this.sent = []; // solo en simulación
  }

  start() {
    if (this.simulate || this.proc) return;
    const script = path.join(__dirname, 'keysender.ps1');
    this.proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    this.proc.stdout.setEncoding('utf8');
    this.proc.stdout.on('data', (d) => this._onData(d));
    this.proc.stderr.on('data', (d) => this.emit('warning', `keysender: ${String(d).trim()}`));
    this.proc.on('exit', (code) => {
      this.emit('warning', `keysender terminó (código ${code})`);
      this.proc = null; this.ready = false;
      for (const [, p] of this.pending) p.resolve({ ok: false, error: 'helper-exited' });
      this.pending.clear();
    });
  }

  stop() { if (this.proc) { try { this.proc.stdin.end(); this.proc.kill(); } catch (e) { /* ya cerrado */ } this.proc = null; } }

  _onData(d) {
    this.buf += d;
    let i;
    while ((i = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, i).trim(); this.buf = this.buf.slice(i + 1);
      if (!line) continue;
      let msg; try { msg = JSON.parse(line); } catch (e) { continue; }
      if (msg.ready) { this.ready = true; this.emit('ready'); continue; }
      const p = this.pending.get(msg.id);
      if (p) { this.pending.delete(msg.id); clearTimeout(p.timer); p.resolve(msg); }
    }
  }

  /** Ejecuta una lista de operaciones. Las órdenes van en fila: nunca se mezclan dos macros. */
  run(ops) {
    const job = () => new Promise((resolve) => {
      if (this.simulate) { this.sent.push(ops); return resolve({ ok: true, simulated: true }); }
      if (!this.proc) this.start();
      const id = ++this.seq;
      const total = ops.reduce((t, o) => t + (o.op === 'sleep' ? o.ms : 0), 0);
      const timer = setTimeout(() => { this.pending.delete(id); resolve({ ok: false, error: 'timeout' }); }, 8000 + total);
      this.pending.set(id, { resolve, timer });
      this.proc.stdin.write(`${JSON.stringify({ id, ops })}\n`);
    });
    const p = this.queue.then(job);
    this.queue = p.catch(() => {});
    return p;
  }
}

module.exports = { KeySender, scancode, canSend, pressOps };
