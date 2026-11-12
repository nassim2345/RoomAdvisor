// Ponte minimo e sicuro tra la schermata di configurazione e il processo
// principale. Le pagine dell'app web non lo usano.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("roomadvisor", {
  isDesktop: true,
  configStatus: () => ipcRenderer.invoke("config:status"),
  saveConfig: (keys) => ipcRenderer.invoke("config:save", keys),
  openExternal: (url) => ipcRenderer.invoke("open:external", url),
});
