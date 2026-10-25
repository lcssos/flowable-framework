// 主题登记。样式在 styles/themes/<id>.scss，文案在 ui.themes.<id>。
// dark 为 true 时给 html 加上 dark，让 Element Plus 暗色变量生效。
export const themes = [
  { id: 'ink', dark: false },
  { id: 'classic', dark: false },
  { id: 'dark', dark: true },
  { id: 'amber', dark: false },
] as const

export type ThemeId = (typeof themes)[number]['id']

export const isTheme = (value: string): value is ThemeId => {
  return themes.some((item) => item.id === value)
}

export const themeUsesDark = (value: ThemeId) => {
  return themes.find((item) => item.id === value)?.dark === true
}
