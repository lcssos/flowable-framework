export const INK = {
  stroke: '#1F4B6E',
  text: '#1B2838',
  ink: '#1B2838',
  endStroke: '#C2453D',
  userFill: '#D5E3F0',
  serviceFill: '#D5E8DE',
  taskFill: '#E4E9EF',
  startFill: '#D3EBDD',
  endFill: '#F3D9D4',
  gatewayFill: '#F0E6D2',
  userIcon: '#3C5E7C',
  serviceIcon: '#3D6A56',
}

export const CARD_HEIGHT = 52
export const CARD_RADIUS = 10
export const TASK_WIDTH = 140

export const isInkTheme = () => document.documentElement.dataset.theme === 'ink'

export const cardBox = (height: number) => {
  const next = Math.min(CARD_HEIGHT, height)
  return { y: (height - next) / 2, height: next }
}
