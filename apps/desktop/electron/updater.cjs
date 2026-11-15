const { autoUpdater } = require("electron-updater");
const { ipcMain, app } = require("electron");

/** @type {import('electron').BrowserWindow | null} */
let targetWindow = null;

function send(status, payload = {}) {
  if (targetWindow && !targetWindow.isDestroyed()) {
    targetWindow.webContents.send("updater:status", { status, ...payload });
  }
}

function setupAutoUpdater(win) {
  targetWindow = win;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  // Allow checking against GitHub even during local packaged tests.
  autoUpdater.forceDevUpdateConfig = false;

  autoUpdater.on("checking-for-update", () => {
    send("checking");
  });

  autoUpdater.on("update-available", (info) => {
    send("available", {
      version: info.version,
      releaseName: info.releaseName,
    });
  });

  autoUpdater.on("update-not-available", (info) => {
    send("upToDate", { version: info.version || app.getVersion() });
  });

  autoUpdater.on("download-progress", (progress) => {
    send("downloading", {
      percent: Math.round(progress.percent || 0),
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    send("ready", { version: info.version });
  });

  autoUpdater.on("error", (err) => {
    send("error", {
      message: err?.message || "Не удалось проверить обновления. Проверьте сеть и повторите.",
    });
  });

  ipcMain.handle("updater:version", () => app.getVersion());

  ipcMain.handle("updater:check", async () => {
    if (!app.isPackaged) {
      // Dev shell: report GitHub check via updater still possible with forceDevUpdateConfig,
      // but default to explicit status so UI stays honest.
      send("error", {
        message:
          "Проверка обновлений доступна в установленной сборке Mira (релиз с GitHub Releases).",
      });
      return { ok: false, packaged: false };
    }
    try {
      const result = await autoUpdater.checkForUpdates();
      return { ok: true, packaged: true, updateInfo: result?.updateInfo?.version };
    } catch (err) {
      send("error", {
        message: err?.message || "Не удалось проверить обновления. Проверьте сеть и повторите.",
      });
      return { ok: false, packaged: true };
    }
  });

  ipcMain.handle("updater:install", () => {
    // isSilent=false, isForceRunAfter=true → install and relaunch
    autoUpdater.quitAndInstall(false, true);
    return { ok: true };
  });

  // Background check shortly after launch, then every 6 hours.
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 4000);
    setInterval(
      () => {
        autoUpdater.checkForUpdates().catch(() => {});
      },
      6 * 60 * 60 * 1000,
    );
  }
}

module.exports = { setupAutoUpdater };
