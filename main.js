const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_VERSION = '1.1';
let win = null;
let settings = {};
const aiJobs = new Map();

function defaultDir() {
  return path.join(app.getPath('appData'), 'TaskFlow QA');
}
function settingsFile() {
  return path.join(defaultDir(), 'settings.json');
}
function loadSettings() {
  try { settings = JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); }
  catch (e) { settings = {}; }
  if (!settings.storageDir) settings.storageDir = defaultDir();
}
function saveSettings() {
  fs.mkdirSync(defaultDir(), { recursive: true });
  const copy = { ...settings };
  fs.writeFileSync(settingsFile(), JSON.stringify(copy, null, 2));
}
function storeDir() {
  return settings.storageDir || defaultDir();
}
function workspaceFile() {
  return path.join(storeDir(), 'workspace.json');
}
function shotsDir(taskId) {
  return taskId ? path.join(storeDir(), 'shots', taskId) : path.join(storeDir(), 'shots');
}
function ensureStore() {
  fs.mkdirSync(shotsDir(), { recursive: true });
}
function writeWorkspace(data) {
  ensureStore();
  const tasks = (data && data.tasks) || {};
  if (!Object.keys(tasks).length) {
    try {
      const prev = JSON.parse(fs.readFileSync(workspaceFile(), 'utf8'));
      if (prev && prev.tasks && Object.keys(prev.tasks).length) return;
    } catch (e) {}
  }
  const out = {
    app: 'TaskFlow QA',
    version: 1,
    currentId: data && data.currentId || null,
    updatedAt: new Date().toISOString(),
    tasks
  };
  const file = workspaceFile();
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(out));
  fs.renameSync(tmp, file);
}
function shotPaths(taskId, id) {
  const dir = shotsDir(taskId);
  return ['jpg', 'jpeg', 'png'].map(ext => path.join(dir, id + '.' + ext));
}
function writeShot(taskId, id, dataUrl) {
  const m = String(dataUrl || '').match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
  if (!m) throw new Error('Screenshot data is not an image.');
  const ext = /png/i.test(m[1]) ? 'png' : 'jpg';
  const dir = shotsDir(taskId);
  fs.mkdirSync(dir, { recursive: true });
  for (const p of shotPaths(taskId, id)) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  fs.writeFileSync(path.join(dir, id + '.' + ext), Buffer.from(m[2], 'base64'));
  return id;
}
function readShot(taskId, id) {
  for (const p of shotPaths(taskId, id)) {
    if (fs.existsSync(p)) {
      const mime = p.endsWith('.png') ? 'image/png' : 'image/jpeg';
      return 'data:' + mime + ';base64,' + fs.readFileSync(p).toString('base64');
    }
  }
  return null;
}
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 640,
    title: 'TaskFlow QA v' + APP_VERSION,
    backgroundColor: '#13222b',
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.setMenu(buildMenu());
  win.loadFile(path.join(__dirname, 'index.html'));
}

function sendMenu(cmd) {
  if (win && !win.isDestroyed()) win.webContents.send('menu', cmd);
}
function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Create task', click: () => sendMenu('create') },
        { type: 'separator' },
        { label: 'Export JSON backup', click: () => sendMenu('export') },
        { label: 'Import JSON backup', click: () => sendMenu('import') },
        { type: 'separator' },
        { label: 'Open storage folder', click: () => shell.openPath(storeDir()) },
        { label: 'Change storage folder', click: () => sendMenu('storage') },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Implementation & Testing', click: () => sendMenu('implementation') },
        { label: 'Context', click: () => sendMenu('context') },
        { label: 'Impact Diagram', click: () => sendMenu('impact') },
        { label: 'Open questions', click: () => sendMenu('questions') },
        { label: 'Evidence', click: () => sendMenu('evidence') },
        { label: 'Handoff', click: () => sendMenu('handoff') },
        { label: 'All Tasks', click: () => sendMenu('tasks') },
        { type: 'separator' },
        { label: 'Toggle dark mode', click: () => sendMenu('theme') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' }
      ]
    }
  ];
  return Menu.buildFromTemplate(template);
}

app.whenReady().then(() => {
  loadSettings();
  ensureStore();
  createWindow();
});
app.on('window-all-closed', () => app.quit());

