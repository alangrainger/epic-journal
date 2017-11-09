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
new Vue({
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
  let wrapper = document.getElementById('app')

  if (!win.isFullScreen()) {
    // Set fullscreen mode
    let bounds = win.getBounds()
    wrapper.style.width = bounds.width + 'px'
    wrapper.style.height = bounds.height + 'px'
    wrapper.style.position = 'absolute'
    wrapper.style.top = '50%'
    wrapper.style.left = '50%'
    wrapper.style.marginLeft = '-' + Math.round(bounds.width / 2) + 'px'
    wrapper.style.marginTop = '-' + Math.round(bounds.height / 2) + 'px'
    wrapper.style.boxShadow = '0 0 50px 10px rgba(0, 0, 0, 0.6)'
    document.body.style.backgroundImage = 'url(static/background.jpg)'
    win.setFullScreen(true)
  } else {
    // Go back to normal mode
    wrapper.style = null
    document.body.style = null
    win.setFullScreen(false)
  }
}
