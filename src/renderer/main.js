import { remote } from 'electron'
import Vue from 'vue'

import App from './App'
import router from './router'
// import store from './store'
import moment from 'moment'

const electron = require('electron')

let db = remote.getGlobal('db')
let config = remote.getGlobal('config')

Vue.prototype.$db = db
Vue.prototype.$config = config
Vue.prototype.$moment = moment

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.config.productionTip = false

/* eslint-disable no-new */
let vm = new Vue({
  components: {App},
  router,
  // store,
  template: '<App/>'
}).$mount('#app')

// Set up routing
electron.ipcRenderer.on('route', (event, arg) => {
  if (db.connected) router.push(arg)
})

// Listen for goto commands from main menu
electron.ipcRenderer.on('goto', (event, arg) => {
  // Get the current Vue instance
  let component = router.currentRoute.matched[0].instances.default

  switch (arg) {
    case 'today':
      if (router.currentRoute.name !== 'main') {
        router.push('main')
      }
      component.date = moment().format(db.DATE_DAY)
      break
    case 'previous':
      if (router.currentRoute.name !== 'main') break
      db.get('SELECT date FROM entries WHERE DATE(date) < DATE(?) ORDER BY date DESC LIMIT 1', component.date)
        .then(row => {
          if (row && row.date) component.date = row.date
        })
      break
    case 'random':
      if (router.currentRoute.name !== 'main') break
      db.get('SELECT date FROM entries WHERE entry_id IN (SELECT entry_id FROM entries WHERE folder_id = 1 ORDER BY RANDOM() LIMIT 1)')
        .then(row => {
          if (row && row.date) component.date = row.date
        })
      break
    case 'next':
      if (router.currentRoute.name !== 'main') break
      db.get('SELECT date FROM entries WHERE DATE(date) > DATE(?) ORDER BY date ASC LIMIT 1', component.date)
        .then(row => {
          if (row && row.date) component.date = row.date
        })
      break
    case 'fullscreen':
      goFullscreen()
      break
  }
})

if (!config.get('journal')) {
  // No existing journal, send them to the intro screen
  router.push('intro')
} else {
  // Send them to the login screen
  router.push('password')
}

function goFullscreen () {
  let win = require('electron').remote.getCurrentWindow()

  if (!win.isFullScreen()) {
    // Set fullscreen mode
    let bounds = win.getBounds()
    console.log(bounds)
    console.log(vm)
    vm.$el.style.width = '400px' // bounds.width
    vm.$el.style.height = '400px' // bounds.height
    // win.setFullScreen(true)
  } else {
    // Go back to normal mode
    win.setFullScreen(false)
  }
}
