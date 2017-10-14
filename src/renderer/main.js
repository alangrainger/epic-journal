import Vue from 'vue'

import App from './App'
import router from './router'
import store from './store'

import db from './datastore'
import moment from 'moment'

Vue.prototype.moment = moment
Vue.prototype.$db = db

const flatpickr = require('flatpickr')

flatpickr('#calendar', {})

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  components: { App },
  router,
  store,
  template: '<App/>'
}).$mount('#app')
