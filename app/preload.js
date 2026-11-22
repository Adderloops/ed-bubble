'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('edbubble', {
  onUpdate: (cb) => ipcRenderer.on('ed:update', (_e, snap) => cb(snap)),
  snapshot: () => ipcRenderer.invoke('ed:snapshot'),
  info: () => ipcRenderer.invoke('ed:info'),
});
