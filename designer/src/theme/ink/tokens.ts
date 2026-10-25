// 墨蓝主题调色板：图形语言与节点几何来自 theme/shared，这里只描述本主题的配色。
import type { ThemePalette } from '@/theme/shared/palette'

export const INK_ID = 'ink'

export const isInkTheme = () => document.documentElement.dataset.theme === INK_ID

export const INK: ThemePalette = {
  stroke: '#1F4B6E',
  text: '#1B2838',
  ink: '#1B2838',
  endStroke: '#C2453D',
  userFill: '#D5E3F0',
  serviceFill: '#D5E8DE',
  taskFill: '#E4E9EF',
  startFill: '#D3EBDD',
  endFill: '#F3D9D4',
  gatewayFill: '#F0E6D2',
  userIcon: '#3C5E7C',
  serviceIcon: '#3D6A56',
}
