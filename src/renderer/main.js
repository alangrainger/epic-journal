import Vue from 'vue'

import App from './App'
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
        console.log('No password specified, exiting')
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
        db.openDatabase(password, config.data.file, initApp)
      } else {
        console.log('No password specified, exiting')
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
