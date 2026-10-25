import { createApp } from 'vue'
import pinia from '@/stores'
import I18n from '@/languages'
import App from './App.vue'
import '@/styles/index.scss'
import 'virtual:svg-icons-register'
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'element-plus/es/components/message/style/index'
import { Icon } from '@iconify/vue'
import { translateUi } from '@/languages/uiText'

const app = createApp(App)
app.config.globalProperties.$tu = translateUi
app.use(pinia).component('Iconify', Icon).use(I18n).mount('#app')
