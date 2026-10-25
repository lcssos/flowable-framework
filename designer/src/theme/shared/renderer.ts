// 主题公共渲染器：负责卡片化节点、连线和图标的绘制，自身不持有任何主题配色。
// 各主题通过 themeId 决定接管范围，并在绘制期间用 withPalette 注入自己的配色。
import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer'
import type EventBus from 'diagram-js/lib/core/EventBus'
import { createLine, componentsToPath } from 'diagram-js/lib/util/RenderUtil'
import { append as svgAppend, attr as svgAttr, create as svgCreate } from 'tiny-svg'
import { getBusinessObject, getDi, is, isAny } from 'bpmn-js/lib/util/ModelUtil'
import { isLabel } from 'bpmn-js/lib/util/LabelUtil'
import type { Connection, Element, Shape } from 'bpmn-js/lib/model/Types'
import {
  getCirclePath,
  getDiamondPath,
  getFillColor,
  getRoundRectPath,
  getStrokeColor,
} from 'bpmn-js/lib/draw/BpmnRenderUtil'
import { CARD_HEIGHT, CARD_RADIUS, TASK_WIDTH, cardBox } from './card'
import { PALETTE } from './palette'

const TASK_TYPES = ['bpmn:Task', 'bpmn:CallActivity']
const SHAPE_TYPES = [...TASK_TYPES, 'bpmn:Gateway', 'bpmn:Event']
const FLOW_TYPES = ['bpmn:SequenceFlow', 'bpmn:MessageFlow']

export type TextRendererLike = {
  createText: (text: string, options: Record<string, unknown>) => SVGElement
  getDefaultStyle: () => Record<string, string | number>
}
export type RegistryLike = {
  forEach: (fn: (element: Element) => void) => void
  getGraphics: (element: Element) => SVGElement | undefined
}
export type FactoryLike = {
  update: (type: 'shape' | 'connection', element: unknown, gfx: SVGElement) => void
}
export type ElementFactoryLike = {
  getDefaultSize: (semantic: unknown, di?: unknown) => { width: number; height: number }
}

let markerSeq = 0

const definitionType = (element: Element) => {
  const definitions = getBusinessObject(element).eventDefinitions as
    | { $type?: string }[]
    | undefined
  return definitions?.[0]?.$type
}

export const hasConnectorIcon = (element: Element) => {
  if (!isAny(element, ['bpmn:Task', 'bpmn:Event'])) {
    return false
  }
  try {
    return Boolean(getBusinessObject(element).get('flowable:connectorIcon'))
  } catch {
    return false
  }
}

const taskFill = (element: Element) => {
  if (is(element, 'bpmn:UserTask')) {
    return PALETTE.userFill
  }
  if (is(element, 'bpmn:ServiceTask')) {
    return PALETTE.serviceFill
  }
  return PALETTE.taskFill
}

const eventFill = (element: Element) => {
  if (is(element, 'bpmn:EndEvent')) {
    return PALETTE.endFill
  }
  if (is(element, 'bpmn:StartEvent')) {
    return PALETTE.startFill
  }
  return PALETTE.taskFill
}

const isCard = (element?: unknown) => Boolean(element && isAny(element as Element, TASK_TYPES))

const visualRect = (element: Shape) => {
  if (!isCard(element)) {
    return { x: element.x, y: element.y, width: element.width, height: element.height }
  }
  const box = cardBox(element.height)
  return { x: element.x, y: element.y + box.y, width: element.width, height: box.height }
}

const hitRect = (
  rect: { x: number; y: number; width: number; height: number },
  from: { x: number; y: number },
  to: { x: number; y: number },
) => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  let enter = 0
  let leave = 1
  const edges = [
    [-dx, from.x - rect.x],
    [dx, rect.x + rect.width - from.x],
    [-dy, from.y - rect.y],
    [dy, rect.y + rect.height - from.y],
  ]
  for (const [delta, distance] of edges) {
    if (delta === 0) {
      if (distance < 0) {
        return null
      }
      continue
    }
    const ratio = distance / delta
    if (delta < 0) {
      if (ratio > leave) {
        return null
      }
      if (ratio > enter) {
        enter = ratio
      }
    } else if (ratio < enter) {
      return null
    } else if (ratio < leave) {
      leave = ratio
    }
  }
  return { x: from.x + enter * dx, y: from.y + enter * dy }
}

