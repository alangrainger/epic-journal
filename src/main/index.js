'use strict'

import { app, protocol, BrowserWindow, Menu, dialog, shell } from 'electron'
import db from './datastore'
import { version } from '../../package.json'

// Locale
const osLocale = require('os-locale')
osLocale().then(locale => {
  global['locale'] = locale
})

// Config
const Store = require('electron-store')
const config = new Store()
global['config'] = config // make available for renderer
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
        label: 'Go to Previous entry',
        accelerator: 'F7',
        click: () => { mainWindow.webContents.send('goto', 'previous') }
      },
      {
        label: 'Go to Next entry',
        accelerator: 'F8',
        click: () => { mainWindow.webContents.send('goto', 'next') }
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
        label: 'Help',
        click: () => { shell.openExternal('https://epicjournal.xyz/features/#usage') }
      },
      {
        label: 'Donate',
        click: () => { shell.openExternal('https://epicjournal.xyz/donate/') }
      },
      {
        label: 'About',
        click: () => { showAbout() }
      }
    ]
  }
]

if (process.platform === 'darwin') {
  template.unshift({
    label: app.getName(),
    submenu: [
      {role: 'about'},
      {type: 'separator'},
      {role: 'services', submenu: []},
      {type: 'separator'},
      {role: 'hide'},
      {role: 'hideothers'},
      {role: 'unhide'},
      {type: 'separator'},
      {role: 'quit'}
    ]
  })

  // Window menu
  template[4].submenu = [
    {role: 'close'},
    {role: 'minimize'},
    {role: 'zoom'},
    {type: 'separator'},
    {role: 'front'}
  ]
}

const {ipcMain} = require('electron')
ipcMain.on('createJournal', (event) => {
  saveFile()
    .then(() => {
      event.returnValue = true
    })
    .catch(() => {
      event.returnValue = false
    })
})
ipcMain.on('openJournal', (event) => {
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
    width: config.get('window.width') || 1154,
    height: config.get('window.height') || 808
  })

  mainWindow.on('resize', function () {
    // Store the window dimensions in the config
    config.set('window', mainWindow.getBounds())
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

  // Set menus
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  createWindow()
})

app.on('window-all-closed', () => {
  app.quit()
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
        config.set('journal', filenames[0])
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

function saveFile () {
  return new Promise(function (resolve, reject) {
    dialog.showSaveDialog({
      filters: [
        {name: 'Epic Journal', extensions: ['epic']}
      ]
    }, function (filename) {
      if (filename === undefined) {
        reject(new Error('No file specified'))
      } else {
        config.set('journal', filename)
        resolve()
      }
    })
  })
}

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
