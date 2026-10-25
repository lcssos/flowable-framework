export const INK = {
  stroke: '#1F4B6E',
  text: '#1B2838',
  endStroke: '#C2453D',
  userFill: '#E4EDF5',
  serviceFill: '#E7F1EC',
  taskFill: '#F4F6F8',
  startFill: '#DCEFE4',
  endFill: '#F6E4E1',
  gatewayFill: '#F6F1E6',
  badge: '#1F4B6E',
  onBadge: '#FFFFFF',
}

export const CARD_HEIGHT = 52
export const CARD_RADIUS = 10
export const TASK_WIDTH = 140

export const isInkTheme = () => document.documentElement.dataset.theme === 'ink'

export const cardBox = (height: number) => {
  const next = Math.min(CARD_HEIGHT, height)
  return { y: (height - next) / 2, height: next }
}
