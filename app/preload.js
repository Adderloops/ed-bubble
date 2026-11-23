'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('edbubble', {
  onUpdate: (cb) => ipcRenderer.on('ed:update', (_e, snap) => cb(snap)),
  snapshot: () => ipcRenderer.invoke('ed:snapshot'),
  info: () => ipcRenderer.invoke('ed:info'),
  controls: () => ipcRenderer.invoke('ed:controls'),
  onControls: (cb) => ipcRenderer.on('ed:controls', (_e, c) => cb(c)),
  run: (id) => ipcRenderer.invoke('ed:run', id),
  suggest: (q) => ipcRenderer.invoke('ed:suggest', q),
  system: (name) => ipcRenderer.invoke('ed:system', name),
  markets: (q) => ipcRenderer.invoke('ed:markets', q),
  plot: (name, distance) => ipcRenderer.invoke('ed:plot', name, distance),
  plotCancel: () => ipcRenderer.invoke('ed:plot-cancel'),
  onPlotStatus: (cb) => ipcRenderer.on('ed:plot-status', (_e, st) => cb(st)),
  log: (msg) => ipcRenderer.send('ed:log', String(msg).slice(0, 4000)),
  clipboardRead: () => ipcRenderer.invoke('ed:clipboard-read'),
  targetSet: (text) => ipcRenderer.invoke('ed:target-set', text),
  targetClear: () => ipcRenderer.invoke('ed:target-clear'),
  copy: (text) => ipcRenderer.invoke('ed:copy', text),
  open: (site, name, address) => ipcRenderer.invoke('ed:open', { site, name, address }),
});
