import I18n from '@/languages'
import uiTextEn from '@/languages/langs/en-US/uiText'
import uiTextJa from '@/languages/langs/ja-JP/uiText'
import uiTextTw, { traditionalFallback } from '@/languages/langs/zh-TW/uiText'

// 中文是源码里的源文案，其他语言用「中文 → 译文」的字典逐条替换。
const dictionaries: Record<string, Record<string, string>> = {
  'en-US': uiTextEn,
  'ja-JP': uiTextJa,
  'zh-TW': uiTextTw,
}

const currentLocale = () => String(I18n.global.locale.value ?? 'zh-CN')

const dictionaryFor = (locale: string) => dictionaries[locale] ?? uiTextEn

// 非中文语言优先取自己的字典，缺项退回英文，避免露出中文原文。
// 繁体中文与源文案同属中文：缺项不回退英文，而是把简体逐字转成繁体。
export const translateUi = (source: string, english?: string) => {
  const locale = currentLocale()
  if (locale === 'zh-CN') return source
  if (locale === 'zh-TW') return uiTextTw[source] || traditionalFallback(source)
  if (locale === 'en-US') return english || uiTextEn[source] || source
  return dictionaryFor(locale)[source] || english || uiTextEn[source] || source
}

// 长句优先替换，避免短词先命中把长句切碎。
const htmlEntryCache = new Map<string, [string, string][]>()

const htmlEntriesFor = (locale: string) => {
  const cached = htmlEntryCache.get(locale)
  if (cached) return cached
  const entries = Object.entries(dictionaryFor(locale)).sort(
    ([left], [right]) => right.length - left.length,
  )
  htmlEntryCache.set(locale, entries)
  return entries
}

export const translateUiHtml = (source: string) => {
  const locale = currentLocale()
  if (locale === 'zh-CN') return source
  const text = htmlEntriesFor(locale).reduce(
    (result, [chinese, translated]) => result.split(chinese).join(translated),
    source,
  )
  if (locale === 'zh-TW') return traditionalFallback(text)
  if (locale !== 'en-US') return text
  return text.split('。').join('.').split('，').join(', ').split('：').join(': ')
}