ipcMain.handle('store:info', () => ({
  path: storeDir(),
  file: workspaceFile(),
  version: APP_VERSION
}));
ipcMain.handle('store:load', () => {
  ensureStore();
  try {
    const raw = JSON.parse(fs.readFileSync(workspaceFile(), 'utf8'));
    return { currentId: raw.currentId || null, tasks: raw.tasks || {} };
  } catch (e) {
    return { currentId: null, tasks: {} };
  }
});
ipcMain.handle('store:save', (_e, data) => { writeWorkspace(data); return { ok: true }; });
ipcMain.on('store:saveSync', (e, data) => {
  try { writeWorkspace(data); e.returnValue = { ok: true }; }
  catch (err) { e.returnValue = { ok: false, error: err.message }; }
});
ipcMain.handle('store:pick', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] });
  if (canceled || !filePaths || !filePaths[0]) return { canceled: true };
  settings.storageDir = filePaths[0];
  saveSettings();
  ensureStore();
  return { canceled: false, path: filePaths[0] };
});
ipcMain.handle('store:open', () => shell.openPath(storeDir()));
ipcMain.handle('open:ref', async (_e, { href }) => {
  const target = String(href || '');
  if (/^https?:\/\//i.test(target)) return shell.openExternal(target);
  return shell.openPath(target);
});

ipcMain.handle('shot:save', (_e, { taskId, dataUrl }) => writeShot(taskId, uid(), dataUrl));
ipcMain.handle('shot:put', (_e, { taskId, id, dataUrl }) => writeShot(taskId, id, dataUrl));
ipcMain.handle('shot:load', (_e, { taskId, id }) => readShot(taskId, id));
ipcMain.handle('shot:delete', (_e, { taskId, id }) => {
  for (const p of shotPaths(taskId, id)) if (fs.existsSync(p)) fs.unlinkSync(p);
  return true;
});
ipcMain.handle('shot:deleteTask', (_e, { taskId }) => {
  const dir = shotsDir(taskId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  return true;
});

ipcMain.handle('file:save', async (_e, opts) => {
  const filters = opts.filters || [{ name: 'All files', extensions: ['*'] }];
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: path.join(app.getPath('documents'), opts.filename || 'export'),
    filters
  });
  if (canceled || !filePath) return { canceled: true };
  if (opts.text != null) fs.writeFileSync(filePath, String(opts.text), 'utf8');
  else if (opts.base64) fs.writeFileSync(filePath, Buffer.from(opts.base64, 'base64'));
  else throw new Error('Nothing to save.');
  return { canceled: false, filePath };
});
ipcMain.handle('file:open', async (_e, opts) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    filters: (opts && opts.filters) || [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths || !filePaths[0]) return { canceled: true };
  return { canceled: false, text: fs.readFileSync(filePaths[0], 'utf8'), filePath: filePaths[0] };
});

ipcMain.handle('settings:get', () => ({
  apiBase: settings.apiBase || 'https://api.x.ai/v1',
  apiModel: settings.apiModel || 'grok-4',
  hasKey: !!settings.apiKey,
  apiKey: settings.apiKey || ''
}));
ipcMain.handle('settings:set', (_e, s) => {
  if (!s || typeof s !== 'object') return false;
  if (s.apiBase != null) settings.apiBase = String(s.apiBase).trim();
  if (s.apiModel != null) settings.apiModel = String(s.apiModel).trim();
  if (s.apiKey != null) settings.apiKey = String(s.apiKey);
  saveSettings();
  return true;
});

ipcMain.handle('ai:complete', async (_e, opts) => {
  const base = String((opts && opts.apiBase) || settings.apiBase || '').replace(/\/+$/, '');
  const key = (opts && opts.apiKey) || settings.apiKey || '';
  const model = (opts && opts.model) || settings.apiModel || 'grok-4';
  const prompt = (opts && opts.prompt) || '';
  if (!base || !key) throw new Error('Add an API key to use direct AI parsing.');
  const requestId = (opts && opts.requestId) || uid();
  const ctrl = new AbortController();
  aiJobs.set(requestId, ctrl);
  const timer = setTimeout(() => ctrl.abort(), 120000);
  try {
    const res = await fetch(base + '/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: 'system', content: 'Return only one JSON object. No markdown fences, no commentary.' },
          { role: 'user', content: prompt }
        ]
      })
    });
    const body = await res.text();
    if (!res.ok) {
      let detail = '';
      try { const j = JSON.parse(body); detail = j.error && (j.error.message || j.error) || ''; } catch (e) {}
      throw new Error('AI request failed (' + res.status + ')' + (detail ? ': ' + String(detail).slice(0, 180) : '.'));
    }
    let data;
    try { data = JSON.parse(body); } catch (e) { throw new Error('AI response was not JSON.'); }
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) throw new Error('AI response had no content.');
    return { requestId, content };
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Stopped.');
    throw err;
  } finally {
    clearTimeout(timer);
    aiJobs.delete(requestId);
  }
});
ipcMain.handle('ai:stop', (_e, { requestId }) => {
  const c = requestId ? aiJobs.get(requestId) : null;
  if (c) c.abort();
  else aiJobs.forEach(ctrl => ctrl.abort());
  return true;
});
