// 国风主题（水墨）：宣纸为底，全图只用墨色浓淡区分节点，朱砂仅作印章式点缀。
// 因此这里的 fill 都是低彩度的墨色阶，不再使用赭石／石绿等暖色，避免与琥珀主题相近。
import type { ThemePalette } from '@/theme/shared/palette'

export const CHINA_ID = 'china'

export const isChinaTheme = () => document.documentElement.dataset.theme === CHINA_ID

export const CHINA: ThemePalette = {
  stroke: '#42423B',
  text: '#22221D',
  ink: '#22221D',
  endStroke: '#A6392E',
  userFill: '#E4E2D9',
  serviceFill: '#DCD9CF',
  taskFill: '#F1F0E9',
  startFill: '#EAE8DF',
  endFill: '#D9D7CE',
  gatewayFill: '#EFEDE5',
  userIcon: '#3C3C34',
  serviceIcon: '#3C3C34',
}
