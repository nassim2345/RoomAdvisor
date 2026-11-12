// Processo principale dell'app desktop RoomAdvisor.
//
// L'app desktop esegue lo stesso server Next.js della versione web (build
// "standalone") in un processo figlio, usando il Node incorporato in Electron,
// e lo mostra in una finestra. Le chiavi API sono dell'utente: le inserisce al
// primo avvio e restano salvate (cifrate, dove il sistema lo consente) nella
// cartella dati dell'app.

const { app, BrowserWindow, Menu, ipcMain, safeStorage, shell, dialog } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const SERVER_READY_TIMEOUT_MS = 30_000;
const isMac = process.platform === "darwin";

let mainWindow = null;
let serverProcess = null;
let serverUrl = null;

// ---------------------------------------------------------------------------
// Configurazione (chiavi API)
// ---------------------------------------------------------------------------

function configPath() {
  return path.join(app.getPath("userData"), "config.json");
}

function encrypt(value) {
  if (!value) return { v: "" };
  if (safeStorage.isEncryptionAvailable()) {
    return { enc: true, v: safeStorage.encryptString(value).toString("base64") };
  }
  return { v: value };
}

function decrypt(entry) {
  if (!entry || !entry.v) return "";
  if (entry.enc) {
    try {
      return safeStorage.decryptString(Buffer.from(entry.v, "base64"));
    } catch {
      return "";
    }
  }
  return entry.v;
}

function loadConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath(), "utf8"));
    return {
      geminiApiKey: decrypt(raw.geminiApiKey),
      serpapiKey: decrypt(raw.serpapiKey),
    };
  } catch {
    return { geminiApiKey: "", serpapiKey: "" };
  }
}

function saveConfig({ geminiApiKey, serpapiKey }) {
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(
    configPath(),
    JSON.stringify(
      { geminiApiKey: encrypt(geminiApiKey.trim()), serpapiKey: encrypt(serpapiKey.trim()) },
      null,
      2
    ),
    { mode: 0o600 }
  );
}

function hasKeys(cfg) {
  return Boolean(cfg.geminiApiKey && cfg.serpapiKey);
}

// ---------------------------------------------------------------------------
// Server Next.js
// ---------------------------------------------------------------------------

function serverDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "server")
    : path.join(__dirname, "..", ".next", "standalone");
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function waitForServer(url, deadline) {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      if (!serverProcess) return reject(new Error("Il server si è chiuso durante l'avvio"));
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() > deadline) reject(new Error("Il server non risponde"));
        else setTimeout(attempt, 200);
      });
      req.setTimeout(2000, () => req.destroy());
    };
    attempt();
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  serverUrl = null;
}

