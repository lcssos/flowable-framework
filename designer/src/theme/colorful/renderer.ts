import type EventBus from 'diagram-js/lib/core/EventBus'
import { getBusinessObject, is } from 'bpmn-js/lib/util/ModelUtil'
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
import { pickNodePaint } from './node-paints'

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

const flowColor = (element: Connection) => {
  if (is(element, 'bpmn:MessageFlow')) {
    return FLOW_COLORS.message
  }
  const business = getBusinessObject(element)
  const source = element.source && getBusinessObject(element.source)
  if (source?.default && source.default === business) {
    return FLOW_COLORS.default
  }
  if (business.conditionExpression) {
    return FLOW_COLORS.conditional
  }
  return FLOW_COLORS.sequence
}

export default class ColorfulRenderer extends ThemeRenderer {
  static $inject = ['eventBus', 'textRenderer', 'elementRegistry', 'graphicsFactory']

  protected readonly themeId = COLORFUL_ID

  // 已分配的颜色按 id 缓存：拖动、改属性触发的重绘不会让节点换色。
  private readonly nodePaints = new Map<string, NodePaint>()

  constructor(
    eventBus: EventBus,
    textRenderer: TextRendererLike,
    elementRegistry: RegistryLike,
    graphicsFactory: FactoryLike,
  ) {
    super(eventBus, textRenderer, elementRegistry, graphicsFactory)
    installThemeIcons(COLORFUL_ID)
    // 重新导入后清空缓存，让连线避让按新图的绘制顺序重新计算。
    eventBus.on('import.done', () => this.nodePaints.clear())
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

  drawShape(parent: SVGElement, element: Shape) {
    const patch = { ...COLORFUL, ...toPatch(this.paintFor(element)) }
    return withPalette(patch, () => super.drawShape(parent, element))
  }

  drawConnection(parent: SVGElement, element: Connection) {
    return withPalette({ ...COLORFUL, stroke: flowColor(element) }, () =>
      super.drawConnection(parent, element),
    )
  }
}

export const patchColorfulTaskSize = createTaskSizePatch(isColorfulTheme)
