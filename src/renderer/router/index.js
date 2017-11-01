import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'password',
      component: require('@/components/Password').default
    },
    {
      path: '/intro',
      name: 'intro',
      component: require('@/components/Intro').default
    },
    {
      path: '/main',
      name: 'main',
      component: require('@/components/Main').default
    },
    {
      path: '/tags',
      name: 'tags',
      component: require('@/components/Tags').default
    },
    {
      path: '/styles',
      name: 'styles',
      component: require('@/components/Styles').default
    },
    {
      path: '/templates',
      name: 'templates',
      component: require('@/components/Templates').default
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})
