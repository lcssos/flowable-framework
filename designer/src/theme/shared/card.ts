// 所有主题共享的节点几何：任务与事件统一按卡片形态绘制。
export const CARD_HEIGHT = 52
export const CARD_RADIUS = 10
export const TASK_WIDTH = 140

export const cardBox = (height: number) => {
  const next = Math.min(CARD_HEIGHT, height)
  return { y: (height - next) / 2, height: next }
}
