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
import { INK, INK_ID, isInkTheme } from './tokens'

export default class InkRenderer extends ThemeRenderer {
  static $inject = ['eventBus', 'textRenderer', 'elementRegistry', 'graphicsFactory']

  protected readonly themeId = INK_ID

  constructor(
    eventBus: EventBus,
    textRenderer: TextRendererLike,
    elementRegistry: RegistryLike,
    graphicsFactory: FactoryLike,
  ) {
    super(eventBus, textRenderer, elementRegistry, graphicsFactory)
    installThemeIcons(INK_ID)
  }

  drawShape(parent: SVGElement, element: Shape) {
    return withPalette(INK, () => super.drawShape(parent, element))
  }

  drawConnection(parent: SVGElement, element: Connection) {
    return withPalette(INK, () => super.drawConnection(parent, element))
  }
}

export const patchInkTaskSize = createTaskSizePatch(isInkTheme)
