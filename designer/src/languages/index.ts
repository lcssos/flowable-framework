import { createI18n } from 'vue-i18n'
import en from './langs/en-US'
import ja from './langs/ja-JP'
import zh from './langs/zh-CN'
import zhTW from './langs/zh-TW'

const l18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zh,
    'zh-TW': zhTW,
    'en-US': en,
    'ja-JP': ja,
  },
})
export default l18n
