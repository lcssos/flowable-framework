import type EventBus from 'diagram-js/lib/core/EventBus'
import { is } from 'bpmn-js/lib/util/ModelUtil'
import type { Connection, Element, Shape } from 'bpmn-js/lib/model/Types'
import ThemeRenderer, {
  createTaskSizePatch,
  type FactoryLike,
  type RegistryLike,
  type TextRendererLike,
} from '@/theme/shared/renderer'
import { withPalette, type ThemePalette } from '@/theme/shared/palette'
import { installThemeIcons } from '@/theme/shared/icons'
import { COLORFUL, COLORFUL_ID, FLOW_COLORS, isColorfulTheme, type NodePaint } from './tokens'
import { assignFlowPaints, assignPaints, pickFlowPaint, pickNodePaint } from './node-paints'

type PalettePatch = Partial<ThemePalette>

// 公共渲染器对任务/事件/网关分别读取不同的键，这里把同一色值写入全部相关键，
// 使任一分支取色都得到该元素的实例色。
const toPatch = (paint: NodePaint): PalettePatch => ({
  taskFill: paint.fill,
  userFill: paint.fill,
  serviceFill: paint.fill,
  startFill: paint.fill,
  endFill: paint.fill,
  gatewayFill: paint.fill,
  userIcon: paint.icon ?? paint.edge,
  serviceIcon: paint.icon ?? paint.edge,
  ink: paint.edge,
  endStroke: paint.edge,
})

// 顺序流按实例取色（见 flowPaintFor），其余连线（消息流、关联）保持固定语义色。
// 条件流、默认流靠起点的菱形/斜线标记区分，不再依赖颜色。
const fixedFlowColor = (element: Connection) =>
  is(element, 'bpmn:MessageFlow') ? FLOW_COLORS.message : FLOW_COLORS.sequence

export default class ColorfulRenderer extends ThemeRenderer {
  static $inject = ['eventBus', 'textRenderer', 'elementRegistry', 'graphicsFactory']

  protected readonly themeId = COLORFUL_ID

  // 已分配的颜色按 id 缓存：拖动、改属性触发的重绘不会让节点换色。
  private readonly nodePaints = new Map<string, NodePaint>()
  private readonly flowPaints = new Map<string, NodePaint>()
  private readonly elementRegistry: RegistryLike
  private readonly graphicsFactory: FactoryLike

  constructor(
    eventBus: EventBus,
    textRenderer: TextRendererLike,
    elementRegistry: RegistryLike,
    graphicsFactory: FactoryLike,
  ) {
    super(eventBus, textRenderer, elementRegistry, graphicsFactory)
    this.elementRegistry = elementRegistry
    this.graphicsFactory = graphicsFactory
    installThemeIcons(COLORFUL_ID)
    // 导入时形状先画、连线后建，绘制阶段拿不到邻居；导入完成后按完整图重算一次，
    // 只重绘颜色真正变化的节点，保证同一份 XML 每次打开都是同一套颜色。
    eventBus.on('import.done', () => this.reassignPaints())
    // 删除节点后同步清理缓存，避免同 id 的新元素继承旧色。
    eventBus.on('elements.delete', (event: { elements?: Element[] }) => {
      for (const element of event.elements ?? []) {
        this.nodePaints.delete(element.id)
        this.flowPaints.delete(element.id)
      }
    })
  }

  private reassignPaints() {
    const shapes: Element[] = []
    const flows: Connection[] = []
    this.elementRegistry.forEach((element) => {
      const label = (element as Element & { labelTarget?: Element }).labelTarget
      if (!element.parent || label) {
        return
      }
      if (!('waypoints' in element)) {
        shapes.push(element)
      } else if (is(element, 'bpmn:SequenceFlow')) {
        flows.push(element as Connection)
      }
    })
    this.applyPaints(this.nodePaints, assignPaints(shapes), shapes, 'shape')
    this.applyPaints(this.flowPaints, assignFlowPaints(flows), flows, 'connection')
  }

  // 写入新分配的颜色，只重绘颜色真正变化的元素。
  private applyPaints(
    cache: Map<string, NodePaint>,
    assigned: Map<string, NodePaint>,
    elements: Element[],
    type: 'shape' | 'connection',
  ) {
    const byId = new Map(elements.map((element) => [element.id, element]))
    for (const [id, paint] of assigned) {
      const previous = cache.get(id)
      cache.set(id, paint)
      if (previous === paint) {
        continue
      }
      const element = byId.get(id)
      const gfx = element && this.elementRegistry.getGraphics(element)
      if (element && gfx) {
        this.graphicsFactory.update(type, element, gfx)
      }
    }
  }

  private paintFor(element: Element): NodePaint {
    const cached = this.nodePaints.get(element.id)
    if (cached) {
      return cached
    }
    const paint = pickNodePaint(element, this.nodePaints)
    this.nodePaints.set(element.id, paint)
    return paint
  }

  private flowPaintFor(element: Connection): NodePaint {
    const cached = this.flowPaints.get(element.id)
    if (cached) {
      return cached
    }
    const paint = pickFlowPaint(element, this.flowPaints)
    this.flowPaints.set(element.id, paint)
    return paint
  }

  drawShape(parent: SVGElement, element: Shape) {
    const patch = { ...COLORFUL, ...toPatch(this.paintFor(element)) }
    return withPalette(patch, () => super.drawShape(parent, element))
  }

  drawConnection(parent: SVGElement, element: Connection) {
    const stroke = is(element, 'bpmn:SequenceFlow')
      ? this.flowPaintFor(element).edge
      : fixedFlowColor(element)
    return withPalette({ ...COLORFUL, stroke }, () => super.drawConnection(parent, element))
  }
}

export const patchColorfulTaskSize = createTaskSizePatch(isColorfulTheme)
