// 多彩主题：图形语言与公共渲染器一致，但每个节点按语义类型取不同色相，
// 因此调色板不再是一组固定常量，而要按元素逐个解析。
import type { ThemePalette } from '@/theme/shared/palette'

export const COLORFUL_ID = 'colorful'

export const isColorfulTheme = () => document.documentElement.dataset.theme === COLORFUL_ID

export type NodePaint = {
  fill: string
  edge: string
  icon?: string
}

export type TaskPaint = NodePaint & { type: string }

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

// 任务类节点一型一色；匹配时按数组顺序取第一个命中的类型，'bpmn:Task' 作为兜底。
export const TASK_PAINTS: TaskPaint[] = [
  { type: 'bpmn:UserTask', fill: '#D9E9FB', edge: '#2C6FA6', icon: '#1E5C8F' },
  { type: 'bpmn:ServiceTask', fill: '#D3F0EA', edge: '#21897A', icon: '#1A6A5E' },
  { type: 'bpmn:ScriptTask', fill: '#E8E0FB', edge: '#6A4EBD', icon: '#543BA6' },
  { type: 'bpmn:SendTask', fill: '#FBDDE9', edge: '#B2477B', icon: '#8F3462' },
  { type: 'bpmn:ReceiveTask', fill: '#E7F4D1', edge: '#6A9629', icon: '#557A1D' },
  { type: 'bpmn:ManualTask', fill: '#FCE7CF', edge: '#C2741C', icon: '#9A5A12' },
  { type: 'bpmn:BusinessRuleTask', fill: '#DCE3FB', edge: '#4759C0', icon: '#364499' },
  { type: 'bpmn:CallActivity', fill: '#FADCE0', edge: '#AE454E', icon: '#8B363E' },
  { type: 'bpmn:Task', fill: '#E9EDF6', edge: '#46577E', icon: '#34435F' },
]

// 事件按“定义类型”取色，再按起始/中间/结束做明暗区分，保证三者互不同色。
export const EVENT_HUES: Record<string, NodePaint> = {
  none: { fill: '#DCF3E3', edge: '#2F8A57' },
  message: { fill: '#D9E7FA', edge: '#2F72C4' },
  timer: { fill: '#FBEBCC', edge: '#BF8A12' },
  conditional: { fill: '#D6F0F2', edge: '#2A8E9A' },
  signal: { fill: '#E7DEFA', edge: '#7752C0' },
  error: { fill: '#FBDADA', edge: '#C0453D' },
  escalation: { fill: '#FDE0D3', edge: '#C25C33' },
  compensation: { fill: '#EEE0FA', edge: '#8A46B0' },
  link: { fill: '#DDE8F3', edge: '#3F6E93' },
  cancel: { fill: '#F4DCE3', edge: '#A63A55' },
  terminate: { fill: '#F6D4D4', edge: '#A9332A' },
  multiple: { fill: '#E1E4FA', edge: '#5A5FBF' },
  parallel: { fill: '#DBEDF1', edge: '#2B7E91' },
  variable: { fill: '#E3F2D8', edge: '#4C851F' },
}

export const GATEWAY_PAINTS: Record<string, NodePaint> = {
  'bpmn:ExclusiveGateway': { fill: '#FBEDC4', edge: '#B78A14' },
  'bpmn:ParallelGateway': { fill: '#DCE7F8', edge: '#3A6FB0' },
  'bpmn:InclusiveGateway': { fill: '#E6DFF8', edge: '#6B4FBE' },
  'bpmn:EventBasedGateway': { fill: '#D5F0E7', edge: '#2A8A6B' },
  'bpmn:ComplexGateway': { fill: '#FADCE5', edge: '#B33F60' },
}

export const FLOW_COLORS = {
  sequence: '#5B6BC0',
  conditional: '#7A52C7',
  default: '#64748B',
  message: '#2E8FA8',
}

const readHex = (hex: string) => {
  const value = hex.replace('#', '')
  if (value.length !== 6) {
    return null
  }
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16))
}

// 事件的起始/中间/结束三档颜色由比例混合派生。公共渲染器里的同类计算是私有实现，
// 主题包不引用它，避免为了复用颜色工具去改动公共绘制逻辑。
export const blendHex = (from: string, to: string, amount: number) => {
  const start = readHex(from)
  const end = readHex(to)
  if (!start || !end) {
    return from
  }
  const mixed = start.map((part, index) => Math.round(part + (end[index] - part) * amount))
  return `#${mixed.map((part) => part.toString(16).padStart(2, '0')).join('')}`
}
