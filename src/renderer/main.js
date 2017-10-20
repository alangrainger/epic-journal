import { remote } from 'electron'
import Vue from 'vue'

import App from './App'
import Fail from './Fail'
import router from './router'
import store from './store'

import db from './datastore'
import moment from 'moment'

// Styles
import './assets/font-awesome/css/font-awesome.css'

const prompt = require('electron-prompt')
let config = remote.getGlobal('config')

if (process.env.NODE_ENV === 'development-OFF') {
  // Dev mode, choose local no security DB
  db.openDatabase('', 'testing.db')
    .then(initApp)
    .catch(fail)
} else {
  /*
   * Production mode startup prompts.
   * This will be replaced with a proper system, but for now IT WORKS and that's all that matters!
   */
  // Check for existing database
  if (!config.data.file) {
    promptDatabase()
  } else {
    promptPassword()
  }
}

function promptDatabase () {
  prompt({
    title: 'Enter your database path',
    label: 'Database path+filename:',
    type: 'input'
  })
    .then((result) => {
      if (result) {
        config.data.file = result
        config.write()
        promptPassword(config.data.file)
      } else {
        fail('Please restart and enter a database path.')
      }
    })
    .catch(console.error)
}

function promptPassword () {
  prompt({
    title: 'Enter your password',
    label: 'Enter password:',
    inputAttrs: {type: 'password'},
    type: 'input'
  })
    .then((password) => {
      if (password) {
        db.openDatabase(password, config.data.file)
          .then(initApp)
          .catch(fail)
      } else {
        fail('No password specified. Please make sure you click the OK button.')
      }
    })
    .catch(console.error)
}

function initApp () {
  Vue.prototype.$moment = moment
  Vue.prototype.$db = db
  Vue.prototype.$config = config

  if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
  Vue.config.productionTip = false

  /* eslint-disable no-new */
  new Vue({
    components: {App},
    router,
    store,
    template: '<App/>'
  }).$mount('#app')
}

function fail () {
  Vue.prototype.failMessages = arguments
  new Vue({
    components: {Fail},
    template: '<Fail/>'
  }).$mount('#app')
}
