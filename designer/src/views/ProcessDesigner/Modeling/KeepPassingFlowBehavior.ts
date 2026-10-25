import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor'
import type EventBus from 'diagram-js/lib/core/EventBus'

type MoveContext = {
  targetFlow?: unknown
  position?: { x: number; y: number }
}

// 拖动已有节点时，中心只要再次压到穿过它的顺序流上，DropOnFlowBehavior 就会把这条流拆成两条。
// 插入只保留在从面板放下新节点时；移动结束后先清掉 targetFlow。
export default class KeepPassingFlowBehavior extends CommandInterceptor {
  static $inject = ['eventBus']

  constructor(eventBus: EventBus) {
    super(eventBus)
    this.postExecuted(
      'elements.move',
      2500,
      (context: MoveContext) => {
        delete context.targetFlow
        delete context.position
      },
      true,
    )
  }
}