const dockedWaypoints = (connection: Connection) => {
  const points = connection.waypoints.map((point) => ({ x: point.x, y: point.y }))
  if (points.length < 2) {
    return points
  }
  const source = connection.source
  const target = connection.target
  if (source && isCard(source)) {
    const hit = hitRect(visualRect(source as Shape), points[0], points[1])
    if (hit) {
      points[0] = hit
    }
  }
  if (target && isCard(target)) {
    const last = points.length - 1
    const hit = hitRect(visualRect(target as Shape), points[last], points[last - 1])
    if (hit) {
      points[last] = hit
    }
  }
  return points
}

type Waypoint = { x: number; y: number }

const HOP = 3.5

const segmentCross = (from: Waypoint, to: Waypoint, otherFrom: Waypoint, otherTo: Waypoint) => {
  const rx = to.x - from.x
  const ry = to.y - from.y
  const sx = otherTo.x - otherFrom.x
  const sy = otherTo.y - otherFrom.y
  const denom = rx * sy - ry * sx
  if (Math.abs(denom) < 0.001) {
    return null
  }
  const qpx = otherFrom.x - from.x
  const qpy = otherFrom.y - from.y
  const t = (qpx * sy - qpy * sx) / denom
  const u = (qpx * ry - qpy * rx) / denom
  if (t <= 0.06 || t >= 0.94 || u <= 0.06 || u >= 0.94) {
    return null
  }
  return { t, at: { x: from.x + t * rx, y: from.y + t * ry } }
}

const hopNormal = (from: Waypoint, to: Waypoint) => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  let nx = -dy / len
  let ny = dx / len
  if (Math.abs(dx) >= Math.abs(dy) ? ny > 0 : nx < 0) {
    nx = -nx
    ny = -ny
  }
  return { nx, ny }
}

const hopPoints = (from: Waypoint, to: Waypoint, at: Waypoint) => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const along = Math.hypot(at.x - from.x, at.y - from.y)
  if (along < HOP + 1 || len - along < HOP + 1) {
    return []
  }
  const ux = dx / len
  const uy = dy / len
  const start = { x: at.x - ux * HOP, y: at.y - uy * HOP }
  const end = { x: at.x + ux * HOP, y: at.y + uy * HOP }
  const { nx, ny } = hopNormal(from, to)
  const arc = [start]
  for (let step = 1; step < 6; step += 1) {
    const ratio = step / 6
    arc.push({
      x: start.x + (end.x - start.x) * ratio + nx * Math.sin(Math.PI * ratio) * HOP,
      y: start.y + (end.y - start.y) * ratio + ny * Math.sin(Math.PI * ratio) * HOP,
    })
  }
  arc.push(end)
  return arc
}

const weaveHops = (points: Waypoint[], hits: { index: number; t: number; at: Waypoint }[]) => {
  const grouped = new Map<number, typeof hits>()
  hits.forEach((hit) => {
    const list = grouped.get(hit.index) || []
    list.push(hit)
    grouped.set(hit.index, list)
  })
  const woven: Waypoint[] = [points[0]]
  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index]
    const to = points[index + 1]
    const length = Math.hypot(to.x - from.x, to.y - from.y) || 1
    let last = 0
    ;(grouped.get(index) || [])
      .sort((left, right) => left.t - right.t)
      .forEach((hit) => {
        if ((hit.t - last) * length < HOP * 2.4) {
          return
        }
        const arc = hopPoints(from, to, hit.at)
        if (!arc.length) {
          return
        }
        woven.push(...arc)
        last = hit.t
      })
    woven.push(to)
  }
  return woven
}

type Span = { enter: number; leave: number }

const lerp = (from: Waypoint, to: Waypoint, t: number): Waypoint => ({
  x: from.x + (to.x - from.x) * t,
  y: from.y + (to.y - from.y) * t,
})

const mergeSpans = (spans: Span[]) => {
  const merged: Span[] = []
  spans
    .map((span) => ({
      enter: span.enter < 0.012 ? 0 : span.enter,
      leave: span.leave > 0.988 ? 1 : span.leave,
    }))
    .filter((span) => span.leave - span.enter > 0.02)
    .sort((left, right) => left.enter - right.enter)
    .forEach((span) => {
      const last = merged[merged.length - 1]
      if (last && span.enter <= last.leave + 0.01) {
        last.leave = Math.max(last.leave, span.leave)
        return
      }
      merged.push({ ...span })
    })
  return merged
}

