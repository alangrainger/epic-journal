import Vue from 'vue'

import App from './App'
import Fail from './Fail'
import router from './router'
import store from './store'

import config from './config'
import db from './datastore'
import moment from 'moment'

// Styles
import './assets/font-awesome/css/font-awesome.css'

/*
Startup prompts.

This will be replaced with a proper system, but for now IT WORKS and that's all that matters!
 */
const prompt = require('electron-prompt')
if (!config.data.file) {
  promptDatabase()
} else {
  promptPassword()
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
        db.openDatabase(password, config.data.file, initApp, fail)
      } else {
        fail('No password specified. Please make sure you click the OK button.')
      }
    })
    .catch(console.error)
}

function initApp () {
  Vue.prototype.$moment = moment
  Vue.prototype.$db = db

  const flatpickr = require('flatpickr')
  flatpickr('#calendar', {})

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