async function startServer(cfg) {
  stopServer();
  const dir = serverDir();
  const entry = path.join(dir, "server.js");
  if (!fs.existsSync(entry)) {
    throw new Error(
      `Server non trovato in ${dir}. In sviluppo esegui prima "npm run desktop:prepare".`
    );
  }
  const port = await freePort();
  const child = spawn(process.execPath, [entry], {
    cwd: dir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      ROOMADVISOR_DESKTOP: "1",
      GEMINI_API_KEY: cfg.geminiApiKey,
      SERPAPI_KEY: cfg.serpapiKey,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  serverProcess = child;
  child.stdout.on("data", (d) => process.stdout.write(`[server] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));
  child.on("exit", (code) => {
    if (serverProcess === child) {
      serverProcess = null;
      if (code && mainWindow && !mainWindow.isDestroyed()) {
        dialog.showErrorBox("RoomAdvisor", `Il server interno si è chiuso (codice ${code}).`);
      }
    }
  });
  const url = `http://127.0.0.1:${port}`;
  await waitForServer(url, Date.now() + SERVER_READY_TIMEOUT_MS);
  serverUrl = url;
  return url;
}

// ---------------------------------------------------------------------------
// Finestre
// ---------------------------------------------------------------------------

function isInternal(url) {
  return (
    url.startsWith("file:") ||
    (serverUrl !== null && (url === serverUrl || url.startsWith(serverUrl + "/")))
  );
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 380,
    minHeight: 600,
    show: false,
    title: "RoomAdvisor",
    backgroundColor: "#FAF7F2",
    icon: path.join(__dirname, "..", "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  win.once("ready-to-show", () => win.show());

  // I link esterni (es. "Acquista") si aprono nel browser di sistema.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url) && !isInternal(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!isInternal(url)) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
    }
  });
  win.on("closed", () => {
    mainWindow = null;
  });
  return win;
}

function showSetup() {
  mainWindow.loadFile(path.join(__dirname, "setup.html"));
}

async function openApp(cfg) {
  mainWindow.loadFile(path.join(__dirname, "loading.html"));
  try {
    const url = await startServer(cfg);
    if (mainWindow && !mainWindow.isDestroyed()) await mainWindow.loadURL(url);
  } catch (err) {
    dialog.showErrorBox("RoomAdvisor non si è avviato", String(err && err.message ? err.message : err));
    showSetup();
  }
}

function buildMenu() {
  const settings = {
    label: "Chiavi API…",
    accelerator: "CmdOrCtrl+,",
    click: () => {
      if (!mainWindow) return;
      stopServer();
      showSetup();
    },
  };
  const template = [
    ...(isMac
      ? [{ label: app.name, submenu: [{ role: "about" }, { type: "separator" }, settings, { type: "separator" }, { role: "hide" }, { role: "hideOthers" }, { role: "unhide" }, { type: "separator" }, { role: "quit" }] }]
      : [{ label: "File", submenu: [settings, { type: "separator" }, { role: "quit", label: "Esci" }] }]),
    { label: "Modifica", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
    { label: "Vista", submenu: [{ role: "reload" }, { type: "separator" }, { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" }, { role: "togglefullscreen" }, ...(app.isPackaged ? [] : [{ role: "toggleDevTools" }])] },
    { role: "windowMenu", label: "Finestra" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------------------------------------------------------------------------
// IPC dalla schermata di configurazione
// ---------------------------------------------------------------------------

// Solo le pagine locali (setup.html) possono leggere/scrivere la configurazione.
function fromLocalPage(event) {
  const url = event.senderFrame?.url ?? "";
  return url.startsWith("file:");
}

ipcMain.handle("config:status", (event) => {
  if (!fromLocalPage(event)) return { hasGemini: false, hasSerpapi: false };
  const cfg = loadConfig();
  return { hasGemini: Boolean(cfg.geminiApiKey), hasSerpapi: Boolean(cfg.serpapiKey) };
});

ipcMain.handle("config:save", async (event, input) => {
  if (!fromLocalPage(event)) return { ok: false, message: "Non consentito" };
  const current = loadConfig();
  // Un campo lasciato vuoto mantiene la chiave già salvata.
  const next = {
    geminiApiKey: String(input?.geminiApiKey || "").trim() || current.geminiApiKey,
    serpapiKey: String(input?.serpapiKey || "").trim() || current.serpapiKey,
  };
  if (!hasKeys(next)) return { ok: false, message: "Inserisci entrambe le chiavi." };
  saveConfig(next);
  openApp(next);
  return { ok: true };
});

ipcMain.handle("open:external", (event, url) => {
  if (fromLocalPage(event) && typeof url === "string" && /^https:\/\//.test(url)) shell.openExternal(url);
});

// ---------------------------------------------------------------------------
// Ciclo di vita
// ---------------------------------------------------------------------------

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    app.setName("RoomAdvisor");
    buildMenu();
    mainWindow = createMainWindow();
    const cfg = loadConfig();
    if (hasKeys(cfg)) openApp(cfg);
    else showSetup();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow();
        const c = loadConfig();
        if (hasKeys(c) && serverUrl) mainWindow.loadURL(serverUrl);
        else if (hasKeys(c)) openApp(c);
        else showSetup();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (!isMac) app.quit();
  });
  app.on("before-quit", stopServer);
  process.on("exit", stopServer);
}