const rectSpan = (
  rect: { x: number; y: number; width: number; height: number },
  from: Waypoint,
  to: Waypoint,
): Span | null => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  let enter = 0
  let leave = 1
  const edges = [
    [-dx, from.x - rect.x],
    [dx, rect.x + rect.width - from.x],
    [-dy, from.y - rect.y],
    [dy, rect.y + rect.height - from.y],
  ]
  for (const [delta, distance] of edges) {
    if (Math.abs(delta) < 1e-6) {
      if (distance < -0.5) {
        return null
      }
      continue
    }
    const ratio = distance / delta
    if (delta < 0) {
      if (ratio > leave) {
        return null
      }
      if (ratio > enter) {
        enter = ratio
      }
    } else if (ratio < enter) {
      return null
    } else if (ratio < leave) {
      leave = ratio
    }
  }
  return leave - enter > 0.02 ? { enter, leave } : null
}

const edgeCross = (from: Waypoint, to: Waypoint, otherFrom: Waypoint, otherTo: Waypoint) => {
  const rx = to.x - from.x
  const ry = to.y - from.y
  const sx = otherTo.x - otherFrom.x
  const sy = otherTo.y - otherFrom.y
  const denom = rx * sy - ry * sx
  if (Math.abs(denom) < 0.001) {
    return null
  }
  const qpx = otherFrom.x - from.x
  const qpy = otherFrom.y - from.y
  const t = (qpx * sy - qpy * sx) / denom
  const u = (qpx * ry - qpy * rx) / denom
  if (t <= 0.001 || t >= 0.999 || u < -0.001 || u > 1.001) {
    return null
  }
  return t
}

const convexSpan = (
  from: Waypoint,
  to: Waypoint,
  contains: (point: Waypoint) => boolean,
  edges: [Waypoint, Waypoint][],
): Span | null => {
  const marks = edges
    .map(([start, end]) => edgeCross(from, to, start, end))
    .filter((t): t is number => t !== null)
  if (contains(from)) {
    marks.push(0)
  }
  if (contains(to)) {
    marks.push(1)
  }
  if (marks.length < 2) {
    return null
  }
  marks.sort((left, right) => left - right)
  const enter = marks[0]
  const leave = marks[marks.length - 1]
  return leave - enter > 0.02 ? { enter, leave } : null
}

const circleSpan = (from: Waypoint, to: Waypoint, center: Waypoint, radius: number) => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const contains = (point: Waypoint) => {
    const ox = point.x - center.x
    const oy = point.y - center.y
    return ox * ox + oy * oy <= radius * radius + 0.25
  }
  const length = dx * dx + dy * dy
  if (length < 1e-6) {
    return contains(from) ? { enter: 0, leave: 1 } : null
  }
  const fx = from.x - center.x
  const fy = from.y - center.y
  const b = 2 * (fx * dx + fy * dy)
  const disc = b * b - 4 * length
  const marks: number[] = []
  if (contains(from)) {
    marks.push(0)
  }
  if (contains(to)) {
    marks.push(1)
  }
  if (disc >= 0) {
    const root = Math.sqrt(disc)
    ;[(-b - root) / (2 * length), (-b + root) / (2 * length)].forEach((t) => {
      if (t > 0.001 && t < 0.999) {
        marks.push(t)
      }
    })
  }
  if (marks.length < 2) {
    return null
  }
  marks.sort((left, right) => left - right)
  return { enter: marks[0], leave: marks[marks.length - 1] }
}

const shapeInteriorSpan = (shape: Shape, from: Waypoint, to: Waypoint) => {
  if (isAny(shape, TASK_TYPES)) {
    return rectSpan(visualRect(shape), from, to)
  }
  if (is(shape, 'bpmn:Event')) {
    return circleSpan(
      from,
      to,
      { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 },
      Math.min(shape.width, shape.height) / 2,
    )
  }
  if (!is(shape, 'bpmn:Gateway')) {
    return null
  }
  const cx = shape.x + shape.width / 2
  const cy = shape.y + shape.height / 2
  const corners = [
    { x: cx, y: shape.y },
    { x: shape.x + shape.width, y: cy },
    { x: cx, y: shape.y + shape.height },
    { x: shape.x, y: cy },
  ]
  const halfWidth = shape.width / 2 || 1
  const halfHeight = shape.height / 2 || 1
  return convexSpan(
    from,
    to,
    (point) =>
      Math.abs(point.x - cx) / halfWidth + Math.abs(point.y - cy) / halfHeight <= 1.02,
    [
      [corners[0], corners[1]],
      [corners[1], corners[2]],
      [corners[2], corners[3]],
      [corners[3], corners[0]],
    ],
  )
}

type StrokeRun = { points: Waypoint[]; dotted: boolean }

const append = (parent: SVGElement, name: string, attrs: Record<string, string | number>) => {
  const node = svgCreate(name, attrs)
  svgAppend(parent, node)
  return node
}

