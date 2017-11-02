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
  router.push(arg)
})

if (!config.get('journal')) {
  // No existing journal, send them to the intro screen
  router.push('intro')
} else {
  // Send them to the login screen
  router.push('password')
}
