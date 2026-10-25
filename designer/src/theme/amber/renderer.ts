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
import { AMBER, AMBER_ID, isAmberTheme } from './tokens'

export default class AmberRenderer extends ThemeRenderer {
  static $inject = ['eventBus', 'textRenderer', 'elementRegistry', 'graphicsFactory']

  protected readonly themeId = AMBER_ID

  constructor(
    eventBus: EventBus,
    textRenderer: TextRendererLike,
    elementRegistry: RegistryLike,
    graphicsFactory: FactoryLike,
  ) {
    super(eventBus, textRenderer, elementRegistry, graphicsFactory)
    installThemeIcons(AMBER_ID)
  }

  drawShape(parent: SVGElement, element: Shape) {
    return withPalette(AMBER, () => super.drawShape(parent, element))
  }

  drawConnection(parent: SVGElement, element: Connection) {
    return withPalette(AMBER, () => super.drawConnection(parent, element))
  }
}

export const patchAmberTaskSize = createTaskSizePatch(isAmberTheme)
