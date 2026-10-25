// 主题公共调色板。每个主题只提供自己的 token 对象，绘制时由 withPalette 临时接管，
// 绘制结束立即还原，因此渲染器本身不依赖任何具体主题。
export type ThemePalette = {
  stroke: string
  text: string
  ink: string
  endStroke: string
  userFill: string
  serviceFill: string
  taskFill: string
  startFill: string
  endFill: string
  gatewayFill: string
  userIcon: string
  serviceIcon: string
}

// 中性兜底配色。正常情况下绘制一定发生在某个主题的作用域内，这里只保证不会取到空值。
export const PALETTE: ThemePalette = {
  stroke: '#5A6472',
  text: '#1F2933',
  ink: '#1F2933',
  endStroke: '#B4483F',
  userFill: '#E3E7EC',
  serviceFill: '#E2E8E4',
  taskFill: '#E8EBEF',
  startFill: '#DFE9E2',
  endFill: '#F0DEDA',
  gatewayFill: '#EFE7D5',
  userIcon: '#5A6472',
  serviceIcon: '#5A6472',
}

// 在指定调色板下执行一次同步绘制，结束后还原快照，避免影响其他主题的绘制结果。
export const withPalette = <T>(patch: Partial<ThemePalette>, draw: () => T): T => {
  const snapshot = { ...PALETTE }
  Object.assign(PALETTE, patch)
  try {
    return draw()
  } finally {
    Object.assign(PALETTE, snapshot)
  }
}