const mixHex = (from: string, to: string, amount: number) => {
  const read = (hex: string) => {
    const value = hex.replace('#', '')
    if (value.length !== 6) {
      return null
    }
    return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16))
  }
  const start = read(from)
  const end = read(to)
  if (!start || !end) {
    return from
  }
  const mixed = start.map((part, index) => Math.round(part + (end[index] - part) * amount))
  return `#${mixed.map((part) => part.toString(16).padStart(2, '0')).join('')}`
}

const shapeDefs = (parent: SVGElement) => {
  let defs = parent.querySelector(':scope > defs') as SVGElement | null
  if (!defs) {
    defs = svgCreate('defs')
    svgAppend(parent, defs)
  }
  return defs
}

const materialPaint = (parent: SVGElement, id: string, base: string) => {
  if (!base.startsWith('#')) {
    return base
  }
  const gradient = svgCreate('linearGradient', { id, x1: '0', y1: '0', x2: '0', y2: '1' })
  ;[
    ['0%', mixHex(base, '#FFFFFF', 0.7)],
    ['46%', mixHex(base, '#FFFFFF', 0.22)],
    ['100%', mixHex(base, PALETTE.ink, 0.12)],
  ].forEach(([offset, color]) => {
    svgAppend(gradient, svgCreate('stop', { offset, 'stop-color': color }))
  })
  svgAppend(shapeDefs(parent), gradient)
  return `url(#${id})`
}

const softEdge = (base: string) => (base.startsWith('#') ? mixHex(base, PALETTE.ink, 0.34) : base)

const drawPerson = (parent: SVGElement, x: number, y: number, color: string) => {
  const glyph = svgCreate('g')
  svgAttr(glyph, { transform: `translate(${x} ${y})` })
  svgAppend(parent, glyph)
  append(glyph, 'circle', { cx: 0, cy: -4.2, r: 2.7, fill: color, stroke: 'none' })
  append(glyph, 'path', {
    d: 'M-6.2 7.4c.6-3.4 2.8-5.1 6.2-5.1s5.6 1.7 6.2 5.1c.1.6-.3.9-.9.9h-10.6c-.6 0-1-.3-.9-.9z',
    fill: color,
    stroke: 'none',
  })
}

const drawGear = (parent: SVGElement, x: number, y: number, color: string) => {
  const glyph = svgCreate('g')
  svgAttr(glyph, { transform: `translate(${x} ${y})` })
  svgAppend(parent, glyph)
  append(glyph, 'circle', {
    cx: 0,
    cy: 0,
    r: 2.4,
    fill: 'none',
    stroke: color,
    'stroke-width': 1.35,
  })
  append(glyph, 'path', {
    d: 'M0-6v2M0 4v2M-6 0h2M4 0h2M-4.2-4.2l1.4 1.4M2.8 2.8l1.4 1.4M4.2-4.2l-1.4 1.4M-2.8 2.8l-1.4 1.4',
    fill: 'none',
    stroke: color,
    'stroke-width': 1.35,
    'stroke-linecap': 'round',
  })
}

const symbolPath = (kind: string) => {
  const paths: Record<string, string> = {
    message: 'M-4.2-1.6h8.4v4.6h-8.4zM-4.2-1.4 0 1.4 4.2-1.4',
    timer: 'M0-3.4a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8zM0-1.6V.4L1.4 1.4',
    signal: 'M0-3.4 3.2 3.2H-3.2z',
    error: 'M-2.8 3.2 2.8-3.2M2.2 3.2-3.4-3.2',
    escalation: 'M0-3.6 2.6 3.2H.8L0 1H-2.2',
    condition: 'M-3-2.6h6v5.2h-6zM-2.4-.6h4.8M-2.4 1.2h4.8',
    link: 'M-2.6 1.2-.8 3a1.8 1.8 0 0 0 2.6 0M2.6-1.2.8-3a1.8 1.8 0 0 0-2.6 0M-1.4 1.4 1.4-1.4',
    compensate: 'M2.4-2.8-2 0l4.4 2.8zM-1.6-2.8-6 0l4.4 2.8z',
    cancel: 'M-3-3 3 3M3-3-3 3',
    multiple: 'M0-3.6 3.4-1.2 2.2 3.2H-2.2L-3.4-1.2z',
    parallel: 'M0-3.4v6.8M-3.4 0h6.8',
  }
  return paths[kind]
}

