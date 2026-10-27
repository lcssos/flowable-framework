import { defineStore } from 'pinia'
import { useNavigatorLanguage } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { isTheme, themeUsesDark, type ThemeId } from '@/themes'

export type LanguageType = 'zh-CN' | 'en-US' | 'ja-JP'
export type ThemeType = ThemeId

export const isLanguage = (value: string): value is LanguageType =>
  value === 'zh-CN' || value === 'en-US' || value === 'ja-JP'

// 浏览器语言只用来决定首次进入的默认语言：日文 → 日文，中文 → 中文，其余回落英文。
const detectLanguage = (value?: string): LanguageType => {
  const tag = (value ?? '').toLowerCase()
  if (tag.startsWith('ja')) return 'ja-JP'
  if (tag.startsWith('zh')) return 'zh-CN'
  return 'en-US'
}

const applyTheme = (value: ThemeType) => {
  const root = document.documentElement
  root.dataset.theme = value
  root.classList.toggle('dark', themeUsesDark(value))
  window.dispatchEvent(new CustomEvent('designer-theme'))
}

const useAppStore = defineStore(
  'app-store',
  () => {
    const i18n = useI18n()
    const { language: navigatorLanguage } = useNavigatorLanguage()
    const language = shallowRef<LanguageType>(detectLanguage(navigatorLanguage.value))
    const theme = ref<ThemeType>('ink')
    const changeLanguage = (lang: LanguageType) => {
      language.value = lang
    }

    watch(
      language,
      (lang) => {
        i18n.locale.value = lang
      },
      {
        immediate: true,
      },
    )
    watch(
      theme,
      (value) => {
        const next = isTheme(value) ? value : 'ink'
        if (next !== value) {
          theme.value = next
          return
        }
        applyTheme(next)
      },
      { immediate: true },
    )

    return {
      language,
      changeLanguage,
      theme,
    }
  },
  {
    persist: {
      pick: ['language', 'theme'],
    },
  },
)
export default useAppStore
