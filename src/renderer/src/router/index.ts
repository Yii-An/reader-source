import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/batch-test',
      name: 'batchTest',
      component: () => import('../views/BatchTest.vue')
    }
  ]
})

export default router