const eventKind = (element: Element) => {
  const type = definitionType(element) || ''
  if (type.includes('Message')) return 'message'
  if (type.includes('Timer')) return 'timer'
  if (type.includes('Conditional')) return 'condition'
  if (type.includes('Signal')) return 'signal'
  if (type.includes('Error')) return 'error'
  if (type.includes('Escalation')) return 'escalation'
  if (type.includes('Link')) return 'link'
  if (type.includes('Compensate')) return 'compensate'
  if (type.includes('Cancel')) return 'cancel'
  if (type.includes('Terminate')) return 'terminate'
  if (type.includes('VariableListener')) return 'parallel'
  if (type.includes('Parallel')) return 'parallel'
  if (type.includes('Multiple')) return 'multiple'
  return ''
}

const drawSymbol = (parent: SVGElement, kind: string, cx: number, cy: number, color: string) => {
  if (kind === 'terminate') {
    append(parent, 'circle', { cx, cy, r: 4.2, fill: color, stroke: 'none' })
    return
  }
  const d = symbolPath(kind)
  if (!d) {
    return
  }
  append(parent, 'path', {
    d,
    transform: `translate(${cx} ${cy})`,
    fill: 'none',
    stroke: color,
    'stroke-width': 1.4,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  })
}

const addMarker = (parent: SVGElement, element: SVGElement, refX: number, refY: number) => {
  const id = `theme-marker-${markerSeq++}`
  const marker = svgCreate('marker', {
    id,
    viewBox: '0 0 20 20',
    refX,
    refY,
    markerWidth: 12,
    markerHeight: 12,
    orient: 'auto',
  })
  svgAppend(marker, element)
  let defs = parent.querySelector(':scope > defs') as SVGElement | null
  if (!defs) {
    defs = svgCreate('defs')
    svgAppend(parent, defs)
  }
  svgAppend(defs, marker)
  return `url(#${id})`
}

const arrowMarker = (parent: SVGElement, color: string) => {
  const arrow = svgCreate('path', {
    d: 'M 1 4.2 L 16.5 10 L 1 15.8 L 5.2 10 Z',
    fill: color,
    stroke: color,
    'stroke-linejoin': 'round',
    'stroke-width': 0.6,
  })
  return addMarker(parent, arrow, 15.5, 10)
}

const dotMarker = (parent: SVGElement, color: string) => {
  const dot = svgCreate('circle', {
    cx: 10,
    cy: 10,
    r: 3.2,
    fill: '#FFFFFF',
    stroke: color,
    'stroke-width': 1.4,
  })
  return addMarker(parent, dot, 10, 10)
}

const diamondMarker = (parent: SVGElement, color: string) => {
  const diamond = svgCreate('path', {
    d: 'M 2 10 L 10 5 L 18 10 L 10 15 Z',
    fill: '#FFFFFF',
    stroke: color,
    'stroke-width': 1.4,
  })
  return addMarker(parent, diamond, -1, 10)
}

const slashMarker = (parent: SVGElement, color: string) => {
  const slash = svgCreate('path', {
    d: 'M 7 4 L 12 16',
    fill: 'none',
    stroke: color,
    'stroke-width': 1.6,
    'stroke-linecap': 'round',
    'stroke-dasharray': '10000 1',
  })
  return addMarker(parent, slash, 0, 10)
}

export default abstract class ThemeRenderer extends BaseRenderer {
  static $inject = ['eventBus', 'textRenderer', 'elementRegistry', 'graphicsFactory']

  // 由各主题声明自己的 id，决定该渲染器在哪个主题下接管绘制。
  protected abstract readonly themeId: string

  private readonly textRenderer: TextRendererLike
  private readonly registry: RegistryLike
  private readonly graphics: FactoryLike
  private readonly crossingRefresh = new Set<string>()

  constructor(
    eventBus: EventBus,
    textRenderer: TextRendererLike,
    elementRegistry: RegistryLike,
    graphicsFactory: FactoryLike,
  ) {
    super(eventBus, 1700)
    this.textRenderer = textRenderer
    this.registry = elementRegistry
    this.graphics = graphicsFactory
    // 穿过节点的圆点取决于节点位置。节点移动不会改顺序流的航点，需要主动重画。
    eventBus.on('element.changed', (event: { element?: Element }) => {
      const moved = event.element
      if (!moved?.parent || isLabel(moved) || 'waypoints' in moved || !isAny(moved, SHAPE_TYPES)) {
        return
      }
      elementRegistry.forEach((item) => {
        if (!item.parent || !('waypoints' in item) || !is(item, 'bpmn:SequenceFlow')) {
          return
        }
        if (item.source === moved || item.target === moved) {
          return
        }
        this.queueCrossingRefresh(item)
      })
    })
    window.addEventListener('designer-theme', () => {
      const shapes: Element[] = []
      const flows: Element[] = []
      elementRegistry.forEach((element) => {
        if (!element.parent) {
          return
        }
        if ('waypoints' in element) {
          flows.push(element)
        } else {
          shapes.push(element)
        }
      })
      const redraw = (element: Element, type: 'shape' | 'connection') => {
        const gfx = elementRegistry.getGraphics(element)
        if (gfx) {
          graphicsFactory.update(type, element, gfx)
        }
      }
      shapes.forEach((element) => redraw(element, 'shape'))
      flows.forEach((element) => redraw(element, 'connection'))
    })
  }

