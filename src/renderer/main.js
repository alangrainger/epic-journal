import electron from 'electron'
import Vue from 'vue'

import App from './App'
import router from './router'
import moment from 'moment'
import config from '../electron-store'

let db = electron.remote.getGlobal('db')

Vue.prototype.$db = db
Vue.prototype.$config = config
Vue.prototype.$moment = moment

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.config.productionTip = false

/* eslint-disable no-new */
let vm = new Vue({
  components: {App},
  router,
  template: '<App/>',
  data: {
    date: moment().format(db.DATE_DAY), // default to today's date
    entryId: null // entry ID
  }
}).$mount('#app')

// Set up routing
electron.ipcRenderer.on('route', (event, arg) => {
  if (db.connected) router.push(arg)
})

// Listen for goto commands from main menu
electron.ipcRenderer.on('goto', async (event, arg) => {
  // Get the current Vue instance
  let component = router.currentRoute.matched[0].instances.default

  if (arg === 'today') {
    if (router.currentRoute.name !== 'home') {
      await router.push({name: 'home'})
    } else {
      component.date = moment().format(db.DATE_DAY)
    }
  } else if (arg === 'previous') {
    if (router.currentRoute.name !== 'home') return
    let row = await db.get('SELECT date FROM entries WHERE DATE(date) < DATE(?) ORDER BY date DESC LIMIT 1', component.date)
    if (row && row.date) component.date = row.date
  } else if (arg === 'random') {
    // Find out the total number of entries
    let row = await db.get('SELECT COUNT(*) AS count FROM entries WHERE folder_id = 1')
    if (row.count >= 2) {
      // Loop through until we find an entry that's not the current entry
      let rows = await db.all('SELECT id FROM entries WHERE folder_id = 1 ORDER BY RANDOM() LIMIT 2')
      for (let row of rows) {
        // Loop through and route to the entry which ISN'T the current entry
        if (row.id !== vm.$root.entryId) {
          router.push({name: 'home', params: {id: row.id}})
          return
        }
      }
    }
  } else if (arg === 'next') {
    if (router.currentRoute.name !== 'home') return
    let row = await db.get('SELECT date FROM entries WHERE DATE(date) > DATE(?) ORDER BY date ASC LIMIT 1', component.date)
    if (row && row.date) component.date = row.date
  } else if (arg === 'fullscreen') {
    goFullscreen()
  }
})

if (!config.get('journal')) {
  // No existing journal, send them to the intro screen
  router.push('intro')
} else if (vm.$route.name !== 'password') {
  // Send them to the login screen
  router.push('password')
}

function goFullscreen () {
  let win = electron.remote.getCurrentWindow()
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
