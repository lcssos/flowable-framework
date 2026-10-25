// 暖色主题（琥珀）：图形语言与公共渲染器一致，这里只描述暖砂／陶土配色。
import type { ThemePalette } from '@/theme/shared/palette'

export const AMBER_ID = 'amber'

export const isAmberTheme = () => document.documentElement.dataset.theme === AMBER_ID

export const AMBER: ThemePalette = {
  stroke: '#8A4A2B',
  text: '#2E241D',
  ink: '#2E241D',
  endStroke: '#B23B2E',
  userFill: '#F3DAC1',
  serviceFill: '#E5E3C4',
  taskFill: '#F0E5D6',
  startFill: '#DDEBC6',
  endFill: '#F4D6CB',
  gatewayFill: '#F3E2C4',
  userIcon: '#8B5636',
  serviceIcon: '#6E6A38',
}
