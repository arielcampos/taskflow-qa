const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('taskflow', {
  version: '1.1',
  openRef: (href) => ipcRenderer.invoke('open:ref', { href }),
  getInfo: () => ipcRenderer.invoke('store:info'),
  load: () => ipcRenderer.invoke('store:load'),
  save: (data) => ipcRenderer.invoke('store:save', data),
  saveNow: (data) => ipcRenderer.sendSync('store:saveSync', data),
  saveShot: (taskId, dataUrl) => ipcRenderer.invoke('shot:save', { taskId, dataUrl }),
  putShot: (taskId, id, dataUrl) => ipcRenderer.invoke('shot:put', { taskId, id, dataUrl }),
  loadShot: (taskId, id) => ipcRenderer.invoke('shot:load', { taskId, id }),
  deleteShot: (taskId, id) => ipcRenderer.invoke('shot:delete', { taskId, id }),
  deleteTaskShots: (taskId) => ipcRenderer.invoke('shot:deleteTask', { taskId }),
  saveFile: (opts) => ipcRenderer.invoke('file:save', opts),
  openFile: (opts) => ipcRenderer.invoke('file:open', opts),
  pickStorage: () => ipcRenderer.invoke('store:pick'),
  openStorage: () => ipcRenderer.invoke('store:open'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (s) => ipcRenderer.invoke('settings:set', s),
  aiComplete: (opts) => ipcRenderer.invoke('ai:complete', opts),
  aiStop: (requestId) => ipcRenderer.invoke('ai:stop', { requestId }),
  onMenu: (fn) => {
    ipcRenderer.removeAllListeners('menu');
    ipcRenderer.on('menu', (_e, cmd) => fn(cmd));
  }
});