  canRender(element: Element) {
    if (document.documentElement.dataset.theme !== this.themeId) {
      return false
    }
    if (isLabel(element) || hasConnectorIcon(element)) {
      return false
    }
    return isAny(element, [...SHAPE_TYPES, ...FLOW_TYPES])
  }

  drawShape(parent: SVGElement, element: Shape) {
    if (isAny(element, TASK_TYPES)) {
      return this.drawTask(parent, element)
    }
    if (is(element, 'bpmn:Gateway')) {
      return this.drawGateway(parent, element)
    }
    return this.drawEvent(parent, element)
  }

  drawConnection(parent: SVGElement, element: Connection) {
    const points = this.withPassArcs(element, dockedWaypoints(element))
    const color = getStrokeColor(element, PALETTE.stroke)
    const message = is(element, 'bpmn:MessageFlow')
    const runs = message
      ? [{ points, dotted: false }]
      : this.passingRuns(element, points)
    let drawn: SVGElement | undefined
    runs.forEach((run, index) => {
      const attrs: Record<string, string | number> = {
        stroke: color,
        strokeWidth: message ? 1.5 : 1.75,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        fill: 'none',
      }
      if (message) {
        attrs.strokeDasharray = '8 6'
        attrs.markerStart = dotMarker(parent, color)
      } else if (run.dotted) {
        attrs.strokeDasharray = '1 4'
      }
      if (!message && index === 0) {
        const start = this.flowStartMarker(parent, element, color)
        if (start) {
          attrs.markerStart = start
        }
      }
      if (index === runs.length - 1) {
        attrs.markerEnd = arrowMarker(parent, color)
      }
      const line = createLine(run.points, attrs)
      svgAppend(parent, line)
      drawn = line
    })
    return drawn ?? createLine(points, { stroke: color, fill: 'none' })
  }

  getShapePath(element: Shape) {
    if (isAny(element, TASK_TYPES)) {
      const box = cardBox(element.height)
      return getRoundRectPath(
        { x: element.x, y: element.y + box.y, width: element.width, height: box.height },
        Math.min(CARD_RADIUS, box.height / 2),
      )
    }
    if (is(element, 'bpmn:Gateway')) {
      return getDiamondPath(element)
    }
    if (is(element, 'bpmn:Event')) {
      return getCirclePath(element)
    }
    return getRoundRectPath(element, CARD_RADIUS)
  }

  getConnectionPath(connection: Connection) {
    const waypoints = connection.waypoints.map((point) => {
      const source = (point as { original?: { x: number; y: number } }).original || point
      return ['L', source.x, source.y]
    })
    waypoints[0][0] = 'M'
    return componentsToPath(waypoints)
  }

  private withPassArcs(connection: Connection, points: Waypoint[]) {
    if (points.length < 2 || !is(connection, 'bpmn:SequenceFlow')) {
      return points
    }
    const hits: { index: number; t: number; at: Waypoint }[] = []
    this.registry.forEach((item) => {
      if (!item.parent || isLabel(item) || item === (connection as unknown as Element)) {
        return
      }
      if (!('waypoints' in item) || !is(item, 'bpmn:SequenceFlow')) {
        return
      }
      if (String(connection.id) < String(item.id)) {
        this.queueCrossingRefresh(item)
        return
      }
      const other = dockedWaypoints(item as Connection)
      for (let index = 0; index < points.length - 1; index += 1) {
        for (let otherIndex = 0; otherIndex < other.length - 1; otherIndex += 1) {
          const hit = segmentCross(
            points[index],
            points[index + 1],
            other[otherIndex],
            other[otherIndex + 1],
          )
          if (hit) {
            hits.push({ index, t: hit.t, at: hit.at })
          }
        }
      }
    })
    return weaveHops(points, hits)
  }

