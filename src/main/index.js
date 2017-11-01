'use strict'

import { app, protocol, BrowserWindow, Menu, dialog, shell } from 'electron'
import config from './config'
import db from './datastore'
import { version } from '../../package.json'

const osLocale = require('os-locale')
osLocale().then(locale => {
  global['locale'] = locale
})
global.config = config // make available for renderer
global.db = db // make available for renderer

let template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Open',
        click: () => {
          openFile()
            .then(() => {
              mainWindow.webContents.reloadIgnoringCache()
            })
        }
      }
    ]
  },
  {
    label: 'View',
    submenu: [
      {role: 'reload'},
      {role: 'forcereload'},
      {role: 'toggledevtools'},
      {type: 'separator'},
      {role: 'resetzoom'},
      {role: 'zoomin'},
      {role: 'zoomout'},
      {type: 'separator'},
      {role: 'togglefullscreen'}
    ]
  },
  {
    label: 'Go',
    submenu: [
      {
        label: 'Go to Today\'s entry',
        accelerator: 'F5',
        click: () => { mainWindow.webContents.send('goto', 'today') }
      },
      {
        label: 'Go to Journal',
        click: () => { mainWindow.webContents.send('route', 'main') }
      },
      {
        label: 'Edit Templates',
        click: () => { mainWindow.webContents.send('route', 'templates') }
      },
      {
        label: 'Edit Tags',
        click: () => { mainWindow.webContents.send('route', 'tags') }
      },
      {
        label: 'Edit Styles',
        click: () => { mainWindow.webContents.send('route', 'styles') }
      }
    ]
  },
  {
    role: 'window',
    submenu: [
      {role: 'minimize'},
      {role: 'close'}
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'About',
        click: () => { showAbout() }
      }
    ]
  }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)

const {ipcMain} = require('electron')
ipcMain.on('createJournal', (event) => {
  openFile()
    .then(() => {
      event.returnValue = true
    })
    .catch(() => {
      event.returnValue = false
    })
})

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    width: config.data.windowX || 1100,
    height: config.data.windowY || 680,
    useContentSize: true
  })

  mainWindow.on('resize', function () {
    // Store the window dimensions in the config
    config.data.windowX = mainWindow.getSize()[0]
    config.data.windowY = mainWindow.getSize()[1]
  })

  // Open all target="_blank" links in the external browser
  mainWindow.webContents.on('new-window', function (event, url) {
    event.preventDefault()
    shell.openExternal(url)
  })

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', function () {
  // Register custom attachment protocol for serving images from the database
  protocol.registerBufferProtocol('attach', (request, callback) => {
    let url = require('url')
    let id = url.parse(request.url, true).hostname
    if (id) {
      db.getAttachment(id)
        .then((row) => {
          if (row) {
            // eslint-disable-next-line
            callback({mimeType: row.mime_type, data: row.data})
          }
        })
        .catch((err) => {
          console.error(err)
        })
    }
  }, (error) => {
    if (error) console.log(error)
  })

  createWindow()
})

app.on('window-all-closed', () => {
  // Main exit process
  config.write() // write out the config file in case we haven't
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

function openFile () {
  return new Promise(function (resolve, reject) {
    dialog.showOpenDialog({
      filters: [
        {name: 'Epic Journal', extensions: ['epic']}
      ],
      properties: ['openFile', 'promptToCreate', 'createDirecotry']
    }, function (filenames) {
      if (filenames === undefined || !filenames[0]) {
        reject(new Error('No file specified'))
      } else {
        config.data.file = filenames[0]
        config.write()
        resolve()
      }
    })
  })
}

function showAbout () {
  dialog.showMessageBox({
    type: 'none',
    buttons: ['OK'],
    title: 'About Epic Journal',
    message: 'Epic Journal v' + version + '\n\nCreated by Alan Grainger'
  })
}

/* function saveFile () {
  return new Promise(function (resolve, reject) {
    dialog.showSaveDialog({
      filters: [
        {name: 'Epic Journal', extensions: ['epic']}
      ]
    }, function (filenames) {
      if (filenames === undefined || !filenames[0]) {
        reject(new Error('No file specified'))
      } else {
        let filename = filenames[0]
        resolve(filename)
      }
    })
  })
} */

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
