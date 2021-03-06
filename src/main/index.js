'use strict'

import { app, BrowserWindow, dialog, Menu, protocol, shell } from 'electron'
import promiseIpc from 'electron-promise-ipc'

import config from '../electron-store'
import db from './datastore'
import { version } from '../../package'
// import { version } from '../../package'

// Locale
const osLocale = require('os-locale')
osLocale().then(locale => {
  global['locale'] = locale
})

// Config
global.db = db // make available for renderer

promiseIpc.on('createJournal', async (data, event) => {
  try {
    await saveFile()
    return true
  } catch (e) {
    return false
  }
})
promiseIpc.on('openJournal', async (data, event) => {
  try {
    await openFile()
    return true
  } catch (e) {
    return false
  }
})

let template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'New',
        click: () => {
          config.delete('journal')
          mainWindow.webContents.reloadIgnoringCache()
        }
      },
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
      { role: 'reload' },
      { role: 'forcereload' },
      { role: 'toggledevtools' },
      { type: 'separator' },
      {
        label: 'Fullscreen Mode',
        accelerator: 'F11',
        click: () => { mainWindow.webContents.send('goto', 'fullscreen') }
      }
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
        label: 'Go to Random entry',
        accelerator: 'CommandOrControl+Shift+F5',
        click: () => { mainWindow.webContents.send('goto', 'random') }
      },
      {
        label: 'Go to Journal',
        click: () => { mainWindow.webContents.send('route', { name: 'main' }) }
      },
      {
        label: 'Edit Templates',
        click: () => { mainWindow.webContents.send('route', { name: 'templates' }) }
      },
      {
        label: 'Edit Tags',
        click: () => { mainWindow.webContents.send('route', { name: 'tags' }) }
      },
      {
        label: 'Edit Styles',
        click: () => { mainWindow.webContents.send('route', { name: 'styles' }) }
      }
    ]
  },
  {
    role: 'window',
    submenu: [
      { role: 'minimize' },
      { role: 'close' }
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Help',
        click: () => { shell.openExternal('https://epicjournal.xyz/docs/') }
      },
      {
        label: 'Keyboard Shortcuts',
        click: () => { shell.openExternal('https://epicjournal.xyz/docs/#shortcuts') }
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
      { role: 'about' },
      { type: 'separator' },
      { role: 'services', submenu: [] },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  })

  // Window menu
  template[4].submenu = [
    { role: 'close' },
    { role: 'minimize' },
    { role: 'zoom' },
    { type: 'separator' },
    { role: 'front' }
  ]
}

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:9080'
  : `file://${__dirname}/index.html`

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    width: config.get('window.width') || 1154,
    height: config.get('window.height') || 808
  })

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', () => {
  /*
   * Register custom attachment protocol for serving images from the database
   */
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
    if (error) console.error(error)
  })

  /*
   * Register custom protocol for entry navigation.
   * When a user clicks on an entry://n custom URL, it will navigate to the entry with ID n.
   */
  protocol.registerHttpProtocol('entry', async (request) => {
    // Get the entry ID
    let matches = request.url.match(/entry:\/\/(\d+)/)
    if (matches && matches.length) {
      // Find the date for that entry
      try {
        let entry = await db.getById('entries', matches[1])
        mainWindow.webContents.send('route', { name: 'home', params: { date: entry.date } })
      } catch (e) {
        console.log(e)
      }
    }
  }, (error) => {
    if (error) console.error(error)
  })

  // Set menus
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

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

function openFile () {
  return new Promise(function (resolve, reject) {
    dialog.showOpenDialog({
      filters: [
        { name: 'Epic Journal', extensions: ['epic'] }
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

function saveFile () {
  return new Promise(function (resolve, reject) {
    dialog.showSaveDialog({
      filters: [
        { name: 'Epic Journal', extensions: ['epic'] }
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

function showAbout () {
  dialog.showMessageBox({
    type: 'none',
    buttons: ['OK'],
    title: 'About Epic Journal',
    message: 'Epic Journal v' + version + '\n\nCreated by Alan Grainger\n\nhttps://epicjournal.xyz/'
  })
}
