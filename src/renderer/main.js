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
  switch (arg) {
    case 'today':
      if (router.currentRoute.name !== 'main') {
        router.push('main')
      }
      this.date = this.$moment().format(this.$db.DATE_DAY)
      break
    case 'previous':
      if (router.currentRoute.name !== 'main') break
      this.$db.get('SELECT date FROM entries WHERE DATE(date) < DATE(?) ORDER BY date DESC LIMIT 1', this.date)
        .then(row => {
          if (row && row.date) this.date = row.date
        })
      break
    case 'random':
      if (router.currentRoute.name !== 'main') break
      console.log('random')
      this.$db.get('SELECT date FROM entries WHERE entry_id IN (SELECT entry_id FROM entries ORDER BY RANDOM() LIMIT 1)')
        .then(row => {
          if (row && row.date) this.date = row.date
        })
      break
    case 'next':
      if (router.currentRoute.name !== 'main') break
      this.$db.get('SELECT date FROM entries WHERE DATE(date) > DATE(?) ORDER BY date ASC LIMIT 1', this.date)
        .then(row => {
          if (row && row.date) this.date = row.date
        })
      break
    case 'fullscreen':
      if (router.currentRoute.name !== 'main') {
        router.push('main')
      } else {
        console.log('going')
        // this.goFullscreen()
        let vm = router.currentRoute.matched[0].instances.default
        vm.goFullscreen()
      }
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