  private passingRuns(connection: Connection, points: Waypoint[]) {
    const runs: StrokeRun[] = []
    const shapes: Shape[] = []
    this.registry.forEach((item) => {
      if (!item.parent || isLabel(item) || 'waypoints' in item) {
        return
      }
      if (item === connection.source || item === connection.target || !isAny(item, SHAPE_TYPES)) {
        return
      }
      shapes.push(item as Shape)
    })
    const push = (dotted: boolean, from: Waypoint, to: Waypoint) => {
      if (Math.hypot(to.x - from.x, to.y - from.y) < 0.4) {
        return
      }
      const last = runs[runs.length - 1]
      if (last?.dotted === dotted) {
        last.points.push(to)
        return
      }
      runs.push({ dotted, points: [from, to] })
    }
    for (let index = 0; index < points.length - 1; index += 1) {
      const from = points[index]
      const to = points[index + 1]
      const spans = mergeSpans(
        shapes
          .map((shape) => shapeInteriorSpan(shape, from, to))
          .filter((span): span is Span => Boolean(span)),
      )
      const cuts = [0, ...spans.flatMap((span) => [span.enter, span.leave]), 1]
      for (let cut = 0; cut < cuts.length - 1; cut += 1) {
        const start = cuts[cut]
        const end = cuts[cut + 1]
        if (end - start < 0.004) {
          continue
        }
        const dotted = spans.some(
          (span) => start >= span.enter - 0.002 && end <= span.leave + 0.002,
        )
        push(dotted, lerp(from, to, start), lerp(from, to, end))
      }
    }
    return runs.length ? runs : [{ points, dotted: false }]
  }

  private queueCrossingRefresh(flow: Element) {
    if (!flow.id || this.crossingRefresh.has(flow.id)) {
      return
    }
    const gfx = this.registry.getGraphics(flow)
    if (!gfx) {
      return
    }
    this.crossingRefresh.add(flow.id)
    queueMicrotask(() => {
      this.crossingRefresh.delete(flow.id)
      const next = this.registry.getGraphics(flow)
      if (next) {
        this.graphics.update('connection', flow, next)
      }
    })
  }

  private flowStartMarker(parent: SVGElement, element: Connection, color: string) {
    const business = getBusinessObject(element)
    const source = element.source && getBusinessObject(element.source)
    if (source?.default && source.default === business) {
      return slashMarker(parent, color)
    }
    if (business.conditionExpression && source && is(source, 'bpmn:Activity')) {
      return diamondMarker(parent, color)
    }
    return undefined
  }

  private drawTask(parent: SVGElement, element: Shape) {
    const box = cardBox(element.height)
    const base = getFillColor(element, taskFill(element))
    const fill = materialPaint(parent, `theme-task-${element.id}`, base)
    const edge = getStrokeColor(element, softEdge(base))
    const radius = Math.min(CARD_RADIUS, box.height / 2)
    const card = append(parent, 'rect', {
      x: 0.5,
      y: box.y + 0.5,
      width: element.width - 1,
      height: box.height - 1,
      rx: radius,
      ry: radius,
      fill,
      stroke: edge,
      'stroke-width': is(element, 'bpmn:CallActivity') ? 1.25 : 0.75,
    })
    const iconY = box.y + 13
    if (is(element, 'bpmn:UserTask')) {
      drawPerson(parent, 13, iconY, PALETTE.userIcon)
    } else if (is(element, 'bpmn:ServiceTask')) {
      drawGear(parent, 13, iconY, PALETTE.serviceIcon)
    }
    this.drawLabel(parent, element, box)
    return card
  }

  private drawEvent(parent: SVGElement, element: Shape) {
    const end = is(element, 'bpmn:EndEvent')
    const base = getFillColor(element, eventFill(element))
    const fill = materialPaint(parent, `theme-event-${element.id}`, base)
    const edge = getStrokeColor(element, end ? PALETTE.endStroke : softEdge(base))
    const radius = Math.min(element.width, element.height) / 2
    const cx = element.width / 2
    const cy = element.height / 2
    const business = getBusinessObject(element)
    const dashed =
      (is(element, 'bpmn:StartEvent') && business.get('isInterrupting') === false) ||
      (is(element, 'bpmn:BoundaryEvent') && business.get('cancelActivity') === false)
    const circle = append(parent, 'circle', {
      cx,
      cy,
      r: end ? radius - 2.2 : radius - 1,
      fill,
      stroke: edge,
      'stroke-width': end ? 1.5 : 0.9,
      'stroke-dasharray': dashed ? '3 2.2' : 'none',
    })
    if (!end && !is(element, 'bpmn:StartEvent')) {
      append(parent, 'circle', {
        cx,
        cy,
        r: radius - 4.2,
        fill: 'none',
        stroke: edge,
        'stroke-width': 0.9,
        'stroke-dasharray': dashed ? '3 2.2' : 'none',
      })
    }
    drawSymbol(parent, eventKind(element), cx, cy, edge)
    return circle
  }

