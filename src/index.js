"use strict";

import { app, BrowserWindow, Menu } from "electron";
import * as path from "path";
import { format as formatUrl } from "url";

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow;

function createMainWindow() {
  const window = new BrowserWindow();
  window.setSize(1280, 720);

  window.loadURL(
    formatUrl({
      pathname: path.join(__dirname, "index.html"),
      protocol: "file",
      slashes: true
    })
  );

  window.on("closed", () => {
    mainWindow = null;
  });

  // window.webContents.on("devtools-opened", () => {
  //   window.focus();
  //   setImmediate(() => {
  //     window.focus();
  //   });
  // });

  // window.webContents.openDevTools();

  return window;
}

// quit application when all windows are closed
app.on("window-all-closed", () => {
  // on macOS it is common for applications to stay open until the user explicitly quits
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // on macOS it is common to re-create a window even after all windows have been closed
  if (mainWindow === null) {
    mainWindow = createMainWindow();
  }
});

// create main BrowserWindow when electron is ready
app.on("ready", () => {
  mainWindow = createMainWindow();
});

const template = [
  {
    label: "Fichier",
    submenu: [
      {
        label: "Nouveau script",
        accelerator: "CmdOrCtrl+N",
        click: () => {
          mainWindow.webContents.send("newFile");
        }
      },
      {
        label: "Sauvegarder",
        accelerator: "CmdOrCtrl+S",
        click: () => {
          mainWindow.webContents.send("saveFile");
        }
      },
      {
        label: "Charger un script",
        accelerator: "CmdOrCtrl+O",
        click: () => {
          mainWindow.webContents.send("openFile");
        }
      },
      { label: "Reload", role: "reload" },
      { label: "toggle Dev Tools", role: "toggleDevTools" }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
