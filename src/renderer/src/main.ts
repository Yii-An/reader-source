import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ArcoVue from '@arco-design/web-vue'
import ArcoVueIcon from '@arco-design/web-vue/es/icon'
import '@arco-design/web-vue/dist/arco.css'

import App from './App.vue'
import router from './router'
import './assets/main.css'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(ArcoVue)
app.use(ArcoVueIcon)

app.mount('#app')
