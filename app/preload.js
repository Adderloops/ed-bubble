'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('edbubble', {
  onUpdate: (cb) => ipcRenderer.on('ed:update', (_e, snap) => cb(snap)),
  snapshot: () => ipcRenderer.invoke('ed:snapshot'),
  info: () => ipcRenderer.invoke('ed:info'),
  controls: () => ipcRenderer.invoke('ed:controls'),
  onControls: (cb) => ipcRenderer.on('ed:controls', (_e, c) => cb(c)),
  run: (id) => ipcRenderer.invoke('ed:run', id),
});