  private drawGateway(parent: SVGElement, element: Shape) {
    const base = getFillColor(element, PALETTE.gatewayFill)
    const fill = materialPaint(parent, `theme-gateway-${element.id}`, base)
    const edge = getStrokeColor(element, softEdge(base))
    const cx = element.width / 2
    const cy = element.height / 2
    if (is(element, 'bpmn:ExclusiveGateway')) {
      getDi(element).isMarkerVisible = true
    }
    const diamond = append(parent, 'path', {
      d: `M${cx} 0 L${element.width} ${cy} L${cx} ${element.height} L0 ${cy} Z`,
      fill,
      stroke: edge,
      'stroke-width': 0.9,
      'stroke-linejoin': 'round',
    })
    const mark = is(element, 'bpmn:ParallelGateway')
      ? 'parallel'
      : is(element, 'bpmn:InclusiveGateway')
        ? 'inclusive'
        : is(element, 'bpmn:ComplexGateway')
          ? 'complex'
          : is(element, 'bpmn:EventBasedGateway')
            ? 'multiple'
            : 'xor'
    if (mark === 'parallel') {
      append(parent, 'path', {
        d: `M${cx} ${cy - 8}v16M${cx - 8} ${cy}h16`,
        fill: 'none',
        stroke: edge,
        'stroke-width': 1.7,
        'stroke-linecap': 'round',
      })
    } else if (mark === 'inclusive') {
      append(parent, 'circle', {
        cx,
        cy,
        r: element.width * 0.18,
        fill: 'none',
        stroke: edge,
        'stroke-width': 1.5,
      })
    } else if (mark === 'complex') {
      append(parent, 'path', {
        d: `M${cx} ${cy - 8}v16M${cx - 7} ${cy - 4.5}l14 9M${cx + 7} ${cy - 4.5}l-14 9`,
        fill: 'none',
        stroke: edge,
        'stroke-width': 1.5,
        'stroke-linecap': 'round',
      })
    } else if (mark === 'xor') {
      append(parent, 'path', {
        d: `M${cx - 6} ${cy - 6} L${cx + 6} ${cy + 6} M${cx + 6} ${cy - 6} L${cx - 6} ${cy + 6}`,
        fill: 'none',
        stroke: edge,
        'stroke-width': 1.7,
        'stroke-linecap': 'round',
      })
    } else {
      append(parent, 'circle', {
        cx,
        cy,
        r: element.width * 0.16,
        fill: 'none',
        stroke: edge,
        'stroke-width': 1.2,
      })
      drawSymbol(parent, mark, cx, cy, edge)
    }
    return diamond
  }

  private drawLabel(parent: SVGElement, element: Shape, box: { y: number; height: number }) {
    const name = getBusinessObject(element).name as string | undefined
    if (!name) {
      return
    }
    const marked = is(element, 'bpmn:UserTask') || is(element, 'bpmn:ServiceTask')
    const text = this.textRenderer.createText(name, {
      box: {
        width: marked ? Math.max(element.width - 22, 24) : element.width,
        height: box.height,
      },
      align: 'center-middle',
      padding: { top: 4, right: 6, bottom: 4, left: 6 },
      style: {
        ...this.textRenderer.getDefaultStyle(),
        fill: PALETTE.text,
        fontFamily: '"Source Sans 3", "PingFang SC", "Microsoft YaHei", sans-serif',
      },
    })
    svgAttr(text, { transform: `translate(${marked ? 16 : 0} ${box.y})` })
    svgAppend(parent, text)
  }
}

type InjectablePatch = ((elementFactory: ElementFactoryLike) => void) & { $inject?: string[] }

// 各主题的新建节点尺寸补丁形态一致，只有“当前是否该主题”的判断不同。
export function createTaskSizePatch(isActive: () => boolean) {
  const patch: InjectablePatch = (elementFactory) => {
    const getDefaultSize = elementFactory.getDefaultSize.bind(elementFactory)
    elementFactory.getDefaultSize = (semantic, di) => {
      const size = getDefaultSize(semantic, di)
      if (isActive() && is(semantic as Element, 'bpmn:Task')) {
        return { width: TASK_WIDTH, height: CARD_HEIGHT }
      }
      return size
    }
  }
  patch.$inject = ['elementFactory']
  return patch
}
