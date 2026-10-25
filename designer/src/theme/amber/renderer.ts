import type EventBus from 'diagram-js/lib/core/EventBus'
import { getBusinessObject, is, isAny } from 'bpmn-js/lib/util/ModelUtil'
import { isLabel } from 'bpmn-js/lib/util/LabelUtil'
import type { Connection, Element, Shape } from 'bpmn-js/lib/model/Types'
import InkRenderer from '@/views/ProcessDesigner/Renderer/RewriteRenderer/InkRenderer'
import { CARD_HEIGHT, INK, TASK_WIDTH } from '@/views/ProcessDesigner/Renderer/ink/tokens'
import { AMBER, isAmberTheme } from './tokens'
import { installAmberIcons } from './icons'

const RENDER_TYPES = [
  'bpmn:Task',
  'bpmn:CallActivity',
  'bpmn:Gateway',
  'bpmn:Event',
  'bpmn:SequenceFlow',
  'bpmn:MessageFlow',
]

const hasConnectorIcon = (element: Element) => {
  if (!isAny(element, ['bpmn:Task', 'bpmn:Event'])) {
    return false
  }
  try {
    return Boolean(getBusinessObject(element).get('flowable:connectorIcon'))
  } catch {
    return false
  }
}

// 墨蓝渲染器从 ink/tokens 的常量对象取色，这里不改动它，
// 只在绘制期间把调色板换成暖色，绘制结束立即还原，避免影响墨蓝主题。
const withAmberPalette = <T>(draw: () => T): T => {
  const snapshot = { ...INK }
  Object.assign(INK, AMBER)
  try {
    return draw()
  } finally {
    Object.assign(INK, snapshot)
  }
}

type ElementFactoryLike = {
  getDefaultSize: (semantic: unknown, di?: unknown) => { width: number; height: number }
}

export default class AmberRenderer extends InkRenderer {
  static $inject = ['eventBus', 'textRenderer', 'elementRegistry', 'graphicsFactory']

  constructor(
    eventBus: EventBus,
    textRenderer: ConstructorParameters<typeof InkRenderer>[1],
    elementRegistry: ConstructorParameters<typeof InkRenderer>[2],
    graphicsFactory: ConstructorParameters<typeof InkRenderer>[3],
  ) {
    super(eventBus, textRenderer, elementRegistry, graphicsFactory)
    installAmberIcons()
  }

  canRender(element: Element) {
    if (!isAmberTheme() || isLabel(element) || hasConnectorIcon(element)) {
      return false
    }
    return isAny(element, RENDER_TYPES)
  }

  drawShape(parent: SVGElement, element: Shape) {
    return withAmberPalette(() => super.drawShape(parent, element))
  }

  drawConnection(parent: SVGElement, element: Connection) {
    return withAmberPalette(() => super.drawConnection(parent, element))
  }
}

export function patchAmberTaskSize(elementFactory: ElementFactoryLike) {
  const getDefaultSize = elementFactory.getDefaultSize.bind(elementFactory)
  elementFactory.getDefaultSize = (semantic, di) => {
    const size = getDefaultSize(semantic, di)
    if (isAmberTheme() && is(semantic as Element, 'bpmn:Task')) {
      return { width: TASK_WIDTH, height: CARD_HEIGHT }
    }
    return size
  }
}

patchAmberTaskSize.$inject = ['elementFactory']
