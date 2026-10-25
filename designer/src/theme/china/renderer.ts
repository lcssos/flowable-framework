import type EventBus from 'diagram-js/lib/core/EventBus'
import type { Connection, Shape } from 'bpmn-js/lib/model/Types'
import ThemeRenderer, {
  createTaskSizePatch,
  type FactoryLike,
  type RegistryLike,
  type TextRendererLike,
} from '@/theme/shared/renderer'
import { withPalette } from '@/theme/shared/palette'
import { installThemeIcons } from '@/theme/shared/icons'
import { CHINA, CHINA_ID, isChinaTheme } from './tokens'

export default class ChinaRenderer extends ThemeRenderer {
  static $inject = ['eventBus', 'textRenderer', 'elementRegistry', 'graphicsFactory']

  protected readonly themeId = CHINA_ID

  constructor(
    eventBus: EventBus,
    textRenderer: TextRendererLike,
    elementRegistry: RegistryLike,
    graphicsFactory: FactoryLike,
  ) {
    super(eventBus, textRenderer, elementRegistry, graphicsFactory)
    installThemeIcons(CHINA_ID)
  }

  drawShape(parent: SVGElement, element: Shape) {
    return withPalette(CHINA, () => super.drawShape(parent, element))
  }

  drawConnection(parent: SVGElement, element: Connection) {
    return withPalette(CHINA, () => super.drawConnection(parent, element))
  }
}

export const patchChinaTaskSize = createTaskSizePatch(isChinaTheme)
