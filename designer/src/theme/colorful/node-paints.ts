// 多彩主题不再用颜色表达节点类型：每个节点按 id 稳定取色，
// 与直接相连的邻居撞色时顺延，保证同一张图内相邻节点可区分。
import type { Element } from 'bpmn-js/lib/model/Types'
import type { NodePaint } from './tokens'

// 沿用各主题原有配色，浅底配深描边，保证深色文字与图标在任意底色上可读。
export const NODE_PAINTS: NodePaint[] = [
  { fill: '#D9E9FB', edge: '#2C6FA6', icon: '#1E5C8F' },
  { fill: '#D3F0EA', edge: '#21897A', icon: '#1A6A5E' },
  { fill: '#E8E0FB', edge: '#6A4EBD', icon: '#543BA6' },
  { fill: '#FBDDE9', edge: '#B2477B', icon: '#8F3462' },
  { fill: '#E7F4D1', edge: '#6A9629', icon: '#557A1D' },
  { fill: '#FCE7CF', edge: '#C2741C', icon: '#9A5A12' },
  { fill: '#DCE3FB', edge: '#4759C0', icon: '#364499' },
  { fill: '#FADCE0', edge: '#AE454E', icon: '#8B363E' },
  { fill: '#D6F0F2', edge: '#2A8E9A', icon: '#1F6F79' },
  { fill: '#FBEBCC', edge: '#BF8A12', icon: '#8A6309' },
  { fill: '#E7DEFA', edge: '#7752C0', icon: '#5A3E92' },
  { fill: '#DDE8F3', edge: '#3F6E93', icon: '#2F5570' },
]

// FNV-1a：颜色只取决于节点 id，保存重开或切换主题再切回来都不会变。
export const paintIndex = (id: string) => {
  let hash = 0x811c9dc5
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) % NODE_PAINTS.length
}

// 邻居既包括连线两端，也包括贴附关系：边界事件画在宿主上方，同色会像长在一起。
const neighborPaintsOf = (element: Element, painted: Map<string, NodePaint>) => {
  const paints = new Set<NodePaint>()
  const add = (neighbor?: { id: string }) => {
    const paint = neighbor ? painted.get(neighbor.id) : undefined
    if (paint) {
      paints.add(paint)
    }
  }
  for (const connection of [...(element.incoming ?? []), ...(element.outgoing ?? [])]) {
    add(connection.source?.id === element.id ? connection.target : connection.source)
  }
  const attached = element as Element & {
    host?: { id: string }
    attachers?: { id: string }[]
  }
  add(attached.host)
  for (const attacher of attached.attachers ?? []) {
    add(attacher)
  }
  return paints
}

// 绘制阶段的临时取色：此时连线可能尚未创建，只按已缓存邻居避让。
// 最终颜色由 assignPaints 在导入完成后按完整图重算，因此结果与绘制顺序无关。
export const pickNodePaint = (element: Element, painted: Map<string, NodePaint>): NodePaint => {
  const start = paintIndex(element.id)
  const taken = neighborPaintsOf(element, painted)
  for (let offset = 0; offset < NODE_PAINTS.length; offset += 1) {
    const paint = NODE_PAINTS[(start + offset) % NODE_PAINTS.length]
    if (!taken.has(paint)) {
      return paint
    }
  }
  return NODE_PAINTS[start] ?? NODE_PAINTS[0]
}

// 导入时连线在所有形状之后才创建，逐个绘制拿不到邻居。这里按 id 排序后统一分配：
// 后分配的一端必然避开先分配的一端，因此每条边两端不同色，且结果只由图决定。
export const assignPaints = (shapes: Element[]): Map<string, NodePaint> => {
  const painted = new Map<string, NodePaint>()
  const ordered = [...shapes].sort((left, right) => left.id.localeCompare(right.id))
  for (const shape of ordered) {
    painted.set(shape.id, pickNodePaint(shape, painted))
  }
  return painted
}
