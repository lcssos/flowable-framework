import type EventBus from 'diagram-js/lib/core/EventBus'
import { getBusinessObject, is, isAny } from 'bpmn-js/lib/util/ModelUtil'
import type { Connection, Element, Shape } from 'bpmn-js/lib/model/Types'
import ThemeRenderer, {
  createTaskSizePatch,
  type FactoryLike,
  type RegistryLike,
  type TextRendererLike,
} from '@/theme/shared/renderer'
import { withPalette, type ThemePalette } from '@/theme/shared/palette'
import { installThemeIcons } from '@/theme/shared/icons'
import {
  COLORFUL,
  COLORFUL_ID,
  EVENT_HUES,
  FLOW_COLORS,
  GATEWAY_PAINTS,
  TASK_PAINTS,
  blendHex,
  isColorfulTheme,
  type NodePaint,
} from './tokens'

type PalettePatch = Partial<ThemePalette>

// 事件调色板按定义类型分色；同一类型下起始/中间/结束再做明暗区分，避免三者同色。
const eventKind = (element: Element) => {
  const definitions = getBusinessObject(element).eventDefinitions as
    | { $type?: string }[]
    | undefined
  const type = definitions?.[0]?.$type || ''
  if (type.includes('Message')) return 'message'
  if (type.includes('Timer')) return 'timer'
  if (type.includes('Conditional')) return 'conditional'
  if (type.includes('Signal')) return 'signal'
  if (type.includes('Error')) return 'error'
  if (type.includes('Escalation')) return 'escalation'
  if (type.includes('Link')) return 'link'
  if (type.includes('Compensate')) return 'compensation'
  if (type.includes('Cancel')) return 'cancel'
  if (type.includes('Terminate')) return 'terminate'
  if (type.includes('VariableListener')) return 'variable'
  if (type.includes('Parallel')) return 'parallel'
  if (type.includes('Multiple')) return 'multiple'
  return 'none'
}

const taskPaint = (element: Element): NodePaint => {
  return TASK_PAINTS.find((item) => is(element, item.type)) ?? TASK_PAINTS[TASK_PAINTS.length - 1]
}

const eventPaint = (element: Element): NodePaint => {
  const hue = EVENT_HUES[eventKind(element)] ?? EVENT_HUES.none
  if (is(element, 'bpmn:StartEvent')) {
    return { fill: blendHex(hue.fill, '#FFFFFF', 0.34), edge: hue.edge }
  }
  if (is(element, 'bpmn:EndEvent')) {
    return { fill: blendHex(hue.fill, hue.edge, 0.28), edge: hue.edge }
  }
  return hue
}

const gatewayPaint = (element: Element): NodePaint => {
  return GATEWAY_PAINTS[element.type || ''] ?? GATEWAY_PAINTS['bpmn:ExclusiveGateway']
}

const shapePaint = (element: Element): NodePaint => {
  if (isAny(element, ['bpmn:Task', 'bpmn:CallActivity'])) {
    return taskPaint(element)
  }
  if (is(element, 'bpmn:Gateway')) {
    return gatewayPaint(element)
  }
  return eventPaint(element)
}

// 公共渲染器对任务/事件/网关分别读取不同的键，这里把同一色值写入全部相关键，
// 使任一分支取色都得到该元素的语义色。
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

  constructor(
    eventBus: EventBus,
    textRenderer: TextRendererLike,
    elementRegistry: RegistryLike,
    graphicsFactory: FactoryLike,
  ) {
    super(eventBus, textRenderer, elementRegistry, graphicsFactory)
    installThemeIcons(COLORFUL_ID)
  }

  drawShape(parent: SVGElement, element: Shape) {
    const patch = { ...COLORFUL, ...toPatch(shapePaint(element)) }
    return withPalette(patch, () => super.drawShape(parent, element))
  }

  drawConnection(parent: SVGElement, element: Connection) {
    return withPalette({ ...COLORFUL, stroke: flowColor(element) }, () =>
      super.drawConnection(parent, element),
    )
  }
}

export const patchColorfulTaskSize = createTaskSizePatch(isColorfulTheme)
