// 多彩主题：图形语言与公共渲染器一致，节点颜色改由 node-paints.ts 按实例分配，
// 这里只保留与类型无关的兜底调色板和连线颜色。
import type { ThemePalette } from '@/theme/shared/palette'

export const COLORFUL_ID = 'colorful'

export const isColorfulTheme = () => document.documentElement.dataset.theme === COLORFUL_ID

export type NodePaint = {
  fill: string
  edge: string
  icon?: string
}

// 顺序流、文本等没有“节点语义色”的场合使用的底色。
export const COLORFUL: ThemePalette = {
  stroke: '#5B6BC0',
  text: '#1F2937',
  ink: '#1F2937',
  endStroke: '#AE454E',
  userFill: '#D9E9FB',
  serviceFill: '#D3F0EA',
  taskFill: '#E9EDF6',
  startFill: '#DCF3E3',
  endFill: '#FBDADA',
  gatewayFill: '#FBEDC4',
  userIcon: '#1E5C8F',
  serviceIcon: '#1A6A5E',
}

// 顺序流的颜色由 node-paints.ts 按实例分配；这里只剩消息流与其他连线的固定色。
export const FLOW_COLORS = {
  sequence: '#5B6BC0',
  message: '#2E8FA8',
}
