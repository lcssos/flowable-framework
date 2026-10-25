import { defineStore } from 'pinia'
import { useNavigatorLanguage } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { isTheme, themeUsesDark, type ThemeId } from '@/themes'

export type LanguageType = 'zh-CN' | 'en-US'
export type ThemeType = ThemeId

const applyTheme = (value: ThemeType) => {
  const root = document.documentElement
  root.dataset.theme = value
  root.classList.toggle('dark', themeUsesDark(value))
}

const useAppStore = defineStore(
  'app-store',
  () => {
    const i18n = useI18n()
    const { language: navigatorLanguage } = useNavigatorLanguage()
    const language = shallowRef<LanguageType>(
      navigatorLanguage.value?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US',
    )
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
