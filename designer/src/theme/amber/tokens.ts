// 暖色主题（琥珀）：沿用墨蓝主题的图形语言，仅替换为暖色调色板。
// 键名与 ink/tokens.ts 的 INK 保持一致，绘制时整体替换使用。
export const AMBER = {
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

export const AMBER_ID = 'amber'

export const isAmberTheme = () => document.documentElement.dataset.theme === AMBER_ID
